import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import db, { initDb } from './db.js';
import { canPlaceBid, formatKickoffIST, parseKickoffIST, todayIST } from './time.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = process.env.JWT_SECRET || 'wc26-local-dev-secret-change-in-production';
const PORT = process.env.PORT || 3001;
const uploadsDir = join(__dirname, '..', 'uploads');
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

initDb();

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop() || 'png';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  },
});

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '365d' });
}

function authUser(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}

function authAdmin(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.adminToken;
  if (!token) return res.status(401).json({ error: 'Admin not authenticated' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin') throw new Error('not admin');
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid admin session' });
  }
}

// --- Public stats ---
app.get('/api/stats', (_req, res) => {
  const players = db.prepare('SELECT COUNT(*) as c FROM users WHERE nickname IS NOT NULL').get().c;
  const matches = db.prepare('SELECT COUNT(*) as c FROM matches').get().c;
  const bids = db.prepare('SELECT COUNT(*) as c FROM bids').get().c;
  res.json({ players, matches, bids, todayIST: todayIST() });
});

// --- User auth ---
app.post('/api/auth/register', (req, res) => {
  const { email, password } = req.body;
  if (!email?.trim() || !password || password.length < 4) {
    return res.status(400).json({ error: 'Email and password (min 4 chars) required' });
  }
  const normalized = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalized);
  if (existing) return res.status(409).json({ error: 'Email already registered. Please log in.' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(normalized, hash);
  const token = signToken({ id: result.lastInsertRowid, role: 'user', email: normalized });
  res.json({ token, needsProfile: true });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const normalized = email.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalized);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = signToken({ id: user.id, role: 'user', email: user.email });
  res.json({
    token,
    needsProfile: !user.nickname,
    user: { id: user.id, email: user.email, nickname: user.nickname, avatar: user.avatar },
  });
});

app.get('/api/auth/me', authUser, (req, res) => {
  const user = db.prepare('SELECT id, email, nickname, avatar FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user, needsProfile: !user.nickname });
});

app.put('/api/users/profile', authUser, (req, res) => {
  const { nickname, avatar } = req.body;
  if (!nickname?.trim() || nickname.trim().length < 2) {
    return res.status(400).json({ error: 'Nickname must be at least 2 characters' });
  }
  const taken = db
    .prepare('SELECT id FROM users WHERE nickname = ? AND id != ?')
    .get(nickname.trim(), req.user.id);
  if (taken) return res.status(409).json({ error: 'Nickname already taken' });

  db.prepare('UPDATE users SET nickname = ?, avatar = ? WHERE id = ?').run(
    nickname.trim(),
    avatar || '⚽',
    req.user.id
  );
  const user = db.prepare('SELECT id, email, nickname, avatar FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});

app.post('/api/users/avatar', authUser, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  const url = `/uploads/${req.file.filename}`;
  db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(url, req.user.id);
  res.json({ avatar: url });
});

// --- Matches & bids ---
app.get('/api/matches', (req, res) => {
  const userId = req.query.userId;
  const matches = db.prepare('SELECT * FROM matches ORDER BY kickoff_ist').all();
  let userBids = {};
  if (userId) {
    const bids = db.prepare('SELECT match_id, pick FROM bids WHERE user_id = ?').all(userId);
    userBids = Object.fromEntries(bids.map((b) => [b.match_id, b.pick]));
  }

  const bidCounts = db
    .prepare(
      `SELECT match_id, pick, COUNT(*) as count FROM bids GROUP BY match_id, pick`
    )
    .all();
  const countsByMatch = {};
  for (const row of bidCounts) {
    if (!countsByMatch[row.match_id]) countsByMatch[row.match_id] = { home: 0, away: 0, draw: 0 };
    countsByMatch[row.match_id][row.pick] = row.count;
  }

  const now = new Date();
  const enriched = matches.map((m) => {
    const bidWindow = canPlaceBid(m.kickoff_ist, now);
    return {
      id: m.id,
      matchNumber: m.match_number,
      stage: m.stage,
      group: m.group_name,
      homeTeam: m.home_team,
      awayTeam: m.away_team,
      kickoffIST: m.kickoff_ist,
      kickoffFormatted: formatKickoffIST(m.kickoff_ist),
      matchDateIST: m.kickoff_ist.split('T')[0],
      winner: m.winner,
      canBid: bidWindow.allowed,
      bidStatusReason: bidWindow.reason || null,
      userPick: userBids[m.id] || null,
      bidCounts: countsByMatch[m.id] || { home: 0, away: 0, draw: 0 },
    };
  });
  res.json({ matches: enriched, todayIST: todayIST(now) });
});

app.post('/api/bids', authUser, (req, res) => {
  const { matchId, pick } = req.body;
  if (!['home', 'away', 'draw'].includes(pick)) {
    return res.status(400).json({ error: 'Pick must be home, away, or draw' });
  }

  const user = db.prepare('SELECT nickname FROM users WHERE id = ?').get(req.user.id);
  if (!user?.nickname) return res.status(403).json({ error: 'Complete your profile first' });

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const existing = db
    .prepare('SELECT id FROM bids WHERE user_id = ? AND match_id = ?')
    .get(req.user.id, matchId);
  if (existing) return res.status(409).json({ error: 'Bid already placed — picks are final and cannot be changed.' });

  const bidWindow = canPlaceBid(match.kickoff_ist);
  if (!bidWindow.allowed) return res.status(403).json({ error: bidWindow.reason });

  db.prepare('INSERT INTO bids (user_id, match_id, pick) VALUES (?, ?, ?)').run(
    req.user.id,
    matchId,
    pick
  );
  res.json({ success: true, pick });
});

// --- Leaderboard ---
app.get('/api/leaderboard', (_req, res) => {
  const users = db
    .prepare(`SELECT id, nickname, avatar FROM users WHERE nickname IS NOT NULL ORDER BY nickname`)
    .all();

  const scored = users.map((u) => {
    const bids = db
      .prepare(
        `SELECT b.pick, m.winner, m.home_team, m.away_team
         FROM bids b JOIN matches m ON m.id = b.match_id
         WHERE b.user_id = ? AND m.winner IS NOT NULL`
      )
      .all(u.id);

    let points = 0;
    let correct = 0;
    let total = bids.length;
    for (const b of bids) {
      if (b.winner === 'draw' && b.pick === 'draw') {
        points++;
        correct++;
      } else if (b.winner === 'home' && b.pick === 'home') {
        points++;
        correct++;
      } else if (b.winner === 'away' && b.pick === 'away') {
        points++;
        correct++;
      }
    }

    const totalBids = db.prepare('SELECT COUNT(*) as c FROM bids WHERE user_id = ?').get(u.id).c;
    return { ...u, points, correct, totalResults: total, totalBids };
  });

  scored.sort((a, b) => b.points - a.points || a.nickname.localeCompare(b.nickname));
  res.json({ leaderboard: scored });
});

// --- Admin ---
app.get('/api/admin/status', (_req, res) => {
  const count = db.prepare('SELECT COUNT(*) as c FROM admins').get().c;
  res.json({ hasAdmin: count > 0 });
});

app.post('/api/admin/setup', (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as c FROM admins').get().c;
  if (count > 0) return res.status(403).json({ error: 'Admin already exists' });

  const { email, password } = req.body;
  if (!email?.trim() || !password || password.length < 6) {
    return res.status(400).json({ error: 'Email and password (min 6 chars) required' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const result = db
    .prepare('INSERT INTO admins (email, password_hash) VALUES (?, ?)')
    .run(email.trim().toLowerCase(), hash);
  const token = signToken({ id: result.lastInsertRowid, role: 'admin', email: email.trim().toLowerCase() });
  res.json({ token });
});

app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email?.trim().toLowerCase());
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }
  const token = signToken({ id: admin.id, role: 'admin', email: admin.email });
  res.json({ token });
});

app.get('/api/admin/matches', authAdmin, (_req, res) => {
  const now = new Date();
  const matches = db.prepare('SELECT * FROM matches ORDER BY kickoff_ist').all();
  res.json({
    matches: matches.map((m) => ({
      ...m,
      kickoffFormatted: formatKickoffIST(m.kickoff_ist),
      isPastKickoff: now >= parseKickoffIST(m.kickoff_ist),
    })),
  });
});

app.put('/api/admin/matches/:id', authAdmin, (req, res) => {
  const { homeTeam, awayTeam, kickoffIST } = req.body;
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  db.prepare(
    `UPDATE matches SET home_team = ?, away_team = ?, kickoff_ist = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    homeTeam ?? match.home_team,
    awayTeam ?? match.away_team,
    kickoffIST ?? match.kickoff_ist,
    req.params.id
  );
  res.json({ success: true });
});

app.put('/api/admin/matches/:id/winner', authAdmin, (req, res) => {
  const { winner } = req.body;
  if (!['home', 'away', 'draw', null].includes(winner)) {
    return res.status(400).json({ error: 'Winner must be home, away, draw, or null to clear' });
  }
  db.prepare('UPDATE matches SET winner = ?, updated_at = datetime("now") WHERE id = ?').run(
    winner,
    req.params.id
  );
  res.json({ success: true });
});

app.get('/api/admin/users', authAdmin, (_req, res) => {
  const users = db
    .prepare('SELECT id, email, nickname, avatar, created_at FROM users ORDER BY created_at DESC')
    .all();
  res.json({ users });
});

// Serve production build
const clientDist = join(__dirname, '..', '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`WC26 Bidding Pool API running on http://0.0.0.0:${PORT}`);
  console.log(`Share on your network: http://<your-local-ip>:${PORT}`);
});
