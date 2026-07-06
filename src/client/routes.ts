import type { ViewerSlug } from "../shared/types.js";

export type AppRoute = ViewerSlug | "sound-lab";

export const validAppRoutes = new Set<AppRoute>(["doug", "rosie", "couple", "sound-lab"]);

export function isTrackerRoute(route: AppRoute): route is ViewerSlug {
  return route !== "sound-lab";
}
