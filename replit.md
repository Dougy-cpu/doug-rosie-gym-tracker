# Replit Notes

## Architecture

This is a private mobile-first React + Vite app with a TypeScript Node/Express backend.

- Client routes: `/doug`, `/rosie`, `/couple`, `/sound-lab`.
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

Run on Replit:

```bash
npm run replit
```

This builds the client and starts the compiled Express server directly. Use this on Replit so only the app port opens. `npm run dev` is for local development and may open Vite's hot-reload port as well.

The Vite dev server allows Replit preview hosts through `server.allowedHosts` in `vite.config.ts`. If Replit changes preview domains in the future and shows a blocked-host message during `npm run dev`, add the new controlled Replit domain there rather than setting `allowedHosts: true`.

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

## Stage 2 Notes

Stage 2 adds the dark tactical mobile UI, reward-heavy progress states, 700ms hold interactions for today's tile and calendar backfill, richer 4/4 and 8/8 achievement overlays, original Web Audio cues, haptic patterns, and the `/sound-lab` testing route.

The app still requires a real PostgreSQL `DATABASE_URL`; do not add local file or browser-only workout storage as a fallback.
