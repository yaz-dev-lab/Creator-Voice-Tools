import SimpleNav from '@/components/SimpleNav';
import ResetPasswordForm from '@/components/ResetPasswordForm';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <>
      <SimpleNav user={null} />
      <ResetPasswordForm token={token ?? null} />
    </>
  );
}
