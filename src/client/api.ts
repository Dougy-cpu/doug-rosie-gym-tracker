import type { TrackerState, UserSlug, ViewerSlug } from "../shared/types.js";

interface LogWorkoutResponse {
  created: boolean;
  state: TrackerState;
}

export class ClientApiError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export async function getState(viewer: ViewerSlug): Promise<TrackerState> {
  return request<TrackerState>(`/api/state/${viewer}`);
}

export async function logWorkout(
  slug: UserSlug,
  date: string,
  source: "hold" | "backfill" = "hold"
): Promise<LogWorkoutResponse> {
  return request<LogWorkoutResponse>(`/api/users/${slug}/workouts`, {
    method: "POST",
    body: JSON.stringify({ date, source })
  });
}

export async function removeWorkout(slug: UserSlug, date: string): Promise<TrackerState> {
  return request<TrackerState>(`/api/users/${slug}/workouts/${date}`, {
    method: "DELETE"
  });
}

export async function markSeen(slug: UserSlug, achievementId: number): Promise<void> {
  await request<void>(`/api/achievements/${achievementId}/seen`, {
    method: "POST",
    body: JSON.stringify({ viewerSlug: slug })
  });
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers
    }
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { code?: string; message?: string } | null;
    throw new ClientApiError(payload?.code ?? "request_failed", payload?.message ?? "Request failed.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
