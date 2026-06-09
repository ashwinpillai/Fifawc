import { useEffect, useState } from 'react';
import { api, type LeaderEntry } from '../lib/api';

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.leaderboard()
      .then((data) => setEntries(data.leaderboard))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="leaderboard-page">
      <div className="page-header">
        <h1>Leaderboard</h1>
        <p className="page-sub">One point per correct prediction. Highest score wins the pool.</p>
      </div>

      {loading ? (
        <p className="loading-text">Loading rankings…</p>
      ) : entries.length === 0 ? (
        <p className="empty-text">No players yet. Be the first to join!</p>
      ) : (
        <div className="leaderboard-table-wrap">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Points</th>
                <th>Correct</th>
                <th>Bids</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.id} className={i === 0 ? 'first-place' : i < 3 ? 'podium' : ''}>
                  <td className="rank">{i + 1}</td>
                  <td className="player-cell">
                    {e.avatar?.startsWith('/') ? (
                      <img src={e.avatar} alt="" className="avatar-sm" />
                    ) : (
                      <span className="avatar-emoji">{e.avatar || '⚽'}</span>
                    )}
                    <span>{e.nickname}</span>
                    {i === 0 && <span className="trophy">🏆</span>}
                  </td>
                  <td className="points">{e.points}</td>
                  <td>{e.correct}/{e.totalResults}</td>
                  <td>{e.totalBids}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
