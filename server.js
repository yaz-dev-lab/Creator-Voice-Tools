'use strict';
require('dotenv').config();

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const Database = require('better-sqlite3');
const path    = require('path');
const fs      = require('fs');

// ── Stripe (optional until configured) ──────────────────────────────────────
let stripe;
try {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not set');
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
} catch (e) {
  console.warn('[stripe] Disabled:', e.message);
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const BASE_URL   = process.env.BASE_URL   || 'http://localhost:3000';
const PORT       = process.env.PORT       || 3000;

// ── Database ─────────────────────────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'db.sqlite'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    email        TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id           INTEGER NOT NULL REFERENCES users(id),
    stripe_session_id TEXT UNIQUE,
    pack_id           TEXT NOT NULL,
    pack_name         TEXT NOT NULL,
    voices            TEXT NOT NULL,  -- JSON array of voice names
    amount_cents      INTEGER,
    purchased_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();

// Stripe webhook MUST receive raw body — register before json middleware
app.post('/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token expired' });
  }
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email address.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const hash = await bcrypt.hash(password, 12);
  try {
    const row = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING id').get(email.toLowerCase(), hash);
    const token = jwt.sign({ id: row.id, email: email.toLowerCase() }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, email: email.toLowerCase() });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'An account with that email already exists.' });
    console.error(e);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, email: user.email });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ id: req.user.id, email: req.user.email });
});

// ── POST /api/checkout ────────────────────────────────────────────────────────
app.post('/api/checkout', requireAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Checkout not configured yet. Contact support on Discord.' });

  const { packId, packName, voices } = req.body ?? {};
  if (!packId || !packName) return res.status(400).json({ error: 'Missing pack information.' });

  const priceCents = { starter: 2500, creator: 4000, full: 8000, custom: 8250 };
  const amount = priceCents[packId] ?? 2500;

  try {
    const voiceDesc = Array.isArray(voices) && voices.length
      ? 'Included voices: ' + voices.join(', ')
      : 'Custom voice model';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: packName, description: voiceDesc },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${BASE_URL}/dashboard.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${BASE_URL}/index.html#pricing`,
      customer_email: req.user.email,
      client_reference_id: String(req.user.id),
      metadata: {
        user_id:   String(req.user.id),
        pack_id:   packId,
        pack_name: packName,
        voices:    JSON.stringify(voices ?? []),
      },
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error('[stripe checkout]', e.message);
    res.status(500).json({ error: 'Could not create checkout session. Try again.' });
  }
});

// ── POST /api/webhooks/stripe ─────────────────────────────────────────────────
function handleStripeWebhook(req, res) {
  if (!stripe) return res.status(503).send('Stripe not configured');

  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) { console.warn('[webhook] STRIPE_WEBHOOK_SECRET not set — skipping verification'); }

  let event;
  try {
    event = secret
      ? stripe.webhooks.constructEvent(req.body, sig, secret)
      : JSON.parse(req.body);
  } catch (e) {
    console.error('[webhook] signature error:', e.message);
    return res.status(400).send(`Webhook error: ${e.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const s      = event.data.object;
    const userId = parseInt(s.metadata?.user_id, 10);
    if (!userId) return res.json({ received: true });

    db.prepare(`
      INSERT OR IGNORE INTO purchases
        (user_id, stripe_session_id, pack_id, pack_name, voices, amount_cents)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      s.id,
      s.metadata.pack_id,
      s.metadata.pack_name,
      s.metadata.voices ?? '[]',
      s.amount_total
    );
    console.log(`[purchase] user ${userId} bought ${s.metadata.pack_name}`);
  }

  res.json({ received: true });
}

// ── GET /api/purchases ────────────────────────────────────────────────────────
app.get('/api/purchases', requireAuth, (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM purchases WHERE user_id = ? ORDER BY purchased_at DESC'
  ).all(req.user.id);

  res.json(rows.map(r => ({
    ...r,
    voices: JSON.parse(r.voices ?? '[]'),
  })));
});

// ── GET /api/download/:voice ──────────────────────────────────────────────────
app.get('/api/download/:voice', requireAuth, (req, res) => {
  const voiceName = decodeURIComponent(req.params.voice);

  // Collect all voices this user owns
  const rows = db.prepare('SELECT voices, pack_id FROM purchases WHERE user_id = ?').all(req.user.id);
  const owned = new Set(rows.flatMap(r => JSON.parse(r.voices ?? '[]')));

  if (!owned.has(voiceName)) {
    return res.status(403).json({ error: 'You have not purchased this voice.' });
  }

  const filePath = path.join(__dirname, 'voices', `${voiceName}.zip`);
  if (!fs.existsSync(filePath)) {
    console.warn('[download] missing file:', filePath);
    return res.status(404).json({ error: 'File not found. Please contact support.' });
  }

  res.download(filePath, `${voiceName}-preset.zip`);
});

// ── Manual grant (admin) ──────────────────────────────────────────────────────
// POST /api/admin/grant  { adminKey, email, packId, packName, voices: [] }
app.post('/api/admin/grant', (req, res) => {
  const { adminKey, email, packId, packName, voices } = req.body ?? {};
  if (adminKey !== process.env.ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });

  const user = db.prepare('SELECT id FROM users WHERE email = ?').get((email ?? '').toLowerCase());
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.prepare(`
    INSERT INTO purchases (user_id, pack_id, pack_name, voices)
    VALUES (?, ?, ?, ?)
  `).run(user.id, packId, packName, JSON.stringify(voices ?? []));

  res.json({ ok: true });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\nCreator Voice Tools server running → http://localhost:${PORT}`);
  console.log('  Stripe:', stripe ? 'configured' : 'NOT configured (set STRIPE_SECRET_KEY)');
  console.log('  DB: db.sqlite\n');
});
