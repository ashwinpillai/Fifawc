import { FormEvent, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function AuthPage() {
  const { user, needsProfile, login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user && !needsProfile) return <Navigate to="/matches" replace />;
  if (needsProfile) return <Navigate to="/profile" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') await register(email, password);
      else await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{mode === 'register' ? 'Create account' : 'Welcome back'}</h1>
        <p className="auth-sub">
          {mode === 'register'
            ? 'Enter your email and choose a password. No verification required.'
            : 'Sign in with the email and password you used before.'}
        </p>

        <form onSubmit={submit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              placeholder="Min 4 characters"
            />
          </label>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'register' ? 'Continue to profile' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'register' ? (
            <>
              Already have an account?{' '}
              <button type="button" className="link-btn" onClick={() => setMode('login')}>
                Sign in
              </button>
            </>
          ) : (
            <>
              New here?{' '}
              <button type="button" className="link-btn" onClick={() => setMode('register')}>
                Create account
              </button>
            </>
          )}
        </p>

        <Link to="/" className="back-link">← Back to home</Link>
      </div>
    </div>
  );
}
