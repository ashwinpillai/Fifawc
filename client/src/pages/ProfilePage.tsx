import { FormEvent, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api, getToken } from '../lib/api';
import { useAuth } from '../lib/auth';

const EMOJI_OPTIONS = ['⚽', '🏆', '🔥', '⭐', '🦁', '🐯', '🦅', '🐺', '🎯', '👑', '🍀', '💪'];

export default function ProfilePage() {
  const { user, needsProfile, setUser, setNeedsProfile, refresh } = useAuth();
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('⚽');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!getToken()) return <Navigate to="/login" replace />;
  if (!needsProfile && user?.nickname) return <Navigate to="/matches" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.updateProfile(nickname, avatar);
      setUser(data.user);
      setNeedsProfile(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const onFile = async (file: File) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.uploadAvatar(file);
      setAvatar(data.avatar);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card profile-card">
        <h1>Set up your player</h1>
        <p className="auth-sub">
          Pick a nickname and avatar. Your login stays saved on this device — you won&apos;t need to
          set this up again.
        </p>

        <form onSubmit={submit} className="auth-form">
          <div className="avatar-preview">
            {avatar.startsWith('/') ? (
              <img src={avatar} alt="Avatar" className="avatar-lg" />
            ) : (
              <span className="avatar-lg emoji">{avatar}</span>
            )}
          </div>

          <label>
            Nickname
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              minLength={2}
              maxLength={24}
              placeholder="Your pool name"
            />
          </label>

          <div className="emoji-grid">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                type="button"
                className={`emoji-btn ${avatar === e ? 'selected' : ''}`}
                onClick={() => setAvatar(e)}
              >
                {e}
              </button>
            ))}
          </div>

          <label className="file-label">
            Or upload a photo
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </label>

          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Saving…' : 'Start bidding'}
          </button>
        </form>
      </div>
    </div>
  );
}
