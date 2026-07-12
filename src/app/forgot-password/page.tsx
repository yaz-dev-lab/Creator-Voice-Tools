import SimpleNav from '@/components/SimpleNav';
import ForgotPasswordForm from '@/components/ForgotPasswordForm';
import { getCurrentUser } from '@/lib/auth';

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();
  return (
    <>
      <SimpleNav user={user ? { email: user.email } : null} />
      <ForgotPasswordForm />
    </>
  );
}
