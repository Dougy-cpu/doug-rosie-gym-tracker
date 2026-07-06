import "dotenv/config";
import pg from "pg";
import { serviceUnavailable } from "./errors.js";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let initPromise: Promise<void> | null = null;

export function getPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw serviceUnavailable(
      "database_url_missing",
      "DATABASE_URL is required. Attach a PostgreSQL database in Replit before using the tracker."
    );
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined
    });
  }

  return pool;
}

export async function ensureDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = initializeDatabase();
  }

  return initPromise;
}

async function initializeDatabase(): Promise<void> {
  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      workout_date DATE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      source TEXT NOT NULL DEFAULT 'hold',
      note TEXT,
      UNIQUE(user_id, workout_date)
    );

    CREATE TABLE IF NOT EXISTS achievement_events (
      id SERIAL PRIMARY KEY,
      event_type TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      triggering_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      week_start_date DATE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      payload_json JSONB NOT NULL DEFAULT '{}'::jsonb
    );

    CREATE TABLE IF NOT EXISTS achievement_views (
      id SERIAL PRIMARY KEY,
      achievement_event_id INTEGER NOT NULL REFERENCES achievement_events(id) ON DELETE CASCADE,
      viewer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(achievement_event_id, viewer_user_id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS achievement_events_unique_individual_week
      ON achievement_events (user_id, week_start_date)
      WHERE event_type = 'individual_week_complete';

    CREATE UNIQUE INDEX IF NOT EXISTS achievement_events_unique_couple_week
      ON achievement_events (week_start_date)
      WHERE event_type = 'couple_week_complete';
  `);

  await db.query(
    `
      INSERT INTO users (slug, display_name)
      VALUES
        ('doug', 'Doug'),
        ('rosie', 'Rosie')
      ON CONFLICT (slug) DO UPDATE
      SET display_name = EXCLUDED.display_name;
    `
  );
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    initPromise = null;
  }
}
