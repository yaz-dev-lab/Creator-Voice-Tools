const isTestMode = !(process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_live_');

export function stripeCheckoutSessionUrl(sessionId: string) {
  return `https://dashboard.stripe.com/${isTestMode ? 'test/' : ''}checkout/sessions/${sessionId}`;
}

export function stripePaymentIntentUrl(paymentIntentId: string) {
  return `https://dashboard.stripe.com/${isTestMode ? 'test/' : ''}payments/${paymentIntentId}`;
}
