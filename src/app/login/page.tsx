import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import SimpleNav from '@/components/SimpleNav';
import LoginForm from '@/components/LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');
  const { next } = await searchParams;

  return (
    <>
      <SimpleNav user={null} />
      <LoginForm next={next && next.startsWith('/') ? next : '/dashboard'} />
    </>
  );
}
