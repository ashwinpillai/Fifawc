# FIFA World Cup 2026 — Bidding Pool

A local-friendly prediction pool for FIFA WC 2026. Friends and colleagues sign up, pick match winners on match day (IST), and compete on the leaderboard. You manage results from the admin panel.

Inspired by [worldcup-bid-tracker.lovable.app](https://worldcup-bid-tracker.lovable.app/).

## Features

- **User signup** — email + password (no verification)
- **Persistent login** — JWT stored in browser `localStorage` (same device = same nickname)
- **Profile** — nickname + emoji or uploaded avatar
- **104 matches** — full group stage + knockout schedule in IST
- **Bidding rules**
  - Picks are **final** (no undo)
  - Bids only on **match day** (IST calendar date)
  - Bids close **at kickoff** (not after)
  - Cannot bid on future dates
- **Admin** at `/admin` — one-time account setup, declare winners, award 1 point per correct pick
- **Leaderboard** — live rankings

## Quick start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ installed

### Install & run (development)

```bash
npm run install:all
npm run dev
```

- **Website:** http://localhost:5173
- **API:** http://localhost:3001

Open **http://localhost:5173/admin** to create your admin account (first visit only).

### Production (single port, share on LAN)

```bash
npm run install:all
npm run build
npm start
```

Server runs on **http://0.0.0.0:3001** and serves the built frontend.

Find your PC's local IP:

```powershell
ipconfig
```

Share with friends: `http://<YOUR-IP>:3001` (e.g. `http://192.168.1.42:3001`).

> **Windows Firewall:** Allow Node.js through the firewall when prompted, or add an inbound rule for port 3001.

## Publish online with Render

This app needs a Node server for `/api/*`, SQLite storage, and avatar uploads, so GitHub Pages alone is not enough.

1. Push this repository to GitHub.
2. In Render, create a new Blueprint and connect `ashwinpillai/Fifawc`.
3. Render will read `render.yaml` and create one Node web service.
4. Use a paid instance type that supports the persistent disk. The disk stores `wc26.db` and uploaded avatars at `/var/data`.
5. After the deploy finishes, open the Render URL and visit `/admin` to create the first admin account.

The deploy uses:

- Build command: `npm run install:all && npm run build`
- Start command: `npm start`
- Persistent data directory: `/var/data`
- Generated `JWT_SECRET`

## Usage

1. **You (admin):** Visit `/admin`, create admin account, log in after matches to set winners.
2. **Players:** Visit home page → Sign up → Set nickname/avatar → Bid on today's matches before kickoff.
3. **Leaderboard:** Updates automatically when admin declares results.

## Project structure

```
├── client/          React + Vite frontend
├── server/          Express API + SQLite
│   ├── data/        Match schedule (matches.json)
│   └── uploads/     User avatar uploads
└── package.json     Root scripts
```

## Data

- Match schedule is seeded from `server/data/matches.json` on first run.
- User data, bids, and results are stored in `server/wc26.db` (SQLite).
- Knockout round teams show as **TBD** until you update them in admin (optional).

## Security notes (friendly local pool)

- Change `JWT_SECRET` env var for production: `set JWT_SECRET=your-long-random-secret`
- Admin account can only be created once (first `/admin` setup).
- This is designed for trusted friend/office pools on a local network, not public internet hosting.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Friends can't connect | Same Wi‑Fi? Firewall allows port 3001? Use your LAN IP, not `localhost` |
| "Bidding closed" | Match day must be today (IST) and before kickoff time |
| Lost nickname on new device | Login with same email/password — profile is tied to account, token is per-device |
| Reset everything | Delete `server/wc26.db` and restart (re-seeds matches) |
