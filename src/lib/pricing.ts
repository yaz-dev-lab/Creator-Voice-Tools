export const RETURNING_CUSTOMER_DISCOUNT_RATE = 0.2;

export type PriceLabel = 'base' | 'scheduled' | 'returning';

export type EffectivePrice = { label: PriceLabel; cents: number };

// The scheduled discount only ever applies within its configured window — the
// caller passes "now" so both a server request and a client render tick can
// agree on whether it's currently active.
export function getScheduledDiscountCents(
  pack: { discountPriceCents: number | null; discountStartsAt: Date | null; discountEndsAt: Date | null },
  now: Date,
): number | null {
  if (pack.discountPriceCents == null || !pack.discountStartsAt || !pack.discountEndsAt) return null;
  if (now < pack.discountStartsAt || now >= pack.discountEndsAt) return null;
  return pack.discountPriceCents;
}

// Picks whichever price is lower for the customer rather than stacking
// percentages — a scheduled discount and the returning-customer discount
// never compound.
export function getEffectivePrice(opts: {
  baseCents: number;
  scheduledDiscountCents: number | null;
  isReturningCustomer: boolean;
}): EffectivePrice {
  const candidates: EffectivePrice[] = [{ label: 'base', cents: opts.baseCents }];
  if (opts.scheduledDiscountCents != null) {
    candidates.push({ label: 'scheduled', cents: opts.scheduledDiscountCents });
  }
  if (opts.isReturningCustomer) {
    candidates.push({ label: 'returning', cents: Math.round(opts.baseCents * (1 - RETURNING_CUSTOMER_DISCOUNT_RATE)) });
  }
  return candidates.reduce((best, c) => (c.cents < best.cents ? c : best));
}
