import Image from 'next/image';
import { getOverviewStats, getDailyRevenue, getTopSellingVoices, getRecentPurchases } from '@/lib/analytics';
import RevenueChart from '@/components/admin/RevenueChart';

function money(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function AdminOverviewPage() {
  const [stats, revenue, topVoices, recent] = await Promise.all([
    getOverviewStats(),
    getDailyRevenue(30),
    getTopSellingVoices(5),
    getRecentPurchases(10),
  ]);

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>Overview</h1>
          <p>Sales performance across the whole catalog.</p>
        </div>
      </div>

      <div className="admin-cards">
        <div className="admin-card">
          <div className="admin-card-label">Total revenue</div>
          <div className="admin-card-value">{money(stats.totalRevenueCents)}</div>
          <div className="admin-card-sub">{stats.paidOrderCount} paid orders</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-label">All orders</div>
          <div className="admin-card-value">{stats.totalOrderCount}</div>
          <div className="admin-card-sub">including pending / failed</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-label">Customers</div>
          <div className="admin-card-value">{stats.customerCount}</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-label">Active entitlements</div>
          <div className="admin-card-value">{stats.activeEntitlementCount}</div>
          <div className="admin-card-sub">voices currently unlocked</div>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <RevenueChart data={revenue} />
      </div>

      <div className="admin-detail-grid">
        <div className="admin-panel">
          <h2>Top-selling voices</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Voice</th>
                  <th>Sales</th>
                </tr>
              </thead>
              <tbody>
                {topVoices.length === 0 && (
                  <tr className="admin-empty-row">
                    <td colSpan={3}>No sales yet.</td>
                  </tr>
                )}
                {topVoices.map(({ voice, sales }) => (
                  <tr key={voice.id}>
                    <td>
                      <Image src={voice.imageUrl} alt={voice.name} width={32} height={32} className="admin-thumb" />
                    </td>
                    <td>
                      <a href={`/admin/voices/${voice.id}`}>{voice.name}</a>
                    </td>
                    <td>{sales}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-panel">
          <h2>Recent purchases</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Pack</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 && (
                  <tr className="admin-empty-row">
                    <td colSpan={4}>No purchases yet.</td>
                  </tr>
                )}
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <a href={`/admin/users/${o.userId}`}>{o.user.email}</a>
                    </td>
                    <td>{o.pack.name}</td>
                    <td>{money(o.amountCents)}</td>
                    <td>{o.createdAt.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
