import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  // Not thrown at import time in a way that breaks the build — routes that
  // need Stripe will fail loudly at request time until a real key is set.
  console.warn('STRIPE_SECRET_KEY is not set — Stripe routes will fail until it is.');
}

export const stripe = new Stripe(key ?? 'sk_test_placeholder', {
  apiVersion: '2025-02-24.acacia',
});
