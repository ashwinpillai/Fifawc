import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navClass = (path: string) => (location.pathname === path ? 'nav-link active' : 'nav-link');

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="brand">
            <span className="brand-badge">WC26</span>
            <span className="brand-text">POOL</span>
          </Link>
          <nav className="nav">
            <Link to="/matches" className={navClass('/matches')}>Matches</Link>
            <Link to="/leaderboard" className={navClass('/leaderboard')}>Leaderboard</Link>
            {user ? (
              <button type="button" className="nav-user" onClick={logout}>
                {user.avatar?.startsWith('/') ? (
                  <img src={user.avatar} alt="" className="avatar-sm" />
                ) : (
                  <span className="avatar-emoji">{user.avatar || '⚽'}</span>
                )}
                <span>{user.nickname}</span>
              </button>
            ) : (
              <Link to="/login" className="btn btn-sm btn-primary">Sign in</Link>
            )}
          </nav>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <p>FIFA World Cup 2026 · USA · Canada · Mexico</p>
        <p className="footer-note">Built for friendly pools. Not affiliated with FIFA.</p>
      </footer>
    </div>
  );
}
