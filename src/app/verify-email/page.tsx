import SimpleNav from '@/components/SimpleNav';
import VerifyEmailAction from '@/components/VerifyEmailAction';
import { getCurrentUser } from '@/lib/auth';

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const user = await getCurrentUser();
  return (
    <>
      <SimpleNav user={user ? { email: user.email } : null} />
      <VerifyEmailAction token={token ?? null} />
    </>
  );
}
