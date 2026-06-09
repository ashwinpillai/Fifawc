import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type Match } from '../lib/api';
import { useAuth } from '../lib/auth';

const STAGE_LABELS: Record<string, string> = {
  GROUP: 'Group Stage',
  ROUND_OF_32: 'Round of 32',
  ROUND_OF_16: 'Round of 16',
  QUARTER_FINAL: 'Quarter-final',
  SEMI_FINAL: 'Semi-final',
  THIRD_PLACE: 'Third Place',
  FINAL: 'Final',
};

function formatDateHeader(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${days[date.getUTCDay()]}, ${months[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

function MatchCard({
  match,
  onBid,
  bidding,
}: {
  match: Match;
  onBid: (id: number, pick: 'home' | 'away' | 'draw') => void;
  bidding: number | null;
}) {
  const stageLabel = STAGE_LABELS[match.stage] || match.stage;
  const groupLabel = match.group ? `GROUP · ${match.group}` : stageLabel.toUpperCase();

  const pickLabel = (pick: string | null) => {
    if (!pick) return null;
    if (pick === 'home') return match.homeTeam;
    if (pick === 'away') return match.awayTeam;
    return 'DRAW';
  };

  const winnerLabel = () => {
    if (!match.winner) return null;
    if (match.winner === 'draw') return 'DRAW';
    if (match.winner === 'home') return match.homeTeam;
    return match.awayTeam;
  };

  const isCorrect =
    match.userPick &&
    match.winner &&
    match.userPick === match.winner;

  const isWrong =
    match.userPick &&
    match.winner &&
    match.userPick !== match.winner;

  return (
    <article className={`match-card ${match.userPick ? 'has-bid' : ''} ${match.winner ? 'resolved' : ''}`}>
      <div className="match-meta">
        <span className="match-num">#{match.matchNumber}</span>
        <span className="match-group">{groupLabel}</span>
      </div>
      <p className="match-time">
        {match.canBid ? (
          <span className="badge-open">Bidding open</span>
        ) : match.userPick ? (
          <span className="badge-locked">Your pick locked</span>
        ) : (
          <span className="badge-closed">Opens match day</span>
        )}
        <span>{match.kickoffFormatted}</span>
      </p>

      <div className="match-teams">
        <BidButton
          team={match.homeTeam}
          count={match.bidCounts.home}
          selected={match.userPick === 'home'}
          disabled={!match.canBid || !!match.userPick || bidding === match.id}
          onClick={() => onBid(match.id, 'home')}
        />
        <BidButton
          team="DRAW"
          count={match.bidCounts.draw}
          selected={match.userPick === 'draw'}
          disabled={!match.canBid || !!match.userPick || bidding === match.id}
          onClick={() => onBid(match.id, 'draw')}
          isDraw
        />
        <BidButton
          team={match.awayTeam}
          count={match.bidCounts.away}
          selected={match.userPick === 'away'}
          disabled={!match.canBid || !!match.userPick || bidding === match.id}
          onClick={() => onBid(match.id, 'away')}
        />
      </div>

      {match.userPick && (
        <p className={`pick-status ${isCorrect ? 'correct' : isWrong ? 'wrong' : ''}`}>
          Your pick: <strong>{pickLabel(match.userPick)}</strong>
          {match.winner && (
            <> · Result: <strong>{winnerLabel()}</strong>{isCorrect && ' ✓ +1 pt'}</>
          )}
        </p>
      )}

      {!match.userPick && !match.canBid && match.bidStatusReason && (
        <p className="bid-reason">{match.bidStatusReason}</p>
      )}

      {bidding === match.id && <p className="bid-reason">Placing bid…</p>}
    </article>
  );
}

function BidButton({
  team,
  count,
  selected,
  disabled,
  onClick,
  isDraw,
}: {
  team: string;
  count: number;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  isDraw?: boolean;
}) {
  return (
    <button
      type="button"
      className={`bid-btn ${isDraw ? 'draw' : ''} ${selected ? 'selected' : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="bid-team">{team}</span>
      <span className="bid-count">{count} bids</span>
    </button>
  );
}

export default function MatchesPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [todayIST, setTodayIST] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [bidding, setBidding] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{ matchId: number; pick: 'home' | 'away' | 'draw'; label: string } | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.matches(user?.id).then((data) => {
      setMatches(data.matches);
      setTodayIST(data.todayIST);
    });
  }, [user?.id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const stages = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of matches) counts[m.stage] = (counts[m.stage] || 0) + 1;
    return counts;
  }, [matches]);

  const filtered = useMemo(
    () => (stageFilter === 'ALL' ? matches : matches.filter((m) => m.stage === stageFilter)),
    [matches, stageFilter]
  );

  const byDate = useMemo(() => {
    const groups: Record<string, Match[]> = {};
    for (const m of filtered) {
      if (!groups[m.matchDateIST]) groups[m.matchDateIST] = [];
      groups[m.matchDateIST].push(m);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const requestBid = (matchId: number, pick: 'home' | 'away' | 'draw') => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;
    const label =
      pick === 'home' ? match.homeTeam : pick === 'away' ? match.awayTeam : 'DRAW';
    setConfirm({ matchId, pick, label });
  };

  const confirmBid = async () => {
    if (!confirm) return;
    setError('');
    setBidding(confirm.matchId);
    try {
      await api.placeBid(confirm.matchId, confirm.pick);
      setConfirm(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bid failed');
    } finally {
      setBidding(null);
    }
  };

  return (
    <div className="matches-page">
      <div className="page-header">
        <h1>Matches</h1>
        <p className="page-sub">
          Today (IST): <strong>{todayIST}</strong> — bid only on today&apos;s matches before kickoff.
          Picks are final.
        </p>
      </div>

      <div className="stage-filters">
        <button
          type="button"
          className={`filter-chip ${stageFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => setStageFilter('ALL')}
        >
          All {matches.length}
        </button>
        {Object.entries(stages).map(([stage, count]) => (
          <button
            key={stage}
            type="button"
            className={`filter-chip ${stageFilter === stage ? 'active' : ''}`}
            onClick={() => setStageFilter(stage)}
          >
            {STAGE_LABELS[stage] || stage} {count}
          </button>
        ))}
      </div>

      {error && <p className="error-banner">{error}</p>}

      {byDate.map(([date, dayMatches]) => (
        <section key={date} className="day-section">
          <h2 className="day-header">
            {formatDateHeader(date)}
            <span className="day-count">{dayMatches.length} match{dayMatches.length !== 1 ? 'es' : ''}</span>
            {date === todayIST && <span className="today-badge">Today</span>}
          </h2>
          <div className="match-grid">
            {dayMatches.map((m) => (
              <MatchCard key={m.id} match={m} onBid={requestBid} bidding={bidding} />
            ))}
          </div>
        </section>
      ))}

      {confirm && (
        <div className="modal-overlay" role="dialog">
          <div className="modal">
            <h3>Confirm your pick</h3>
            <p>
              You are choosing <strong>{confirm.label}</strong>. This cannot be changed or undone.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={confirmBid}>
                Lock in pick
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
