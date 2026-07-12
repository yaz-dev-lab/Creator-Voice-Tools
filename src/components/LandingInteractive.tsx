'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';
import { getEffectivePrice, getScheduledDiscountCents } from '@/lib/pricing';
import { toYoutubeEmbedUrl } from '@/lib/youtube';

const DISCORD = 'https://discord.gg/A3WyGAKWAS';
const PENDING_KEY = 'cvt_pending_purchase';

export type Voice = {
  id: string;
  slug: string;
  name: string;
  personaName: string;
  style: string;
  color: string;
  tag: string;
  initials: string;
  imageUrl: string;
  previewUrl: string | null;
};

export type Pack = {
  id: string;
  name: string;
  priceCents: number;
  description: string;
  features: string[];
  voicePicks: number;
  discountPriceCents: number | null;
  discountStartsAt: string | null;
  discountEndsAt: string | null;
};

export type VouchVideo = {
  id: string;
  youtubeUrl: string;
  title: string | null;
};

function formatCountdown(msRemaining: number) {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

const CUSTOM_PACK = {
  id: 'custom',
  name: 'Custom Voice Model',
  priceLabel: '$65-$100',
  description: 'A voice model built to your spec. You must have permission or proof of rights to the voice.',
  features: ['Custom-built model', 'Priced by complexity', 'Rights verification required', 'Direct support'],
};

const tagLabels: Record<string, string> = { hot: 'Fan fav', fan: 'Fan pick', new: 'New' };

const NAV_SECTIONS = ['voices', 'pricing', 'how', 'catalog', 'promoters', 'faq'];

const faqs = [
  { q: 'Does it work on Discord?', a: 'Yes. Creator Voice Tools works as a virtual audio input device, so you can select it as your microphone in Discord settings. It works in voice channels, calls, and stream audio.' },
  { q: 'Does it work on OBS?', a: 'Yes. You can route the voice output through OBS using virtual audio cables. A full setup guide is included with your purchase.' },
  { q: 'Does it work in game chat?', a: 'Yes, as long as the game allows you to select your microphone input. Most games including Fortnite, Warzone, and others support custom audio inputs.' },
  { q: 'How fast is delivery?', a: 'Your voices unlock instantly in your dashboard as soon as payment is confirmed — no waiting on a ticket.' },
  { q: 'Do buyers get setup help?', a: 'Yes. Every voice includes a YouTube setup guide link in your dashboard. Creator Pack and Full Pack buyers also get priority Discord support.' },
  { q: 'What is the refund policy?', a: 'All sales are final once files are delivered or downloaded. Because these are digital files, they cannot be returned. If you have a technical issue, support is included in your package.' },
  { q: 'Can it be used for content?', a: 'Yes — that is exactly what it is built for. You can use Creator Voice Tools for stream content, YouTube videos, gaming clips, Discord trolling, reactions, and more. Do not use it to scam, harass, or impersonate others.' },
];

function money(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export default function LandingInteractive({
  voices,
  packs,
  vouchVideos = [],
  user,
  ownedVoiceSlugs = [],
  isReturningCustomer = false,
  initialNow,
}: {
  voices: Voice[];
  packs: Pack[];
  vouchVideos?: VouchVideo[];
  user: { email: string } | null;
  ownedVoiceSlugs?: string[];
  isReturningCustomer?: boolean;
  initialNow: number;
}) {
  const router = useRouter();
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<Set<number>>(new Set());
  const [activeSection, setActiveSection] = useState('');
  // Seeded from the server's render time so the first client hydration pass
  // matches the SSR-ed HTML exactly (Date.now() here would differ from the
  // server's and trigger a hydration mismatch on the countdown text).
  const [now, setNow] = useState(initialNow);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    NAV_SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  function scroll2(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  function togglePreview(voice: Voice) {
    if (playing && playing !== voice.slug) {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (playing === voice.slug) {
      setPlaying(null);
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
      audioRef.current = null;
      return;
    }
    if (!voice.previewUrl) {
      showToast(`No preview available for ${voice.name} yet.`);
      return;
    }
    setPlaying(voice.slug);
    const audio = new Audio(voice.previewUrl);
    audioRef.current = audio;
    audio.play().catch(() => showToast(`Could not play preview for ${voice.name}`));
    audio.onended = () => {
      setPlaying(null);
      audioRef.current = null;
    };
  }

  function toggleChip(packId: string, max: number, slug: string) {
    if (ownedVoiceSlugs.includes(slug)) {
      showToast('You already own this voice.');
      return;
    }
    setSelections((prev) => {
      const current = prev[packId] ?? [];
      if (current.includes(slug)) {
        return { ...prev, [packId]: current.filter((s) => s !== slug) };
      }
      if (current.length >= max) {
        showToast(`You can only pick ${max} voices for this pack.`);
        return prev;
      }
      return { ...prev, [packId]: [...current, slug] };
    });
  }

  async function startCheckout(packId: string, voiceSlugs: string[]) {
    setLoadingPack(packId);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId, voiceSlugs }),
      });

      if (res.status === 401) {
        sessionStorage.setItem(PENDING_KEY, JSON.stringify({ packId, voiceSlugs }));
        showToast('Please log in to complete your purchase.');
        router.push(`/login?next=${encodeURIComponent('/?resume=1#pricing')}`);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Could not start checkout.');
        return;
      }
      window.location.href = data.url;
    } catch {
      showToast('Could not start checkout. Please try again.');
    } finally {
      setLoadingPack(null);
    }
  }

  // Resume a purchase that was interrupted by a login redirect.
  useEffect(() => {
    if (!user) return;
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return;
    sessionStorage.removeItem(PENDING_KEY);
    try {
      const { packId, voiceSlugs } = JSON.parse(raw);
      startCheckout(packId, voiceSlugs);
      // eslint-disable-next-line no-empty
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function handleBuy(pack: Pack) {
    let voiceSlugs: string[] = [];
    if (pack.voicePicks > 0 && pack.voicePicks < voices.length) {
      voiceSlugs = selections[pack.id] ?? [];
      if (voiceSlugs.length < pack.voicePicks) {
        showToast(`Please select ${pack.voicePicks} voice${pack.voicePicks > 1 ? 's' : ''} before continuing.`);
        return;
      }
    }
    startCheckout(pack.id, voiceSlugs);
  }

  function toggleFaq(i: number) {
    setOpenFaq((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const catalogItems = [
    ...packs.map((p) => ({
      name: p.name,
      priceLabel: money(p.priceCents),
      unit: p.voicePicks >= voices.length ? `all ${voices.length}` : `${p.voicePicks} voices`,
      desc: p.description,
      tag: p.id === 'creator' ? 'best' : p.id === 'full' ? 'pop' : '',
    })),
    { name: CUSTOM_PACK.name, priceLabel: CUSTOM_PACK.priceLabel, unit: 'custom', desc: CUSTOM_PACK.description, tag: 'excl' },
  ];

  return (
    <>
      <nav>
        <a className="logo" href="#">
          <Image src="/logo.jpg" alt="" width={24} height={24} style={{ borderRadius: 6 }} />
          Creator Voice Tools
        </a>
        <div className="nav-links">
          <a className={activeSection === 'voices' ? 'active' : ''} onClick={() => scroll2('voices')}>
            Voices
          </a>
          <a className={activeSection === 'pricing' ? 'active' : ''} onClick={() => scroll2('pricing')}>
            Pricing
          </a>
          <a className={activeSection === 'how' ? 'active' : ''} onClick={() => scroll2('how')}>
            How it works
          </a>
          <a className={activeSection === 'catalog' ? 'active' : ''} onClick={() => scroll2('catalog')}>
            All packs
          </a>
          <a className={activeSection === 'promoters' ? 'active' : ''} onClick={() => scroll2('promoters')}>
            Promoters
          </a>
          <a className={activeSection === 'faq' ? 'active' : ''} onClick={() => scroll2('faq')}>
            FAQ
          </a>
        </div>
        <div className="nav-right">
          {user ? (
            <>
              <Link className="btn btn-ghost" href="/dashboard">
                Dashboard
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link className="btn btn-ghost" href="/login">
                Log in
              </Link>
              <Link className="btn btn-purple" href="/signup">
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>

      <div className="hero-section">
        <div className="hero">
          <div className="badge">
            <span className="badge-dot" /> New version — cleaner audio, zero static
          </div>
          <h1>
            Sound like your
            <br />
            favorite <em>creator.</em>
          </h1>
          <p>Real-time voice presets for gamers, streamers, and content creators. Use on Discord, OBS, Twitch, YouTube, and clips.</p>
          <div className="hero-btns">
            <a className="btn btn-purple" href={DISCORD} target="_blank" rel="noreferrer">
              <i className="ti ti-brand-discord" /> Join Discord
            </a>
            <button className="btn btn-ghost" onClick={() => scroll2('voices')}>
              Browse voices
            </button>
          </div>
          <div className="hero-trust">
            <div className="hero-trust-item">
              <i className="ti ti-bolt" />
              <div className="hero-trust-num">Instant</div>
              <div className="hero-trust-label">Delivery</div>
            </div>
            <div className="hero-trust-item">
              <i className="ti ti-shield-check" />
              <div className="hero-trust-num">Secure</div>
              <div className="hero-trust-label">Stripe Checkout</div>
            </div>
            <div className="hero-trust-item">
              <i className="ti ti-brand-discord" />
              <div className="hero-trust-num">24/7</div>
              <div className="hero-trust-label">Discord Support</div>
            </div>
            <div className="hero-trust-item">
              <i className="ti ti-star" />
              <div className="hero-trust-num">{voices.length}</div>
              <div className="hero-trust-label">Voice Presets</div>
            </div>
          </div>
        </div>
      </div>

      <div className="trust-strip">
        <div className="trust-item">
          <i className="ti ti-bolt" /> Voices unlock instantly in your dashboard after payment
        </div>
        <div className="trust-item">
          <i className="ti ti-shield-check" /> Setup support included
        </div>
        <div className="trust-item">
          <i className="ti ti-headset" /> 24/7 Discord support
        </div>
        <div className="trust-item">
          <i className="ti ti-refresh" /> Free updates on Creator &amp; Full Pack
        </div>
        <div className="trust-item">
          <i className="ti ti-lock" /> All sales final — digital product
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-num">500+</div>
          <div className="stat-label">Happy Buyers</div>
        </div>
        <div className="stat">
          <div className="stat-num">{voices.length}</div>
          <div className="stat-label">Voice Presets</div>
        </div>
        <div className="stat">
          <div className="stat-num">4.9★</div>
          <div className="stat-label">Average Rating</div>
        </div>
        <div className="stat">
          <div className="stat-num">24/7</div>
          <div className="stat-label">Discord Support</div>
        </div>
      </div>

      <div className="section" id="voices">
        <span className="section-eye">Voice Presets</span>
        <h2>Creator-style voices, ready to drop in</h2>
        <p className="section-sub">
          All {voices.length} presets included in the Full Pack. Choose any 2 with Starter, any 5 with Creator Pack. Hit play to hear a sample.
        </p>
        <div className="voices-grid">
          {voices.map((v) => (
            <div className="voice-card" key={v.id}>
              <div className="voice-img-slot">
                <Image src={v.imageUrl} alt={v.name} width={56} height={56} style={{ objectFit: 'cover', borderRadius: '50%' }} />
              </div>
              <div className="voice-name">{v.name}</div>
              <div className="voice-style">{v.style}</div>
              {v.personaName && v.personaName !== v.name && (
                <div className="voice-persona">Styled after {v.personaName}</div>
              )}
              <span className={`voice-tag ${v.tag === 'hot' ? 'tag-hot' : v.tag === 'new' ? 'tag-new' : 'tag-fan'}`}>
                {tagLabels[v.tag] ?? v.tag}
              </span>
              <button className={`preview-btn${playing === v.slug ? ' playing' : ''}`} onClick={() => togglePreview(v)}>
                <i className={`ti ti-player-${playing === v.slug ? 'pause' : 'play'}`} />
                {playing === v.slug ? 'Playing...' : 'Preview'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="section" id="pricing">
        <span className="section-eye">Pricing</span>
        <h2>Pick your pack</h2>
        <p className="section-sub">One-time purchase. Voices unlock instantly in your dashboard after payment.</p>
        <div className="safety-notice" style={{ marginBottom: '1.5rem', borderRadius: 8 }}>
          <i className="ti ti-alert-triangle" />
          <span>These presets are for entertainment and content creation only. Do not use them to scam, harass, threaten, impersonate, or mislead people.</span>
        </div>
        <div className="pricing-grid">
          {packs.map((p) => {
            const featured = p.id === 'creator';
            const isFull = p.voicePicks >= voices.length;
            const sel = selections[p.id] ?? [];
            const scheduledDiscountCents = getScheduledDiscountCents(
              {
                discountPriceCents: p.discountPriceCents,
                discountStartsAt: p.discountStartsAt ? new Date(p.discountStartsAt) : null,
                discountEndsAt: p.discountEndsAt ? new Date(p.discountEndsAt) : null,
              },
              new Date(now),
            );
            const effective = getEffectivePrice({
              baseCents: p.priceCents,
              scheduledDiscountCents,
              isReturningCustomer,
            });
            const hasDiscount = effective.label !== 'base';
            const countdownMs = p.discountEndsAt ? new Date(p.discountEndsAt).getTime() - now : 0;
            return (
              <div className={`price-card${featured ? ' featured' : ''}`} key={p.id}>
                {featured && <div className="price-badge">Best value</div>}
                <div className="price-name">{p.name}</div>
                {hasDiscount ? (
                  <div className="price-amt price-amt-discounted">
                    <span className="price-original">{money(p.priceCents)}</span>
                    <span className="price-now">{money(effective.cents)}</span>
                    <span>one-time</span>
                    <div className="discount-label">
                      {effective.label === 'scheduled' ? 'Limited-time discount' : 'Returning customer discount'}
                    </div>
                    {effective.label === 'scheduled' && countdownMs > 0 && (
                      <div className="discount-countdown">Ends in {formatCountdown(countdownMs)}</div>
                    )}
                  </div>
                ) : (
                  <div className="price-amt">
                    {money(p.priceCents)} <span>one-time</span>
                  </div>
                )}
                <div className="price-desc">{p.description}</div>
                <div className="price-features">
                  {p.features.map((f) => (
                    <div className={`price-feat${featured ? ' featured-feat' : ''}`} key={f}>
                      <i className="ti ti-check" />
                      {f}
                    </div>
                  ))}
                </div>

                {isFull ? (
                  <>
                    <div className="voice-picker-label">All {voices.length} voices included</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                      {voices.map((v) => v.name).join(', ')}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="voice-picker-label">Choose {p.voicePicks} voices</div>
                    <div className="progress-label">
                      <span>Selected voices</span>
                      <span className="progress-count">
                        {sel.length}/{p.voicePicks}
                      </span>
                    </div>
                    <div className="progress-bar-wrap">
                      <div className="progress-bar-fill" style={{ width: `${(sel.length / p.voicePicks) * 100}%` }} />
                    </div>
                    <div className="chip-picker">
                      {voices.map((v) => {
                        const owned = ownedVoiceSlugs.includes(v.slug);
                        const selected = sel.includes(v.slug);
                        return (
                          <div
                            key={v.slug}
                            className={`voice-chip${selected ? ' selected' : ''}${
                              !selected && sel.length >= p.voicePicks ? ' disabled-chip' : ''
                            }${owned ? ' owned-chip' : ''}`}
                            title={owned ? 'You already own this voice' : undefined}
                          >
                            <button
                              type="button"
                              className="chip-preview-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePreview(v);
                              }}
                            >
                              <i className={`ti ti-player-${playing === v.slug ? 'pause' : 'play'}`} />
                            </button>
                            <span
                              className="chip-label"
                              onClick={() => (owned ? showToast('You already own this voice.') : toggleChip(p.id, p.voicePicks, v.slug))}
                            >
                              {v.name}
                              {owned && <span className="chip-owned-tag">Owned</span>}
                            </span>
                            {selected && <i className="ti ti-check chip-check" />}
                          </div>
                        );
                      })}
                    </div>
                    <div className="selected-voices">{sel.join(', ')}</div>
                  </>
                )}

                <button
                  className={`price-cta ${featured ? 'cta-purple' : 'cta-discord'}${
                    !isFull && sel.length >= p.voicePicks ? ' ready' : ''
                  }`}
                  onClick={() => handleBuy(p)}
                  disabled={loadingPack === p.id}
                >
                  <i className="ti ti-credit-card" />
                  {loadingPack === p.id ? 'Starting checkout…' : 'Purchase'}
                </button>
              </div>
            );
          })}

          <div className="price-card">
            <div className="price-name">{CUSTOM_PACK.name}</div>
            <div className="price-amt">
              {CUSTOM_PACK.priceLabel} <span>one-time</span>
            </div>
            <div className="price-desc">{CUSTOM_PACK.description}</div>
            <div className="price-features">
              {CUSTOM_PACK.features.map((f) => (
                <div className="price-feat" key={f}>
                  <i className="ti ti-check" />
                  {f}
                </div>
              ))}
            </div>
            <div className="voice-picker-label">Voice details</div>
            <div
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.4)',
                lineHeight: 1.6,
                background: '#0d0d14',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6,
                padding: '10px 12px',
              }}
            >
              Custom voices require permission or proof that you have rights to use the voice. Specify in your Discord ticket.
            </div>
            <a className="price-cta cta-discord" href={DISCORD} target="_blank" rel="noreferrer">
              <i className="ti ti-brand-discord" /> Request on Discord
            </a>
          </div>
        </div>
      </div>

      <div className="section" id="receive">
        <span className="section-eye">What you receive</span>
        <h2>Everything included in your pack</h2>
        <p className="section-sub">Every purchase comes with the files and support you need to get up and running fast.</p>
        <div className="receive-grid">
          <div className="receive-card">
            <div className="receive-icon">
              <i className="ti ti-file-zip" />
            </div>
            <div>
              <div className="receive-title">Voice preset files</div>
              <div className="receive-desc">Your selected voice preset files, unlocked instantly in your dashboard and ready to download.</div>
            </div>
          </div>
          <div className="receive-card">
            <div className="receive-icon">
              <i className="ti ti-brand-youtube" />
            </div>
            <div>
              <div className="receive-title">YouTube setup guide</div>
              <div className="receive-desc">Every voice links to a step-by-step video guide for Discord, OBS, and in-game chat.</div>
            </div>
          </div>
          <div className="receive-card">
            <div className="receive-icon">
              <i className="ti ti-brand-discord" />
            </div>
            <div>
              <div className="receive-title">Discord support</div>
              <div className="receive-desc">Direct support in our Discord server. Creator &amp; Full Pack buyers get priority response.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="how" id="how">
        <span className="section-eye" style={{ display: 'block', marginBottom: 8 }}>
          How it works
        </span>
        <h2>Up and running in minutes</h2>
        <p className="how-sub">Create an account, choose your pack, and your voices unlock instantly after checkout.</p>
        <div className="steps">
          <div className="step">
            <div className="step-num">1</div>
            <h4>Create your account</h4>
            <p>Sign up with your email — takes seconds, no Discord required to browse or buy.</p>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <h4>Choose your pack</h4>
            <p>Pick your voices and complete secure checkout with Stripe.</p>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <h4>Download instantly</h4>
            <p>Your voices unlock in your dashboard the moment payment is confirmed. Setup guide included.</p>
          </div>
        </div>
      </div>

      <div className="section" id="catalog">
        <span className="section-eye">All Packs</span>
        <h2>Complete pack catalog</h2>
        <p className="section-sub">Every pack is a one-time purchase. No subscriptions, no monthly fees.</p>
        <div className="catalog-grid">
          {catalogItems.map((i) => (
            <div className="service-card" key={i.name}>
              <div className="svc-top">
                <div className="svc-name">{i.name}</div>
                {i.tag === 'pop' && <span className="tag-pop">Popular</span>}
                {i.tag === 'best' && <span className="tag-best">Best value</span>}
                {i.tag === 'excl' && <span className="tag-excl">Custom</span>}
              </div>
              <div className="svc-desc">{i.desc}</div>
              <div className="svc-bottom">
                <div className="svc-price">
                  {i.priceLabel} <span>/ {i.unit}</span>
                </div>
                <button className="svc-btn" onClick={() => scroll2('pricing')}>
                  Buy now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="promo-section" id="promoters">
        <div className="promo-inner">
          <div>
            <span className="section-eye" style={{ display: 'block', marginBottom: 8 }}>
              Promoters
            </span>
            <h2>Promote &amp; earn commission</h2>
            <p>
              Are you a streamer, creator, or Discord server owner? Promote Creator Voice Tools and earn on every sale you refer.
              Tracked via Discord tickets — no third-party apps needed.
            </p>
            <a className="btn btn-discord" href={DISCORD} target="_blank" rel="noreferrer">
              <i className="ti ti-brand-discord" /> Apply on Discord
            </a>
          </div>
          <div className="tiers">
            <div className="tier-title">Commission tiers</div>
            <div className="tier">
              <div className="tier-lbl">0–3 sales / month</div>
              <div className="tier-pct">20%</div>
            </div>
            <div className="tier">
              <div className="tier-lbl">4–9 sales / month</div>
              <div className="tier-pct">25%</div>
            </div>
            <div className="tier">
              <div className="tier-lbl">10+ sales / month</div>
              <div className="tier-pct">30%</div>
            </div>
            <div className="tier-note">Paid after customer payment &amp; delivery confirmed. Tracked via unique Discord codes.</div>
          </div>
        </div>
      </div>

      <div className="reviews-section" id="reviews">
        <span className="section-eye">Vouches</span>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 8 }}>What buyers are saying</h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Real reviews from real buyers in our Discord server.</p>
        {vouchVideos.length > 0 && (
          <div className="vouch-videos-grid">
            {vouchVideos.map((video) => {
              const embedUrl = toYoutubeEmbedUrl(video.youtubeUrl);
              if (!embedUrl) return null;
              return (
                <div className="vouch-video-card" key={video.id}>
                  <iframe
                    src={embedUrl}
                    title={video.title ?? 'Vouch video'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  {video.title && <div className="vouch-video-title">{video.title}</div>}
                </div>
              );
            })}
          </div>
        )}
        <div className="reviews-grid">
          <div className="review-card">
            <div className="review-stars">★★★★★</div>
            <div className="review-text">
              &quot;The Peterbot preset is unreal. Used it in a Fortnite clip and people actually thought it was him. Quality is insane for the price.&quot;
            </div>
            <div className="review-author">
              <div className="review-avatar" style={{ background: '#7c5cbf' }}>
                ZK
              </div>
              zkxfn · Creator Pack
            </div>
          </div>
          <div className="review-card">
            <div className="review-stars">★★★★★</div>
            <div className="review-text">
              &quot;Bought the Full Pack. Setup took literally 5 mins, and my voices were ready to download the second I paid. IShowSpeed voice is hilarious on stream.&quot;
            </div>
            <div className="review-author">
              <div className="review-avatar" style={{ background: '#5865f2' }}>
                MV
              </div>
              mv_clips · Full Pack
            </div>
          </div>
          <div className="review-card">
            <div className="review-stars">★★★★★</div>
            <div className="review-text">
              &quot;Clix and SypherPK presets go hard. Using them for reaction content and trolling in pubs. W product, W support.&quot;
            </div>
            <div className="review-author">
              <div className="review-avatar" style={{ background: '#059669' }}>
                TR
              </div>
              trxpfn · Creator Pack
            </div>
          </div>
        </div>
        <a className="view-vouches-btn" href={DISCORD} target="_blank" rel="noreferrer">
          <i className="ti ti-brand-discord" /> View more vouches in Discord
        </a>
      </div>

      <div className="section" id="faq">
        <span className="section-eye">FAQ</span>
        <h2>Frequently asked questions</h2>
        <p className="section-sub">Everything you need to know before buying.</p>
        <div className="faq-list">
          {faqs.map((f, i) => (
            <div className={`faq-item${openFaq.has(i) ? ' open' : ''}`} key={f.q}>
              <button className="faq-q" onClick={() => toggleFaq(i)}>
                {f.q}
                <i className="ti ti-chevron-down" />
              </button>
              <div className="faq-a">{f.a}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="policy-wrap">
        <div className="policy-box">
          <strong>Refund policy:</strong> All sales are final after files are delivered or downloaded. Digital files
          cannot be returned. Setup and technical support is available as part of your package. Please read before
          purchasing.
        </div>
      </div>

      <div className="cta-banner">
        <h2>Ready to change your voice?</h2>
        <p>Join hundreds of creators already using Creator Voice Tools on stream, in clips, and across Discord.</p>
        <div className="cta-btns">
          <button className="btn btn-purple" onClick={() => scroll2('pricing')}>
            <i className="ti ti-credit-card" /> Purchase a pack
          </button>
          <button className="btn btn-ghost" onClick={() => scroll2('voices')}>
            Browse voices
          </button>
        </div>
      </div>

      <footer>
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <Image src="/logo.jpg" alt="" width={24} height={24} style={{ borderRadius: 6 }} />
              Creator Voice Tools
            </div>
            <p>Real-time voice presets for gamers, streamers, and content creators.</p>
          </div>
          <div className="footer-col">
            <h5>Product</h5>
            <a onClick={() => scroll2('voices')}>Voice Presets</a>
            <a onClick={() => scroll2('pricing')}>Pricing</a>
            <a onClick={() => scroll2('how')}>How it works</a>
            <a onClick={() => scroll2('receive')}>What you receive</a>
          </div>
          <div className="footer-col">
            <h5>Account</h5>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/signup">Create account</Link>
            <a href={DISCORD} target="_blank" rel="noreferrer">
              Support
            </a>
            <a onClick={() => scroll2('reviews')}>Vouches</a>
          </div>
          <div className="footer-col">
            <h5>More</h5>
            <a onClick={() => scroll2('promoters')}>Become a promoter</a>
            <a onClick={() => scroll2('faq')}>FAQ</a>
            <a onClick={() => scroll2('promoters')}>Commission rates</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 Creator Voice Tools. All rights reserved.</p>
          <div className="footer-disc">
            Voice presets are creator-style effects and are not intended to exactly replicate or impersonate any real
            individual. Must not be used to scam, harass, impersonate, or mislead others.
          </div>
        </div>
      </footer>

      <div className="sticky-buy">
        <button className="btn btn-discord" onClick={() => scroll2('pricing')}>
          <i className="ti ti-credit-card" /> Purchase a pack
        </button>
      </div>

      <div className={`cart-toast${toast ? ' show' : ''}`}>{toast}</div>
    </>
  );
}
