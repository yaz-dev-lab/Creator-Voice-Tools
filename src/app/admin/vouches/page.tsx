import { prisma } from '@/lib/prisma';
import ActionButton from '@/components/admin/ActionButton';
import NewVouchVideoForm from '@/components/admin/NewVouchVideoForm';

const MAX_VOUCH_VIDEOS = 3;

export default async function AdminVouchesPage() {
  const videos = await prisma.vouchVideo.findMany({ orderBy: { createdAt: 'asc' } });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>Vouches</h1>
          <p>{videos.length}/{MAX_VOUCH_VIDEOS} YouTube videos shown under Vouches on the homepage.</p>
        </div>
      </div>

      <div className="admin-panel">
        <h2>Current videos</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>YouTube URL</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {videos.length === 0 && (
                <tr className="admin-empty-row">
                  <td colSpan={3}>No vouch videos yet.</td>
                </tr>
              )}
              {videos.map((v) => (
                <tr key={v.id}>
                  <td>{v.title ?? '—'}</td>
                  <td>{v.youtubeUrl}</td>
                  <td>
                    <ActionButton
                      action={`/api/admin/vouches/${v.id}/delete`}
                      label="Delete"
                      confirmText="Remove this vouch video from the homepage?"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {videos.length < MAX_VOUCH_VIDEOS ? (
        <div className="admin-panel">
          <h2>Add a video</h2>
          <NewVouchVideoForm />
        </div>
      ) : (
        <div className="admin-panel">
          <p>You already have {MAX_VOUCH_VIDEOS} videos — delete one above to add another.</p>
        </div>
      )}
    </>
  );
}
