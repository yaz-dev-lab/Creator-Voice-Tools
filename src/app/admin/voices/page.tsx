import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import Pill from '@/components/admin/Pill';

export default async function AdminVoicesPage() {
  const voices = await prisma.voice.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { entitlements: true } } },
  });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>Voices</h1>
          <p>{voices.length} voice presets in the catalog.</p>
        </div>
        <Link className="btn btn-purple" href="/admin/voices/new">
          <i className="ti ti-plus" /> New voice
        </Link>
      </div>

      <div className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Style</th>
                <th>Version</th>
                <th>Owners</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {voices.length === 0 && (
                <tr className="admin-empty-row">
                  <td colSpan={7}>No voices yet.</td>
                </tr>
              )}
              {voices.map((v) => (
                <tr key={v.id}>
                  <td>
                    <Image src={v.imageUrl} alt={v.name} width={32} height={32} className="admin-thumb" />
                  </td>
                  <td>{v.name}</td>
                  <td>{v.style}</td>
                  <td>v{v.version}</td>
                  <td>{v._count.entitlements}</td>
                  <td>{v.active ? <Pill color="green">Active</Pill> : <Pill color="gray">Inactive</Pill>}</td>
                  <td>
                    <Link href={`/admin/voices/${v.id}`}>Edit</Link>
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
