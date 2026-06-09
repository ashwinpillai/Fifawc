const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Parse "2026-06-11T19:00:00" as IST wall-clock time → UTC Date */
export function parseKickoffIST(kickoffIST) {
  const [datePart, timePart] = kickoffIST.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm, ss = 0] = timePart.split(':').map(Number);
  const utcMs = Date.UTC(y, m - 1, d, hh, mm, ss) - IST_OFFSET_MS;
  return new Date(utcMs);
}

/** Current date string YYYY-MM-DD in IST */
export function todayIST(now = new Date()) {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const d = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Match date string YYYY-MM-DD in IST */
export function matchDateIST(kickoffIST) {
  return kickoffIST.split('T')[0];
}

/**
 * Bidding window rules:
 * - Only on match day (IST calendar date)
 * - Before kickoff (not at or after)
 */
export function canPlaceBid(kickoffIST, now = new Date()) {
  const today = todayIST(now);
  const matchDay = matchDateIST(kickoffIST);
  if (today !== matchDay) {
    if (today < matchDay) return { allowed: false, reason: 'Bidding opens on match day only (IST).' };
    return { allowed: false, reason: 'Bidding closed — match day has passed.' };
  }
  const kickoff = parseKickoffIST(kickoffIST);
  if (now >= kickoff) {
    return { allowed: false, reason: 'Bidding closed — match has started (IST).' };
  }
  return { allowed: true };
}

export function formatKickoffIST(kickoffIST) {
  const kickoff = parseKickoffIST(kickoffIST);
  const ist = new Date(kickoff.getTime() + IST_OFFSET_MS);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = days[ist.getUTCDay()];
  const month = months[ist.getUTCMonth()];
  const date = ist.getUTCDate();
  let h = ist.getUTCHours();
  const min = String(ist.getUTCMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${day}, ${month} ${date}, ${h}:${min} ${ampm} IST`;
}
