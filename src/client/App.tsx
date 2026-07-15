import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getState, logWorkout, markSeen, removeWorkout } from "./api";
import { mergeAchievementQueue } from "./achievementQueue";
import { getPriorityCoupleClaim, sortTriggeredAchievements } from "./coupleClaim";
import { getHoldHapticPattern, type HoldHapticMilestone } from "./holdGesture";
import { AchievementOverlay } from "./components/AchievementOverlay";
import { BottomNav } from "./components/BottomNav";
import { CoupleClaimCard } from "./components/CoupleClaimCard";
import { CoupleTracker } from "./components/CoupleTracker";
import { DistortionShockwave } from "./components/DistortionShockwave";
import { PersonalTracker } from "./components/PersonalTracker";
import { RewardExplosionCanvas } from "./components/RewardExplosionCanvas";
import { SoundLab } from "./components/SoundLab";
import {
  defaultRewardExplosionControls,
  getExplosionKindForReward,
  resolveRewardEffectDuration,
  type RewardEffectMetrics,
  type RewardExplosionControls,
  type RewardExplosionKind,
  type RewardExplosionOrigin,
  type RewardExplosionRequest,
  type RewardExplosionTiming
} from "./rewardExplosion";
import { getAchievementFeedback, getFeedbackDurationMs, getWorkoutFeedback } from "./rewardFeedback";
import { isTrackerRoute, validAppRoutes, type AppRoute } from "./routes";
import { useFeedback } from "./useFeedback";
import type { AchievementEvent, TrackerState, UserSlug, ViewerSlug } from "../shared/types.js";

interface ActiveAchievement {
  achievement: AchievementEvent;
  durationMs: number;
  source: "immediate" | "claim" | "pending";
}

const initialEffectMetrics: RewardEffectMetrics = {
  active: false,
  activeParticles: 0,
  averageFrameMs: 0,
  fps: 0,
  quality: defaultRewardExplosionControls.quality,
  durationMs: 0,
  durationSource: "fixed",
  progress: 0,
  performanceGuardActive: false,
  spawnScale: 1
};

