const TOKEN_KEY = 'wc26_token';
const ADMIN_TOKEN_KEY = 'wc26_admin_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string | null) {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}, admin = false): Promise<T> {
  const token = admin ? getAdminToken() : getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export const api = {
  stats: () => request<{ players: number; matches: number; bids: number; todayIST: string }>('/api/stats'),
  register: (email: string, password: string) =>
    request<{ token: string; needsProfile: boolean }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; needsProfile: boolean; user?: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ user: User; needsProfile: boolean }>('/api/auth/me'),
  updateProfile: (nickname: string, avatar: string) =>
    request<{ user: User }>('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify({ nickname, avatar }),
    }),
  uploadAvatar: (file: File) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return request<{ avatar: string }>('/api/users/avatar', { method: 'POST', body: fd });
  },
  matches: (userId?: number) =>
    request<{ matches: Match[]; todayIST: string }>(
      `/api/matches${userId ? `?userId=${userId}` : ''}`
    ),
  placeBid: (matchId: number, pick: 'home' | 'away' | 'draw') =>
    request<{ success: boolean }>('/api/bids', {
      method: 'POST',
      body: JSON.stringify({ matchId, pick }),
    }),
  leaderboard: () => request<{ leaderboard: LeaderEntry[] }>('/api/leaderboard'),
  adminStatus: () => request<{ hasAdmin: boolean }>('/api/admin/status'),
  adminSetup: (email: string, password: string) =>
    request<{ token: string }>('/api/admin/setup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  adminLogin: (email: string, password: string) =>
    request<{ token: string }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  adminMatches: () => request<{ matches: AdminMatch[] }>('/api/admin/matches', {}, true),
  setWinner: (matchId: number, winner: 'home' | 'away' | 'draw' | null) =>
    request<{ success: boolean }>(`/api/admin/matches/${matchId}/winner`, {
      method: 'PUT',
      body: JSON.stringify({ winner }),
    }, true),
  updateMatch: (matchId: number, data: Partial<{ homeTeam: string; awayTeam: string; kickoffIST: string }>) =>
    request<{ success: boolean }>(`/api/admin/matches/${matchId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true),
};

export interface User {
  id: number;
  email: string;
  nickname: string | null;
  avatar: string | null;
}

export interface Match {
  id: number;
  matchNumber: number;
  stage: string;
  group: string | null;
  homeTeam: string;
  awayTeam: string;
  kickoffIST: string;
  kickoffFormatted: string;
  matchDateIST: string;
  winner: string | null;
  canBid: boolean;
  bidStatusReason: string | null;
  userPick: 'home' | 'away' | 'draw' | null;
  bidCounts: { home: number; away: number; draw: number };
}

export interface LeaderEntry {
  id: number;
  nickname: string;
  avatar: string;
  points: number;
  correct: number;
  totalResults: number;
  totalBids: number;
}

export interface AdminMatch {
  id: number;
  match_number: number;
  stage: string;
  group_name: string | null;
  home_team: string;
  away_team: string;
  kickoff_ist: string;
  kickoffFormatted: string;
  winner: string | null;
  isPastKickoff: boolean;
}
