import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import SimpleNav from '@/components/SimpleNav';
import SignupForm from '@/components/SignupForm';

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');

  return (
    <>
      <SimpleNav user={null} />
      <SignupForm />
    </>
  );
}
