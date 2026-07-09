import { useCallback, useEffect, useMemo, useState } from "react";
import { getState, logWorkout, markSeen, removeWorkout, type ClientApiError } from "./api";
import { mergeAchievementQueue } from "./achievementQueue";
import { BottomNav } from "./components/BottomNav";
import { AchievementOverlay } from "./components/AchievementOverlay";
import { CoupleTracker } from "./components/CoupleTracker";
import { PersonalTracker } from "./components/PersonalTracker";
import { RewardExplosionCanvas } from "./components/RewardExplosionCanvas";
import { SoundLab } from "./components/SoundLab";
import {
  defaultRewardExplosionControls,
  getExplosionKindForReward,
  type RewardExplosionKind,
  type RewardExplosionOrigin,
  type RewardExplosionRequest,
  type RewardExplosionControls
} from "./rewardExplosion";
import { getAchievementFeedback, getFeedbackDurationMs, getWorkoutFeedback } from "./rewardFeedback";
import { isTrackerRoute, validAppRoutes, type AppRoute } from "./routes";
import { useFeedback } from "./useFeedback";
import type { AchievementEvent, TrackerState, UserSlug, ViewerSlug } from "../shared/types.js";

export function App() {
  const [route, setRoute] = useState<AppRoute>(() => getRouteFromPath());
  const [state, setState] = useState<TrackerState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rewardClass, setRewardClass] = useState("reward-none");
  const [rewardDurationMs, setRewardDurationMs] = useState(() => getFeedbackDurationMs("tap"));
  const [rewardOrigin, setRewardOrigin] = useState<RewardExplosionOrigin | null>(null);
  const [explosionRequest, setExplosionRequest] = useState<RewardExplosionRequest | null>(null);
  const [achievementQueue, setAchievementQueue] = useState<AchievementEvent[]>([]);
  const [activeAchievement, setActiveAchievement] = useState<AchievementEvent | null>(null);
  const { muted, setMuted, unlocked, unlock, play, vibrate } = useFeedback();

  const viewerUser: UserSlug | null = route === "doug" || route === "rosie" ? route : null;

  const enqueueAchievements = useCallback((events: AchievementEvent[]) => {
    setAchievementQueue((current) => mergeAchievementQueue(current, events, activeAchievement));
  }, [activeAchievement]);

  const triggerRewardExplosion = useCallback(
    (kind: RewardExplosionKind, origin: RewardExplosionOrigin | null = rewardOrigin, controls: RewardExplosionControls = defaultRewardExplosionControls) => {
      setExplosionRequest({
        id: Date.now(),
        kind,
        origin,
        controls
      });
    },
    [rewardOrigin]
  );

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
    if (!isTrackerRoute(route)) {
      setBusy(false);
      setError(null);
      return;
    }

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
      const nextFeedback = getAchievementFeedback(next.eventType);
      void play(nextFeedback.sound);
      vibrate(nextFeedback.haptic);
      triggerRewardExplosion(next.eventType === "couple_week_complete" ? "couple" : "weekly", null);
    }
  }, [activeAchievement, achievementQueue, play, triggerRewardExplosion, vibrate]);

  const navigate = useCallback((viewer: AppRoute) => {
    window.history.pushState({}, "", `/${viewer}`);
    setRoute(viewer);
  }, []);

  const playHoldStart = useCallback(() => {
    void play("hold-charge");
    vibrate(8);
  }, [play, vibrate]);

  const playHoldCancel = useCallback(() => {
    void play("hold-cancel");
  }, [play]);

  const playHoldPressurePulse = useCallback(
    (milestone: "pressure-build" | "unstable") => {
      vibrate(milestone === "pressure-build" ? 14 : [28, 25, 42]);
    },
    [vibrate]
  );

  const handleLog = useCallback(
    async (date: string, source: "hold" | "backfill") => {
      if (!viewerUser) {
        return;
      }

      setBusy(true);
      setError(null);
      try {
        await unlock();
        const result = await logWorkout(viewerUser, date, source);
        setState(result.state);
        enqueueAchievements(result.state.pendingAchievements);
        const nextFeedback = getWorkoutFeedback({
          countAfter: result.state.counts[viewerUser].week,
          created: result.created,
          source
        });
        const pendingAchievementFeedback = result.state.pendingAchievements[0]
          ? getAchievementFeedback(result.state.pendingAchievements[0].eventType)
          : null;
        const explosionKind = getExplosionKindForReward({
          countAfter: result.state.counts[viewerUser].week,
          created: result.created,
          achievement: result.state.pendingAchievements[0] ?? null
        });
        setRewardClass(nextFeedback.rewardClass);
        setRewardDurationMs(pendingAchievementFeedback?.durationMs ?? nextFeedback.durationMs);
        window.setTimeout(() => setRewardClass("reward-none"), pendingAchievementFeedback?.durationMs ?? nextFeedback.durationMs);

        if (!pendingAchievementFeedback) {
          void play(nextFeedback.sound);
          vibrate(nextFeedback.haptic);
          if (explosionKind) {
            triggerRewardExplosion(explosionKind);
          }
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not log workout.");
      } finally {
        setBusy(false);
      }
    },
    [enqueueAchievements, play, triggerRewardExplosion, unlock, vibrate, viewerUser]
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
        void play("tap");
        vibrate(25);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not remove workout.");
      } finally {
        setBusy(false);
      }
    },
    [play, vibrate, viewerUser]
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
    if (route === "sound-lab") {
      return (
        <SoundLab
          muted={muted}
          unlocked={unlocked}
          onMuteChange={setMuted}
          onNavigate={navigate}
          onUnlock={() => void unlock()}
          onPlay={(sound) => void play(sound)}
          onVibrate={vibrate}
          onExplode={triggerRewardExplosion}
        />
      );
    }

    if (error) {
      return <SetupState message={error} onRetry={() => void refresh(route)} />;
    }

    if (!state) {
      return <LoadingState />;
    }

    if (route === "couple") {
      return <CoupleTracker state={state} muted={muted} onMuteChange={setMuted} onNavigate={navigate} />;
    }

    return (
      <PersonalTracker
        state={state}
        userSlug={route}
        muted={muted}
        busy={busy}
        rewardClass={rewardClass}
        rewardDurationMs={rewardDurationMs}
        onMuteChange={setMuted}
        onNavigate={navigate}
        onLog={handleLog}
        onRemove={handleRemove}
        onHoldStart={playHoldStart}
        onHoldCancel={playHoldCancel}
        onHoldPressurePulse={playHoldPressurePulse}
        onRewardOriginChange={setRewardOrigin}
      />
    );
  }, [
    busy,
    error,
    handleLog,
    handleRemove,
    navigate,
    playHoldCancel,
    playHoldPressurePulse,
    playHoldStart,
    refresh,
    rewardClass,
    rewardDurationMs,
    route,
    muted,
    play,
    setMuted,
    state,
    unlock,
    unlocked,
    vibrate
  ]);

  return (
    <div className={["app-shell", rewardClass !== "reward-none" ? rewardClass : ""].filter(Boolean).join(" ")}>
      {content}
      <BottomNav current={route} onNavigate={navigate} />
      {activeAchievement && state && viewerUser ? (
        <AchievementOverlay achievement={activeAchievement} state={state} viewer={viewerUser} onDismiss={dismissAchievement} />
      ) : null}
      <RewardExplosionCanvas request={explosionRequest} onComplete={() => setExplosionRequest(null)} />
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

function getRouteFromPath(): AppRoute {
  const segment = window.location.pathname.split("/").filter(Boolean)[0] as AppRoute | undefined;
  return segment && validAppRoutes.has(segment) ? segment : "doug";
}
