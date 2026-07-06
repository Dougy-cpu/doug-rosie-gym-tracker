import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type ErrorRequestHandler } from "express";
import type { UserSlug } from "../shared/types.js";
import { ApiError, badRequest } from "./errors.js";
import { buildTrackerState, deleteWorkout, isUserSlug, logWorkout, markAchievementSeen, parseViewer } from "./state.js";

const port = Number(process.env.PORT ?? 5000);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const isCompiledServer = dirname.includes(`${path.sep}dist${path.sep}`);
const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.npm_lifecycle_event === "start" ||
  process.env.npm_lifecycle_event === "replit" ||
  isCompiledServer;
const app = express();

app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/state/:viewer", async (request, response, next) => {
  try {
    const viewer = parseViewer(request.params.viewer);
    response.json(await buildTrackerState(viewer));
  } catch (error) {
    next(error);
  }
});

app.post("/api/users/:slug/workouts", async (request, response, next) => {
  try {
    const slug = parseUserSlug(request.params.slug);
    const { date, source, note } = request.body as { date?: string; source?: string; note?: string | null };
    const result = await logWorkout(slug, date, source, note ?? null);
    response.status(result.created ? 201 : 200).json(result);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/users/:slug/workouts/:date", async (request, response, next) => {
  try {
    const slug = parseUserSlug(request.params.slug);
    response.json(await deleteWorkout(slug, request.params.date));
  } catch (error) {
    next(error);
  }
});

app.post("/api/achievements/:id/seen", async (request, response, next) => {
  try {
    const slug = parseUserSlug((request.body as { viewerSlug?: string }).viewerSlug ?? "");
    const achievementId = Number(request.params.id);

    if (!Number.isInteger(achievementId) || achievementId <= 0) {
      throw badRequest("invalid_achievement", "Achievement id is invalid.");
    }

    await markAchievementSeen(slug, achievementId);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

if (isProduction) {
  const clientDist = path.resolve(dirname, "../../client");
  app.use(express.static(clientDist));
  app.get("*", (_request, response) => {
    response.sendFile(path.join(clientDist, "index.html"));
  });
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa"
  });
  app.use(vite.middlewares);
}

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ApiError) {
    response.status(error.status).json({
      code: error.code,
      message: error.message
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    code: "internal_error",
    message: "Something went wrong."
  });
};

app.use(errorHandler);

app.listen(port, "0.0.0.0", () => {
  console.log(`Doug & Rosie Gym Tracker listening on port ${port}`);
});

function parseUserSlug(value: string): UserSlug {
  if (isUserSlug(value)) {
    return value;
  }

  throw badRequest("invalid_user", "User must be doug or rosie.");
}
