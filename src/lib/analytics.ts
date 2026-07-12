import { prisma } from '@/lib/prisma';

export type DailyRevenue = { date: string; cents: number };

export async function getDailyRevenue(days = 30): Promise<DailyRevenue[]> {
  const rows = await prisma.$queryRaw<{ day: Date; cents: number }[]>`
    SELECT date_trunc('day', "createdAt") as day, SUM("amountCents")::int as cents
    FROM orders
    WHERE status = 'PAID' AND "createdAt" >= now() - (${days} || ' days')::interval
    GROUP BY day
    ORDER BY day ASC
  `;

  const byDay = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), r.cents]));

  // Fill in every day in the window (not just days with a sale) so the
  // chart shows a continuous 30-day series instead of skipping gaps.
  const series: DailyRevenue[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    series.push({ date: key, cents: byDay.get(key) ?? 0 });
  }
  return series;
}

export async function getTopSellingVoices(take = 5) {
  const grouped = await prisma.orderItem.groupBy({
    by: ['voiceId'],
    _count: { voiceId: true },
    where: { order: { status: 'PAID' } },
    orderBy: { _count: { voiceId: 'desc' } },
    take,
  });

  if (grouped.length === 0) return [];

  const voices = await prisma.voice.findMany({ where: { id: { in: grouped.map((g) => g.voiceId) } } });
  const byId = new Map(voices.map((v) => [v.id, v]));

  return grouped
    .map((g) => ({ voice: byId.get(g.voiceId), sales: g._count.voiceId }))
    .filter((g): g is { voice: NonNullable<typeof g.voice>; sales: number } => Boolean(g.voice));
}

export async function getOverviewStats() {
  const [revenueAgg, paidOrderCount, totalOrderCount, customerCount, activeEntitlementCount] = await Promise.all([
    prisma.order.aggregate({ where: { status: 'PAID' }, _sum: { amountCents: true } }),
    prisma.order.count({ where: { status: 'PAID' } }),
    prisma.order.count(),
    prisma.user.count(),
    prisma.entitlement.count({
      where: { revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    }),
  ]);

  return {
    totalRevenueCents: revenueAgg._sum.amountCents ?? 0,
    paidOrderCount,
    totalOrderCount,
    customerCount,
    activeEntitlementCount,
  };
}

export async function getRecentPurchases(take = 10) {
  return prisma.order.findMany({
    where: { status: 'PAID' },
    orderBy: { createdAt: 'desc' },
    take,
    include: { user: true, pack: true },
  });
}
