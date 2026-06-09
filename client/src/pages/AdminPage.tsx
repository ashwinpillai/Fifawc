import { FormEvent, useEffect, useState } from 'react';
import { api, getAdminToken, setAdminToken, type AdminMatch } from '../lib/api';

const STAGE_LABELS: Record<string, string> = {
  GROUP: 'Group',
  ROUND_OF_32: 'R32',
  ROUND_OF_16: 'R16',
  QUARTER_FINAL: 'QF',
  SEMI_FINAL: 'SF',
  THIRD_PLACE: '3rd',
  FINAL: 'Final',
};

export default function AdminPage() {
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [loggedIn, setLoggedIn] = useState(!!getAdminToken());
  const [mode, setMode] = useState<'setup' | 'login'>('setup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    api.adminStatus().then((d) => {
      setHasAdmin(d.hasAdmin);
      setMode(d.hasAdmin ? 'login' : 'setup');
    });
  }, []);

  useEffect(() => {
    if (loggedIn) loadMatches();
  }, [loggedIn]);

  const loadMatches = () => {
    api.adminMatches().then((d) => setMatches(d.matches)).catch(() => {
      setAdminToken(null);
      setLoggedIn(false);
    });
  };

  const submitAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data =
        mode === 'setup'
          ? await api.adminSetup(email, password)
          : await api.adminLogin(email, password);
      setAdminToken(data.token);
      setLoggedIn(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auth failed');
    }
  };

  const setWinner = async (id: number, winner: 'home' | 'away' | 'draw' | null) => {
    try {
      await api.setWinner(id, winner);
      loadMatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const logout = () => {
    setAdminToken(null);
    setLoggedIn(false);
    setMatches([]);
  };

  if (hasAdmin === null) return <div className="admin-page"><p>Loading…</p></div>;

  if (!loggedIn) {
    return (
      <div className="admin-page">
        <div className="auth-card admin-card">
          <h1>Admin — WC26 Pool</h1>
          <p className="auth-sub">
            {mode === 'setup'
              ? 'Create the admin account (one-time only). You will use this to declare match winners.'
              : 'Sign in to manage matches and declare winners.'}
          </p>
          <form onSubmit={submitAuth} className="auth-form">
            <label>
              Admin email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </label>
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn btn-primary btn-block">
              {mode === 'setup' ? 'Create admin account' : 'Sign in'}
            </button>
          </form>
          <a href="/" className="back-link">← Back to pool</a>
        </div>
      </div>
    );
  }

  const displayed =
    filter === 'pending'
      ? matches.filter((m) => !m.winner && m.isPastKickoff)
      : matches;

  return (
    <div className="admin-page admin-dashboard">
      <header className="admin-header">
        <div>
          <h1>Admin dashboard</h1>
          <p>Declare match winners to award points. Update TBD teams for knockout rounds.</p>
        </div>
        <div className="admin-header-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={logout}>
            Log out
          </button>
          <a href="/" className="btn btn-sm btn-primary">View pool</a>
        </div>
      </header>

      {error && <p className="error-banner">{error}</p>}

      <div className="admin-filters">
        <button
          type="button"
          className={`filter-chip ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Needs result
        </button>
        <button
          type="button"
          className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All matches
        </button>
      </div>

      <div className="admin-match-list">
        {displayed.map((m) => (
          <div key={m.id} className="admin-match-row">
            <div className="admin-match-info">
              <span className="match-num">#{m.match_number}</span>
              <span>{STAGE_LABELS[m.stage] || m.stage}{m.group_name ? ` · ${m.group_name}` : ''}</span>
              <span className="admin-time">{m.kickoffFormatted}</span>
              <span className="admin-teams">{m.home_team} vs {m.away_team}</span>
              {m.winner && (
                <span className="admin-winner">
                  Winner: {m.winner === 'draw' ? 'DRAW' : m.winner === 'home' ? m.home_team : m.away_team}
                </span>
              )}
            </div>
            <div className="admin-actions">
              <button type="button" className="btn btn-sm" onClick={() => setWinner(m.id, 'home')}>
                {m.home_team}
              </button>
              <button type="button" className="btn btn-sm draw" onClick={() => setWinner(m.id, 'draw')}>
                Draw
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setWinner(m.id, 'away')}>
                {m.away_team}
              </button>
              {m.winner && (
                <button type="button" className="btn btn-sm btn-outline" onClick={() => setWinner(m.id, null)}>
                  Clear
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
