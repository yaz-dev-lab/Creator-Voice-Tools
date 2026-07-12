import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';

export default function SimpleNav({ user }: { user: { email: string } | null }) {
  return (
    <nav>
      <Link className="logo" href="/">
        <span className="logo-icon">CV</span>
        Creator Voice Tools
      </Link>
      <div className="nav-right">
        {user ? (
          <>
            <span className="navbar-user">{user.email}</span>
            <Link className="btn btn-ghost" href="/dashboard">
              Dashboard
            </Link>
            <LogoutButton />
          </>
        ) : (
          <>
            <Link className="btn btn-ghost" href="/login">
              Log in
            </Link>
            <Link className="btn btn-purple" href="/signup">
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
