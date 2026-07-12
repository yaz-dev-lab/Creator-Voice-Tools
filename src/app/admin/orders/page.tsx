import { prisma } from '@/lib/prisma';
import type { OrderStatus } from '@prisma/client';
import OrderStatusPill from '@/components/admin/OrderStatusPill';
import ActionButton from '@/components/admin/ActionButton';
import { stripeCheckoutSessionUrl } from '@/lib/stripe-links';

const STATUSES: OrderStatus[] = ['PENDING', 'PAID', 'REFUNDED', 'FAILED'];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = status && STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : undefined;

  const orders = await prisma.order.findMany({
    where: filter ? { status: filter } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: true, pack: true },
  });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>Orders</h1>
          <p>Most recent 100{filter ? ` · ${filter.toLowerCase()}` : ''}.</p>
        </div>
      </div>

      <div className="admin-btn-row" style={{ marginBottom: '1.25rem' }}>
        <a className={`btn admin-btn-sm ${!filter ? 'btn-purple' : 'btn-ghost'}`} href="/admin/orders">
          All
        </a>
        {STATUSES.map((s) => (
          <a key={s} className={`btn admin-btn-sm ${filter === s ? 'btn-purple' : 'btn-ghost'}`} href={`/admin/orders?status=${s}`}>
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </a>
        ))}
      </div>

      <div className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Pack</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr className="admin-empty-row">
                  <td colSpan={6}>No orders found.</td>
                </tr>
              )}
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <a href={`/admin/users/${o.userId}`}>{o.user.email}</a>
                  </td>
                  <td>{o.pack.name}</td>
                  <td>${(o.amountCents / 100).toFixed(2)}</td>
                  <td>
                    <OrderStatusPill status={o.status} />
                  </td>
                  <td>{o.createdAt.toLocaleDateString()}</td>
                  <td>
                    <div className="admin-btn-row">
                      <a href={stripeCheckoutSessionUrl(o.stripeCheckoutSessionId)} target="_blank" rel="noreferrer">
                        Stripe ↗
                      </a>
                      <ActionButton action={`/api/admin/orders/${o.id}/sync`} label="Sync" className="btn btn-ghost admin-btn-sm" />
                      {o.status === 'PAID' && (
                        <ActionButton
                          action={`/api/admin/orders/${o.id}/refund`}
                          label="Refund"
                          className="btn btn-danger admin-btn-sm"
                          confirmText={`Refund $${(o.amountCents / 100).toFixed(2)} to ${o.user.email} and revoke their access to these voices?`}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
