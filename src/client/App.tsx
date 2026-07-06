import { useCallback, useEffect, useMemo, useState } from "react";
import { getState, logWorkout, markSeen, removeWorkout, type ClientApiError } from "./api";
import { BottomNav } from "./components/BottomNav";
import { AchievementOverlay } from "./components/AchievementOverlay";
import { CoupleTracker } from "./components/CoupleTracker";
import { PersonalTracker } from "./components/PersonalTracker";
import { useFeedback } from "./useFeedback";
import type { AchievementEvent, TrackerState, UserSlug, ViewerSlug } from "../shared/types.js";

const validRoutes = new Set<ViewerSlug>(["doug", "rosie", "couple"]);

export function App() {
  const [route, setRoute] = useState<ViewerSlug>(() => getRouteFromPath());
  const [state, setState] = useState<TrackerState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [achievementQueue, setAchievementQueue] = useState<AchievementEvent[]>([]);
  const [activeAchievement, setActiveAchievement] = useState<AchievementEvent | null>(null);
  const feedback = useFeedback();

  const viewerUser = route === "couple" ? null : route;

  const enqueueAchievements = useCallback((events: AchievementEvent[]) => {
    setAchievementQueue((current) => {
      const known = new Set(current.map((event) => event.id));
      const additions = events.filter((event) => !known.has(event.id));
      return [...current, ...additions];
    });
  }, []);

  const refresh = useCallback(async (viewer: ViewerSlug) => {
    setError(null);
    const nextState = await getState(viewer);
    setState(nextState);
    enqueueAchievements(nextState.pendingAchievements);
  }, [enqueueAchievements]);

  useEffect(() => {
    const onPopState = () => setRoute(getRouteFromPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    setBusy(true);
    refresh(route)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Unable to load tracker."))
      .finally(() => setBusy(false));
  }, [refresh, route]);

  useEffect(() => {
    if (!activeAchievement && achievementQueue.length > 0) {
      const [next, ...remaining] = achievementQueue;
      setActiveAchievement(next);
      setAchievementQueue(remaining);
      void feedback.play(next.eventType === "couple_week_complete" ? "complete" : "success");
      feedback.vibrate(next.eventType === "couple_week_complete" ? [80, 60, 120] : 60);
    }
  }, [activeAchievement, achievementQueue, feedback]);

  const navigate = useCallback((viewer: ViewerSlug) => {
    window.history.pushState({}, "", `/${viewer}`);
    setRoute(viewer);
  }, []);

  const handleLog = useCallback(
    async (date: string, source: "hold" | "backfill") => {
      if (!viewerUser) {
        return;
      }

      setBusy(true);
      setError(null);
      try {
        await feedback.unlock();
        const result = await logWorkout(viewerUser, date, source);
        setState(result.state);
        enqueueAchievements(result.state.pendingAchievements);
        void feedback.play(result.created ? "success" : "tap");
        feedback.vibrate(result.created ? 50 : 20);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not log workout.");
      } finally {
        setBusy(false);
      }
    },
    [enqueueAchievements, feedback, viewerUser]
  );

  const handleRemove = useCallback(
    async (date: string) => {
      if (!viewerUser) {
        return;
      }

      setBusy(true);
      setError(null);
      try {
        const nextState = await removeWorkout(viewerUser, date);
        setState(nextState);
        void feedback.play("tap");
        feedback.vibrate(25);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not remove workout.");
      } finally {
        setBusy(false);
      }
    },
    [feedback, viewerUser]
  );

  const dismissAchievement = useCallback(async () => {
    if (!activeAchievement || !viewerUser) {
      setActiveAchievement(null);
      return;
    }

    try {
      await markSeen(viewerUser, activeAchievement.id);
      setActiveAchievement(null);
      await refresh(viewerUser);
    } catch {
      setActiveAchievement(null);
    }
  }, [activeAchievement, refresh, viewerUser]);

  const content = useMemo(() => {
    if (error) {
      return <SetupState message={error} onRetry={() => void refresh(route)} />;
    }

    if (!state) {
      return <LoadingState />;
    }

    if (route === "couple") {
      return <CoupleTracker state={state} muted={feedback.muted} onMuteChange={feedback.setMuted} onNavigate={navigate} />;
    }

    return (
      <PersonalTracker
        state={state}
        userSlug={route}
        muted={feedback.muted}
        busy={busy}
        onMuteChange={feedback.setMuted}
        onNavigate={navigate}
        onLog={handleLog}
        onRemove={handleRemove}
      />
    );
  }, [busy, error, feedback.muted, feedback.setMuted, handleLog, handleRemove, navigate, refresh, route, state]);

  return (
    <div className="app-shell">
      {content}
      <BottomNav current={route} onNavigate={navigate} />
      {activeAchievement && state && viewerUser ? (
        <AchievementOverlay achievement={activeAchievement} state={state} viewer={viewerUser} onDismiss={dismissAchievement} />
      ) : null}
    </div>
  );
}

function LoadingState() {
  return (
    <main className="screen centered-state">
      <div className="loader-ring" />
      <h1>Loading tracker</h1>
      <p>Pulling the week together.</p>
    </main>
  );
}

function SetupState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main className="screen centered-state">
      <h1>Database needed</h1>
      <p>{message}</p>
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </main>
  );
}

function getRouteFromPath(): ViewerSlug {
  const segment = window.location.pathname.split("/").filter(Boolean)[0] as ViewerSlug | undefined;
  return segment && validRoutes.has(segment) ? segment : "doug";
}
