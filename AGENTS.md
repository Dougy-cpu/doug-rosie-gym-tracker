# Project Rules For Future Codex Work

## Product Direction

Build only the private Doug and Rosie gym tracker. Do not add authentication, registration, admin tools, roles, permissions, public marketing pages, or quote settings unless Doug explicitly asks.

The app is mobile portrait first. Treat desktop as a centered preview of the mobile app, not a separate desktop product.

The visual direction is dark, premium, neon, tactical, and satisfying. Stage 1 does not need pixel-perfect fidelity to the supplied mockup, but future polish should keep that direction.

## Data Rules

Persist workout data in PostgreSQL. Do not use local JSON files, the app filesystem, localStorage, or browser-only storage for workouts.

Keep these rules intact:

- target is 4 workouts per person per Sunday-Saturday week
- Europe/London calendar dates
- one workout per user per date
- no future workout logging
- past dates may be backfilled
- completed dates require deliberate confirmation before removal

## Achievement Rules

Create an `individual_week_complete` achievement when a user crosses from below 4 to 4 or more workouts in the current week.

Create one `couple_week_complete` achievement when both users reach 4 or more in the same current week.

Use `achievement_views` to prevent replay after dismissal. Do not replay seen achievements unless a future explicit history/replay feature is added.

## Implementation Rules

Use TypeScript, React, Vite, Express, and PostgreSQL. Keep files focused and reusable. Put shared date/progress behavior in `src/shared` and quote content in `src/content/quotes.ts`.

Run these before handoff:

```bash
npm test
npm run typecheck
npm run build
```

If a local `DATABASE_URL` is not available, report that runtime DB verification was blocked instead of adding a non-persistent fallback.
