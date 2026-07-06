import type pg from "pg";
import {
  assertIsoDate,
  compareIsoDates,
  getLondonTodayIso,
  getMonthGrid,
  getMonthLabel,
  getWeekRangeForDate,
  isDateInRange,
  isFutureDate
} from "../shared/date.js";
import type { AchievementEvent, AppUser, TrackerState, UserSlug, ViewerSlug } from "../shared/types.js";
import { badRequest, notFound } from "./errors.js";
import { ensureDatabase, getPool } from "./db.js";

type Queryable = Pick<pg.Pool, "query"> | Pick<pg.PoolClient, "query">;

interface UserRow {
  id: number;
  slug: UserSlug;
  displayName: string;
  createdAt: string;
}

interface WorkoutDateRow {
  slug: UserSlug;
  workoutDate: string;
}

interface AchievementRow {
  id: number;
  eventType: "individual_week_complete" | "couple_week_complete";
  userId: number | null;
  triggeringUserId: number | null;
  weekStartDate: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

const userSlugs = ["doug", "rosie"] as const;
const weeklyTarget = 4;
const coupleTarget = 8;

export function isUserSlug(value: string): value is UserSlug {
  return userSlugs.includes(value as UserSlug);
}

export function parseViewer(value: string): ViewerSlug {
  if (value === "couple" || isUserSlug(value)) {
    return value;
  }

  throw notFound("viewer_not_found", "That tracker route does not exist.");
}

export async function buildTrackerState(viewer: ViewerSlug): Promise<TrackerState> {
  await ensureDatabase();

  const db = getPool();
  const today = getLondonTodayIso();
  const week = getWeekRangeForDate(today);
  const monthDays = getMonthGrid(today);
  const monthStart = monthDays[0]?.isoDate ?? today;
  const monthEnd = monthDays.at(-1)?.isoDate ?? today;
  const queryStart = compareIsoDates(monthStart, week.start) < 0 ? monthStart : week.start;
  const queryEnd = compareIsoDates(monthEnd, week.end) > 0 ? monthEnd : week.end;
  const users = await getUsers(db);
  const pageUser = isUserSlug(viewer) ? users.find((user) => user.slug === viewer) ?? null : null;
  const [workoutsByUser, dougCount, rosieCount] = await Promise.all([
    getWorkoutDatesByUser(db, queryStart, queryEnd),
    countWeekWorkouts(db, getUser(users, "doug").id, week.start, week.end),
    countWeekWorkouts(db, getUser(users, "rosie").id, week.start, week.end)
  ]);

  return {
    viewer,
    pageUser,
    users,
    today,
    week,
    month: {
      label: getMonthLabel(today),
      start: monthStart,
      end: monthEnd,
      days: monthDays
    },
    workoutsByUser,
    counts: {
      doug: { week: dougCount, target: weeklyTarget },
      rosie: { week: rosieCount, target: weeklyTarget },
      couple: { week: dougCount + rosieCount, target: coupleTarget }
    },
    pendingAchievements: isUserSlug(viewer) ? await getPendingAchievements(db, getUser(users, viewer).id) : []
  };
}

export async function logWorkout(
  slug: UserSlug,
  workoutDate = getLondonTodayIso(),
  source = "hold",
  note: string | null = null
): Promise<{ created: boolean; state: TrackerState }> {
  assertIsoDate(workoutDate);

  const today = getLondonTodayIso();
  if (isFutureDate(workoutDate, today)) {
    throw badRequest("future_date", "Future workouts cannot be logged.");
  }

  await ensureDatabase();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const user = await getUserBySlug(client, slug);
    const partner = await getUserBySlug(client, slug === "doug" ? "rosie" : "doug");
    const currentWeek = getWeekRangeForDate(today);
    const beforeCount = await countWeekWorkouts(client, user.id, currentWeek.start, currentWeek.end);
    const insert = await client.query<{ id: number }>(
      `
        INSERT INTO workouts (user_id, workout_date, source, note)
        VALUES ($1, $2::date, $3, $4)
        ON CONFLICT (user_id, workout_date) DO NOTHING
        RETURNING id;
      `,
      [user.id, workoutDate, source, note]
    );
    const created = (insert.rowCount ?? 0) > 0;

    if (created && isDateInRange(workoutDate, currentWeek.start, currentWeek.end)) {
      const afterCount = await countWeekWorkouts(client, user.id, currentWeek.start, currentWeek.end);

      if (beforeCount < weeklyTarget && afterCount >= weeklyTarget) {
        await createIndividualWeekComplete(client, user, currentWeek.start, afterCount);

        const partnerCount = await countWeekWorkouts(client, partner.id, currentWeek.start, currentWeek.end);
        if (partnerCount >= weeklyTarget) {
          await createCoupleWeekComplete(client, user, currentWeek.start, afterCount + partnerCount);
        }
      }
    }

    await client.query("COMMIT");
    return { created, state: await buildTrackerState(slug) };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteWorkout(slug: UserSlug, workoutDate: string): Promise<TrackerState> {
  assertIsoDate(workoutDate);
  await ensureDatabase();

  const db = getPool();
  const user = await getUserBySlug(db, slug);

  await db.query(
    `
      DELETE FROM workouts
      WHERE user_id = $1 AND workout_date = $2::date;
    `,
    [user.id, workoutDate]
  );

  return buildTrackerState(slug);
}

export async function markAchievementSeen(slug: UserSlug, achievementEventId: number): Promise<void> {
  await ensureDatabase();

  const db = getPool();
  const user = await getUserBySlug(db, slug);

  await db.query(
    `
      INSERT INTO achievement_views (achievement_event_id, viewer_user_id)
      VALUES ($1, $2)
      ON CONFLICT (achievement_event_id, viewer_user_id) DO NOTHING;
    `,
    [achievementEventId, user.id]
  );
}

async function createIndividualWeekComplete(
  db: Queryable,
  user: AppUser,
  weekStartDate: string,
  count: number
): Promise<void> {
  await db.query(
    `
      INSERT INTO achievement_events (event_type, user_id, triggering_user_id, week_start_date, payload_json)
      VALUES ('individual_week_complete', $1, $1, $2::date, $3::jsonb)
      ON CONFLICT DO NOTHING;
    `,
    [
      user.id,
      weekStartDate,
      JSON.stringify({
        displayName: user.displayName,
        count
      })
    ]
  );
}

async function createCoupleWeekComplete(
  db: Queryable,
  triggeringUser: AppUser,
  weekStartDate: string,
  combinedCount: number
): Promise<void> {
  await db.query(
    `
      INSERT INTO achievement_events (event_type, user_id, triggering_user_id, week_start_date, payload_json)
      VALUES ('couple_week_complete', NULL, $1, $2::date, $3::jsonb)
      ON CONFLICT DO NOTHING;
    `,
    [
      triggeringUser.id,
      weekStartDate,
      JSON.stringify({
        triggeringDisplayName: triggeringUser.displayName,
        combinedCount
      })
    ]
  );
}

async function getUsers(db: Queryable): Promise<AppUser[]> {
  const result = await db.query<UserRow>(`
    SELECT
      id,
      slug,
      display_name AS "displayName",
      created_at::text AS "createdAt"
    FROM users
    ORDER BY CASE slug WHEN 'doug' THEN 1 WHEN 'rosie' THEN 2 ELSE 3 END;
  `);

  return result.rows;
}

async function getUserBySlug(db: Queryable, slug: UserSlug): Promise<AppUser> {
  const result = await db.query<UserRow>(
    `
      SELECT
        id,
        slug,
        display_name AS "displayName",
        created_at::text AS "createdAt"
      FROM users
      WHERE slug = $1;
    `,
    [slug]
  );

  const user = result.rows[0];
  if (!user) {
    throw notFound("user_not_found", "Tracker user was not found.");
  }

  return user;
}

async function countWeekWorkouts(db: Queryable, userId: number, start: string, end: string): Promise<number> {
  const result = await db.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM workouts
      WHERE user_id = $1
        AND workout_date BETWEEN $2::date AND $3::date;
    `,
    [userId, start, end]
  );

  return Number(result.rows[0]?.count ?? 0);
}

async function getWorkoutDatesByUser(
  db: Queryable,
  start: string,
  end: string
): Promise<Record<UserSlug, string[]>> {
  const result = await db.query<WorkoutDateRow>(
    `
      SELECT
        users.slug,
        workouts.workout_date::text AS "workoutDate"
      FROM workouts
      INNER JOIN users ON users.id = workouts.user_id
      WHERE workouts.workout_date BETWEEN $1::date AND $2::date
      ORDER BY workouts.workout_date ASC;
    `,
    [start, end]
  );

  return result.rows.reduce<Record<UserSlug, string[]>>(
    (accumulator, row) => {
      accumulator[row.slug].push(row.workoutDate);
      return accumulator;
    },
    { doug: [], rosie: [] }
  );
}

async function getPendingAchievements(db: Queryable, viewerUserId: number): Promise<AchievementEvent[]> {
  const result = await db.query<AchievementRow>(
    `
      SELECT
        achievement_events.id,
        achievement_events.event_type AS "eventType",
        achievement_events.user_id AS "userId",
        achievement_events.triggering_user_id AS "triggeringUserId",
        achievement_events.week_start_date::text AS "weekStartDate",
        achievement_events.created_at::text AS "createdAt",
        achievement_events.payload_json AS payload
      FROM achievement_events
      WHERE (
          achievement_events.event_type = 'couple_week_complete'
          OR achievement_events.user_id = $1
        )
        AND NOT EXISTS (
          SELECT 1
          FROM achievement_views
          WHERE achievement_views.achievement_event_id = achievement_events.id
            AND achievement_views.viewer_user_id = $1
        )
      ORDER BY achievement_events.created_at ASC, achievement_events.id ASC;
    `,
    [viewerUserId]
  );

  return result.rows;
}

function getUser(users: AppUser[], slug: UserSlug): AppUser {
  const user = users.find((entry) => entry.slug === slug);

  if (!user) {
    throw notFound("user_not_found", "Tracker user was not found.");
  }

  return user;
}
