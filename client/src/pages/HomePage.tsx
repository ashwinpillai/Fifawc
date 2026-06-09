import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function HomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ players: 0, matches: 0, bids: 0 });

  useEffect(() => {
    api.stats().then(setStats).catch(() => {});
  }, []);

  const shareUrl = window.location.origin;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
  };

  return (
    <div className="hero">
      <div className="hero-bg" />
      <div className="hero-content">
        <p className="hero-tag">FIFA World Cup 2026 · USA · Canada · Mexico</p>
        <h1 className="hero-title">THE BIDDING POOL</h1>
        <p className="hero-desc">
          Pick a winner for every match. Bids open only on match day (IST) and picks are final — no
          take-backs. One point per correct call. Highest score lifts the trophy.
        </p>

        <div className="rules-card">
          <h3>How it works</h3>
          <ul>
            <li>Sign up with email & password — no verification needed</li>
            <li>Choose a nickname and avatar — saved on this device</li>
            <li>Bid only on <strong>today&apos;s matches (IST)</strong> before kickoff</li>
            <li>Once you pick a team, your bid is <strong>locked forever</strong></li>
            <li>Admin declares winners after each match — correct picks earn 1 point</li>
          </ul>
        </div>

        <div className="stats-row">
          <div className="stat"><span className="stat-num">{stats.players}</span><span>players</span></div>
          <div className="stat"><span className="stat-num">{stats.matches}</span><span>matches</span></div>
          <div className="stat"><span className="stat-num">{stats.bids}</span><span>bids</span></div>
        </div>

        <div className="hero-actions">
          {user ? (
            <Link to="/matches" className="btn btn-lg btn-primary">Start bidding</Link>
          ) : (
            <Link to="/login" className="btn btn-lg btn-primary">Join the pool</Link>
          )}
          <button type="button" className="btn btn-lg btn-outline" onClick={copyLink}>
            Share pool link
          </button>
        </div>
      </div>
    </div>
  );
}
