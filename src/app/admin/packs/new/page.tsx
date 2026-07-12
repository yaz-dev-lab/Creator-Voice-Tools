import PackForm from '@/components/admin/PackForm';

export default function NewPackPage() {
  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>New pack</h1>
          <p>Create a new sellable pack.</p>
        </div>
      </div>
      <div className="admin-panel">
        <PackForm />
      </div>
    </>
  );
}
