import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Pill from '@/components/admin/Pill';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  const users = await prisma.user.findMany({
    where: query ? { email: { contains: query, mode: 'insensitive' } } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { _count: { select: { orders: true, entitlements: true } } },
  });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>Customers</h1>
          <p>{query ? `Results for "${query}"` : 'Most recent signups.'}</p>
        </div>
      </div>

      <form className="admin-search" action="/admin/users">
        <input type="text" name="q" placeholder="Search by email…" defaultValue={query} />
        <button className="btn btn-ghost" type="submit">
          Search
        </button>
      </form>

      <div className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Verified</th>
                <th>Joined</th>
                <th>Orders</th>
                <th>Voices owned</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr className="admin-empty-row">
                  <td colSpan={7}>No customers found.</td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.role === 'ADMIN' ? <Pill color="purple">Admin</Pill> : <Pill color="gray">Customer</Pill>}</td>
                  <td>{u.emailVerified ? <Pill color="green">Verified</Pill> : <Pill color="yellow">Unverified</Pill>}</td>
                  <td>{u.createdAt.toLocaleDateString()}</td>
                  <td>{u._count.orders}</td>
                  <td>{u._count.entitlements}</td>
                  <td>
                    <Link href={`/admin/users/${u.id}`}>View</Link>
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
