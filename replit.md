# Replit Notes

## Architecture

This is a private mobile-first React + Vite app with a TypeScript Node/Express backend.

- Client routes: `/doug`, `/rosie`, `/couple`.
- API routes live under `/api`.
- The Express server serves Vite middleware in development and the built client from `dist/client` in production.
- Shared date/progress types and helpers live in `src/shared`.
- Hardcoded quote banks and deterministic quote selection live in `src/content/quotes.ts`.
- No authentication, roles, registration, admin area, public marketing page, or local workout-file storage.

## Run Commands

Install dependencies:

```bash
npm install
```

Develop on Replit:

```bash
npm run dev
```

Build and typecheck:

```bash
npm test
npm run typecheck
npm run build
```

Production start:

```bash
npm run start
```

## Database

The app requires PostgreSQL through `DATABASE_URL`. On Replit, attach a PostgreSQL database and make sure `DATABASE_URL` is available to the app.

On startup/API use, the backend creates the required tables if missing:

- `users`
- `workouts`
- `achievement_events`
- `achievement_views`

It also seeds Doug and Rosie automatically:

- `doug` -> `Doug`
- `rosie` -> `Rosie`

Required data constraints are in the database:

- `UNIQUE(user_id, workout_date)` on `workouts`
- `UNIQUE(achievement_event_id, viewer_user_id)` on `achievement_views`
- one individual completion event per user/week
- one couple completion event per week

Week logic uses Europe/London calendar dates. Weeks start Sunday and end Saturday.

## Stage 1 Notes

Stage 1 focuses on app structure, persistence, routes, mobile layout, hold-to-log behavior, backfill/removal flow, achievement state, basic overlays, PWA manifest/service worker, and sound/haptic structure.

Stage 2 should improve:

- richer achievement animation and sound design
- more polished visual effects around 1/4, 2/4, 3/4, 4/4, and 8/8
- optional replay/history for achievements
- deeper mobile device testing once deployed on Replit
