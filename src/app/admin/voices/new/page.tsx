import NewVoiceForm from '@/components/admin/NewVoiceForm';

export default function NewVoicePage() {
  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>New voice</h1>
          <p>Add a new voice preset to the catalog.</p>
        </div>
      </div>
      <div className="admin-panel">
        <NewVoiceForm />
      </div>
    </>
  );
}
