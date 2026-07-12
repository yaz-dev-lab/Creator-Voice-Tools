import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import Pill from '@/components/admin/Pill';
import OrderStatusPill from '@/components/admin/OrderStatusPill';
import ActionButton from '@/components/admin/ActionButton';
import GrantAccessForm from '@/components/admin/GrantAccessForm';
import { stripeCheckoutSessionUrl } from '@/lib/stripe-links';

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [viewer, user, voices] = await Promise.all([
    getCurrentUser(),
    prisma.user.findUnique({
      where: { id },
      include: {
        orders: { orderBy: { createdAt: 'desc' }, include: { pack: true } },
        entitlements: { orderBy: { unlockedAt: 'desc' }, include: { voice: true } },
      },
    }),
    prisma.voice.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
  ]);
  if (!user) notFound();

  const isSelf = viewer?.id === user.id;

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>{user.email}</h1>
          <p>
            {user.role === 'ADMIN' ? <Pill color="purple">Admin</Pill> : <Pill color="gray">Customer</Pill>}{' '}
            {user.emailVerified ? <Pill color="green">Verified</Pill> : <Pill color="yellow">Unverified</Pill>} · Joined{' '}
            {user.createdAt.toLocaleDateString()}
          </p>
        </div>
        <div className="admin-btn-row">
          {!user.emailVerified && (
            <ActionButton action={`/api/admin/users/${user.id}/resend-verification`} label="Resend verification email" />
          )}
          {!isSelf && user.role === 'CUSTOMER' && (
            <ActionButton
              action={`/api/admin/users/${user.id}/role`}
              label="Promote to admin"
              body={{ role: 'ADMIN' }}
              confirmText={`Give ${user.email} full admin access?`}
            />
          )}
          {!isSelf && user.role === 'ADMIN' && (
            <ActionButton
              action={`/api/admin/users/${user.id}/role`}
              label="Demote to customer"
              body={{ role: 'CUSTOMER' }}
              confirmText={`Remove admin access from ${user.email}?`}
            />
          )}
        </div>
      </div>

      <div className="admin-detail-grid">
        <div className="admin-panel">
          <h2>Orders</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Pack</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {user.orders.length === 0 && (
                  <tr className="admin-empty-row">
                    <td colSpan={5}>No orders yet.</td>
                  </tr>
                )}
                {user.orders.map((o) => (
                  <tr key={o.id}>
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
                        {o.status === 'PAID' && (
                          <ActionButton
                            action={`/api/admin/orders/${o.id}/refund`}
                            label="Refund"
                            className="btn btn-danger admin-btn-sm"
                            confirmText={`Refund $${(o.amountCents / 100).toFixed(2)} and revoke access to these voices?`}
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

        <div className="admin-panel">
          <h2>Grant access</h2>
          <GrantAccessForm userId={user.id} voices={voices.map((v) => ({ id: v.id, name: v.name }))} />
        </div>
      </div>

      <div className="admin-panel">
        <h2>Voices owned</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Voice</th>
                <th>Unlocked</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {user.entitlements.length === 0 && (
                <tr className="admin-empty-row">
                  <td colSpan={4}>No voices granted yet.</td>
                </tr>
              )}
              {user.entitlements.map((e) => {
                const isRevoked = Boolean(e.revokedAt);
                return (
                  <tr key={e.id}>
                    <td>{e.voice.name}</td>
                    <td>{e.unlockedAt.toLocaleDateString()}</td>
                    <td>
                      {isRevoked ? <Pill color="red">Revoked</Pill> : <Pill color="green">Active</Pill>}
                      {isRevoked && e.revokedReason && (
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
                          {e.revokedReason}
                        </div>
                      )}
                    </td>
                    <td>
                      {isRevoked ? (
                        <ActionButton
                          action={`/api/admin/entitlements/${e.id}/restore`}
                          label="Restore"
                          className="btn btn-ghost admin-btn-sm"
                        />
                      ) : (
                        <ActionButton
                          action={`/api/admin/entitlements/${e.id}/revoke`}
                          label="Revoke"
                          className="btn btn-danger admin-btn-sm"
                          confirmText={`Revoke ${user.email}'s access to ${e.voice.name}?`}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
