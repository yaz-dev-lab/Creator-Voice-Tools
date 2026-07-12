import { notFound } from 'next/navigation';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import Pill from '@/components/admin/Pill';
import EditVoiceForm from '@/components/admin/EditVoiceForm';
import PublishUpdateForm from '@/components/admin/PublishUpdateForm';
import ActionButton from '@/components/admin/ActionButton';

export default async function AdminVoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const voice = await prisma.voice.findUnique({
    where: { id },
    include: {
      updates: { orderBy: { releasedAt: 'desc' } },
      _count: { select: { entitlements: true } },
    },
  });
  if (!voice) notFound();

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>{voice.name}</h1>
          <p>
            v{voice.version} · {voice._count.entitlements} owner{voice._count.entitlements === 1 ? '' : 's'} ·{' '}
            {voice.active ? <Pill color="green">Active</Pill> : <Pill color="gray">Inactive</Pill>}
          </p>
        </div>
        <div className="admin-btn-row">
          <Image src={voice.imageUrl} alt={voice.name} width={48} height={48} className="admin-thumb" style={{ width: 48, height: 48 }} />
          <ActionButton
            action={`/api/admin/voices/${voice.id}/toggle-active`}
            label={voice.active ? 'Deactivate' : 'Activate'}
            className={voice.active ? 'btn btn-ghost' : 'btn btn-purple'}
            confirmText={
              voice.active ? 'Deactivate this voice? It will disappear from the storefront immediately.' : undefined
            }
          />
        </div>
      </div>

      <div className="admin-detail-grid">
        <div className="admin-panel">
          <h2>Details</h2>
          <EditVoiceForm
            voice={{
              id: voice.id,
              name: voice.name,
              personaName: voice.personaName,
              style: voice.style,
              color: voice.color,
              tag: voice.tag,
              initials: voice.initials,
              youtubeUrl: voice.youtubeUrl,
              imageUrl: voice.imageUrl,
            }}
          />
        </div>

        <div className="admin-panel">
          <h2>Publish an update</h2>
          <PublishUpdateForm voiceId={voice.id} currentVersion={voice.version} />
        </div>
      </div>

      <div className="admin-panel">
        <h2>Update history</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Notes</th>
                <th>Released</th>
              </tr>
            </thead>
            <tbody>
              {voice.updates.length === 0 && (
                <tr className="admin-empty-row">
                  <td colSpan={3}>No update history yet.</td>
                </tr>
              )}
              {voice.updates.map((u) => (
                <tr key={u.id}>
                  <td>v{u.version}</td>
                  <td>{u.notes}</td>
                  <td>{u.releasedAt.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