export function App() {
  const [route, setRoute] = useState<AppRoute>(() => getRouteFromPath());
  const [state, setState] = useState<TrackerState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rewardClass, setRewardClass] = useState("reward-none");
  const [rewardDurationMs, setRewardDurationMs] = useState(() => getFeedbackDurationMs("tap"));
  const [rewardOrigin, setRewardOrigin] = useState<RewardExplosionOrigin | null>(null);
  const [explosionRequest, setExplosionRequest] = useState<RewardExplosionRequest | null>(null);
  const [effectMetrics, setEffectMetrics] = useState<RewardEffectMetrics>(initialEffectMetrics);
  const [achievementQueue, setAchievementQueue] = useState<AchievementEvent[]>([]);
  const [activeAchievement, setActiveAchievement] = useState<ActiveAchievement | null>(null);
  const [achievementStarting, setAchievementStarting] = useState(false);
  const [pendingClaim, setPendingClaim] = useState<AchievementEvent | null>(null);
  const [claiming, setClaiming] = useState(false);
  const activeAchievementRef = useRef<AchievementEvent | null>(null);
  const immediateAchievementIdsRef = useRef(new Set<number>());
  const rewardTimerRef = useRef(0);
  const requestIdRef = useRef(0);
  const {
    muted,
    setMuted,
    unlocked,
    unlock,
    play,
    stop,
    vibrate,
    vibrationSupported,
    lastVibrationResult
  } = useFeedback();

  const viewerUser: UserSlug | null = route === "doug" || route === "rosie" ? route : null;

  useEffect(() => {
    activeAchievementRef.current = activeAchievement?.achievement ?? null;
  }, [activeAchievement]);

  useEffect(() => {
    return () => window.clearTimeout(rewardTimerRef.current);
  }, []);

  const enqueueAchievements = useCallback((events: AchievementEvent[]) => {
    setAchievementQueue((current) => mergeAchievementQueue(current, events, activeAchievementRef.current));
  }, []);

  const triggerRewardExplosion = useCallback(
    (
      kind: RewardExplosionKind,
      origin: RewardExplosionOrigin | null = rewardOrigin,
      controls: RewardExplosionControls = defaultRewardExplosionControls,
      timing: RewardExplosionTiming = {}
    ) => {
      requestIdRef.current += 1;
      setExplosionRequest({
        id: Date.now() + requestIdRef.current,
        kind,
        origin,
        controls,
        ...timing
      });
    },
    [rewardOrigin]
  );

  const stagePendingAchievements = useCallback(
    (nextState: TrackerState) => {
      const claim = getPriorityCoupleClaim(nextState.pendingAchievements);
      setPendingClaim(claim);
      if (!claim) {
        enqueueAchievements(nextState.pendingAchievements.filter((event) => event.eventType !== "couple_week_complete"));
      }
    },
    [enqueueAchievements]
  );

  const refresh = useCallback(
    async (viewer: ViewerSlug) => {
      setError(null);
      const nextState = await getState(viewer);
      setState(nextState);
      if (viewer === "doug" || viewer === "rosie") {
        stagePendingAchievements(nextState);
      }
    },
    [stagePendingAchievements]
  );

  useEffect(() => {
    const onPopState = () => setRoute(getRouteFromPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    window.clearTimeout(rewardTimerRef.current);
    stop();
    setExplosionRequest(null);
    setAchievementQueue([]);
    immediateAchievementIdsRef.current.clear();
    setActiveAchievement(null);
    setPendingClaim(null);
    setClaiming(false);

    if (!isTrackerRoute(route)) {
      setBusy(false);
      setError(null);
      return;
    }

    setState(null);
    setBusy(true);
    refresh(route)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Unable to load tracker."))
      .finally(() => setBusy(false));
  }, [refresh, route, stop]);

  const launchAchievement = useCallback(
    async (achievement: AchievementEvent, source: ActiveAchievement["source"]) => {
      const feedback = getAchievementFeedback(achievement.eventType);
      const playback = await play(feedback.sound);
      const kind: RewardExplosionKind = achievement.eventType === "couple_week_complete" ? "couple" : "weekly";
      const duration = resolveRewardEffectDuration(kind, playback.durationMs, playback.durationSource);
      setActiveAchievement({ achievement, durationMs: duration.durationMs, source });
      vibrate(feedback.haptic);
      triggerRewardExplosion(kind, null, defaultRewardExplosionControls, {
        audioDurationMs: playback.durationMs,
        durationSource: playback.durationSource
      });
    },
    [play, triggerRewardExplosion, vibrate]
  );

  useEffect(() => {
    if (activeAchievement || achievementStarting || pendingClaim || achievementQueue.length === 0) {
      return;
    }

    const [next, ...remaining] = achievementQueue;
    const source = immediateAchievementIdsRef.current.has(next.id) ? "immediate" : "pending";
    immediateAchievementIdsRef.current.delete(next.id);
    setAchievementQueue(remaining);
    setAchievementStarting(true);
    void launchAchievement(next, source)
      .catch(() => setError("The reward could not start. Try it again from the tracker."))
      .finally(() => setAchievementStarting(false));
  }, [activeAchievement, achievementQueue, achievementStarting, launchAchievement, pendingClaim]);

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
    (milestone: HoldHapticMilestone) => {
      vibrate(getHoldHapticPattern(milestone));
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
        const viewerId = result.state.users.find((user) => user.slug === viewerUser)?.id ?? null;
        const actionAchievements = sortTriggeredAchievements(
          result.state.pendingAchievements.filter((event) => viewerId !== null && event.triggeringUserId === viewerId)
        );
        for (const achievement of actionAchievements) {
          immediateAchievementIdsRef.current.add(achievement.id);
        }
        enqueueAchievements(actionAchievements);

        const awayClaim = getPriorityCoupleClaim(
          result.state.pendingAchievements.filter((event) => event.triggeringUserId !== viewerId)
        );
        if (awayClaim) {
          setPendingClaim(awayClaim);
        }

        const nextFeedback = getWorkoutFeedback({
          countAfter: result.state.counts[viewerUser].week,
          created: result.created,
          source
        });
        const nextAchievementFeedback = actionAchievements[0] ? getAchievementFeedback(actionAchievements[0].eventType) : null;
        setRewardClass(nextFeedback.rewardClass);
        setRewardDurationMs(nextAchievementFeedback?.durationMs ?? nextFeedback.durationMs);
        window.clearTimeout(rewardTimerRef.current);
        rewardTimerRef.current = window.setTimeout(
          () => setRewardClass("reward-none"),
          nextAchievementFeedback?.durationMs ?? nextFeedback.durationMs
        );

        if (actionAchievements.length === 0) {
          const playback = await play(nextFeedback.sound);
          vibrate(nextFeedback.haptic);
          const explosionKind = getExplosionKindForReward({
            countAfter: result.state.counts[viewerUser].week,
            created: result.created
          });
          if (explosionKind) {
            triggerRewardExplosion(explosionKind, undefined, defaultRewardExplosionControls, {
              audioDurationMs: playback.durationMs,
              durationSource: playback.durationSource
            });
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

  const claimCoupleAchievement = useCallback(async () => {
    if (!pendingClaim || claiming) {
      return;
    }

    setClaiming(true);
    setError(null);
    try {
      await launchAchievement(pendingClaim, "claim");
      setPendingClaim(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The couple reward could not start.");
    } finally {
      setClaiming(false);
    }
  }, [claiming, launchAchievement, pendingClaim]);

  const dismissAchievement = useCallback(async () => {
    if (!activeAchievement || !viewerUser) {
      setActiveAchievement(null);
      return;
    }

    const finishedAchievement = activeAchievement;
    stop();
    setExplosionRequest(null);
    activeAchievementRef.current = null;
    setActiveAchievement(null);

    try {
      await markSeen(viewerUser, finishedAchievement.achievement.id);
      setState((current) =>
        current
          ? {
              ...current,
              pendingAchievements: current.pendingAchievements.filter((event) => event.id !== finishedAchievement.achievement.id)
            }
          : current
      );

      if (finishedAchievement.source === "claim" && state) {
        const remaining = state.pendingAchievements.filter((event) => event.id !== finishedAchievement.achievement.id);
        const nextClaim = getPriorityCoupleClaim(remaining);
        setPendingClaim(nextClaim);
        if (!nextClaim) {
          enqueueAchievements(remaining.filter((event) => event.eventType !== "couple_week_complete"));
        }
      }
    } catch {
      setError("The reward played, but its viewed status could not be saved. It may appear again.");
    }
  }, [activeAchievement, enqueueAchievements, state, stop, viewerUser]);

  const content = useMemo(() => {
    if (route === "sound-lab") {
      return (
        <SoundLab
          muted={muted}
          unlocked={unlocked}
          vibrationSupported={vibrationSupported}
          lastVibrationResult={lastVibrationResult}
          effectMetrics={effectMetrics}
          onMuteChange={setMuted}
          onNavigate={navigate}
          onUnlock={() => void unlock()}
          onPlay={play}
          onVibrate={vibrate}
          onExplode={triggerRewardExplosion}
        />
      );
    }

    if (error && !state) {
      return <SetupState message={error} onRetry={() => void refresh(route)} />;
    }

    if (!state) {
      return <LoadingState />;
    }

    if (pendingClaim && viewerUser) {
      return (
        <CoupleClaimCard
          achievement={pendingClaim}
          state={state}
          viewer={viewerUser}
          claiming={claiming}
          onClaim={() => void claimCoupleAchievement()}
        />
      );
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
    claimCoupleAchievement,
    claiming,
    effectMetrics,
    error,
    handleLog,
    handleRemove,
    lastVibrationResult,
    muted,
    navigate,
    pendingClaim,
    play,
    playHoldCancel,
    playHoldPressurePulse,
    playHoldStart,
    refresh,
    rewardClass,
    rewardDurationMs,
    route,
    setMuted,
    state,
    triggerRewardExplosion,
    unlock,
    unlocked,
    vibrate,
    vibrationSupported,
    viewerUser
  ]);

  return (
    <div
      className={[
        "app-shell",
        rewardClass !== "reward-none" ? rewardClass : "",
        vibrationSupported ? "haptics-supported" : "haptics-fallback"
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="app-surface">
        {content}
      </div>
      {!pendingClaim ? <BottomNav current={route} onNavigate={navigate} /> : null}
      {activeAchievement && state && viewerUser ? (
        <AchievementOverlay
          achievement={activeAchievement.achievement}
          state={state}
          viewer={viewerUser}
          durationMs={activeAchievement.durationMs}
          onDismiss={dismissAchievement}
        />
      ) : null}
      <RewardExplosionCanvas
        request={explosionRequest}
        onMetrics={route === "sound-lab" ? setEffectMetrics : undefined}
        onComplete={() => setExplosionRequest(null)}
      />
      <DistortionShockwave request={explosionRequest} />
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
