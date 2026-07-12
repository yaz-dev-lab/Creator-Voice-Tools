import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Pill from '@/components/admin/Pill';

export default async function AdminPacksPage() {
  const packs = await prisma.pack.findMany({
    orderBy: { priceCents: 'asc' },
    include: { _count: { select: { orders: true } } },
  });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>Packs</h1>
          <p>Pricing and voice-pick counts customers choose from at checkout.</p>
        </div>
        <Link className="btn btn-purple" href="/admin/packs/new">
          <i className="ti ti-plus" /> New pack
        </Link>
      </div>

      <div className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Voice picks</th>
                <th>Orders</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {packs.length === 0 && (
                <tr className="admin-empty-row">
                  <td colSpan={6}>No packs yet.</td>
                </tr>
              )}
              {packs.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>${(p.priceCents / 100).toFixed(2)}</td>
                  <td>{p.voicePicks}</td>
                  <td>{p._count.orders}</td>
                  <td>{p.active ? <Pill color="green">Active</Pill> : <Pill color="gray">Inactive</Pill>}</td>
                  <td>
                    <Link href={`/admin/packs/${p.id}`}>Edit</Link>
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
