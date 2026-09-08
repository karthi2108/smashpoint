# SmashPoint — Badminton Tournament Manager

Full-stack tournament app: player registration (Excel/CSV import), knockout fixtures per category, a rules-accurate umpire scorecard, and a live courtside display that updates over WebSockets.

**Stack:** React (Vite) · Python FastAPI · PostgreSQL (SQLite fallback for quick local runs) · WebSockets

## Features

- **Auth & roles** — JWT login. `admin` can edit everything; spectators get read-only fixtures and the live display. Default admin: `admin` / `admin123` (change via env vars).
- **Players** — import entries from `.xlsx`/`.csv` (first column) or paste names, per category: men's/women's singles & doubles, mixed doubles. Doubles entries are pairs written as `Player 1 / Player 2`.
- **Fixtures** — one-click knockout draw per category with byes distributed correctly, inline renaming, walkovers, and automatic winner advancement round to round.
- **Umpire scorecard** — config-first flow (points 11/21/30, single set / best of 3, singles/doubles), rally-point scoring, serve + service-court tracking, mid-game interval, deuce with win-by-2 and sudden-death cap, undo (even across a finished match — it rolls the bracket back too).
- **Live display** — stadium-style scoreboard for a TV/monitor, pushed instantly over WebSocket on every point.

## Quick start (Docker — recommended)

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- API docs: http://localhost:8000/docs
- PostgreSQL on :5432 (`smash`/`smash`, db `smashpoint`)

## Manual setup

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Option A: zero-setup (SQLite file, good for trying it out)
uvicorn app.main:app --reload

# Option B: PostgreSQL
export DATABASE_URL=postgresql+psycopg2://smash:smash@localhost:5432/smashpoint
uvicorn app.main:app --reload
```

Tables are created automatically on startup and the admin user is seeded from
`ADMIN_USERNAME` / `ADMIN_PASSWORD` (defaults `admin` / `admin123`). See `backend/.env.example`.

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173, proxies /api and /ws to :8000
```

## Project layout

```
backend/
  app/
    main.py            FastAPI app, CORS, admin seeding
    config.py          env config, categories, score caps
    database.py        SQLAlchemy engine/session
    models.py          User, Entry, BracketMatch, Match
    schemas.py         Pydantic request/response models
    auth.py            JWT + bcrypt + admin dependency
    scoring.py         pure badminton scoring engine (unit-testable)
    ws.py              WebSocket broadcaster
    routers/
      auth_routes.py   POST /api/auth/login
      players.py       entries CRUD + /api/entries/import (xlsx/csv)
      fixtures.py      draw generation, rename, walkover
      matches.py       match lifecycle, /point, /undo, WS /ws/matches/{id}
frontend/
  src/
    App.jsx            role state + Netflix-card navigation
    api.js             REST + WebSocket client
    pages/             Login, Hub, Players, Fixtures, Scorecard, Live
```

## API cheat-sheet

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /api/auth/login | — | Get JWT (`{username, password}`) |
| GET | /api/entries?category=MS | — | List entries |
| POST | /api/entries | admin | Add names `{category, names[]}` |
| POST | /api/entries/import | admin | Multipart xlsx/csv import |
| POST | /api/fixtures/{cat}/generate | admin | (Re)generate knockout draw |
| GET | /api/fixtures/{cat} | — | Bracket (flat list: round_idx, slot_idx) |
| PATCH | /api/fixtures/match/{id} | admin | Rename a side |
| POST | /api/fixtures/match/{id}/walkover | admin | Advance a side |
| POST | /api/matches | admin | Start match (from `bracket_match_id` or names) |
| POST | /api/matches/{id}/point | admin | Award rally `{side: "a"|"b"}` |
| POST | /api/matches/{id}/undo | admin | Revert last rally (rolls back bracket if needed) |
| WS | /ws/matches/{id} | — | Live state pushed on every point |

## Scoring rules implemented

Rally point (every rally scores) · winner serves next, right court on even score, left on odd ·
interval at 11 (21-pt games), 6 (11-pt), 16 (30-pt) · deuce at target−1 all: win by 2,
sudden death at the cap (21→30, 11→15, 30→35).

## Notes for production

- Set a strong `SECRET_KEY` and change the admin password (env vars).
- Serve the built frontend (`npm run build` → `frontend/dist`) behind nginx/Caddy and proxy `/api` + `/ws` to uvicorn.
- For schema migrations beyond this v1, add Alembic (models are plain SQLAlchemy, so it drops in cleanly).
