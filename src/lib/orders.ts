import { prisma } from '@/lib/prisma';

// Shared by the Stripe webhook and the admin "sync from Stripe" action —
// both ultimately need to take a paid Checkout Session and make sure the
// matching Order is PAID and its voices are entitled.
export async function grantEntitlementsForOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return;

  await prisma.$transaction(
    order.items.map((item) =>
      prisma.entitlement.upsert({
        where: { userId_voiceId: { userId: order.userId, voiceId: item.voiceId } },
        update: { revokedAt: null, revokedReason: null },
        create: { userId: order.userId, voiceId: item.voiceId, orderId: order.id },
      }),
    ),
  );
}

// Revokes every entitlement this order granted — used on refund. Other
// orders for the same user/voice (if any) are untouched, since revoking is
// scoped to the order relation, not a blanket per-voice wipe.
export async function revokeEntitlementsForOrder(orderId: string, reason: string) {
  await prisma.entitlement.updateMany({
    where: { orderId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
}
