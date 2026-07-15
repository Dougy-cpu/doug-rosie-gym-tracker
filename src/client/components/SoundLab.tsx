import { Activity, BadgeCheck, Bolt, Flame, Gauge, HeartPulse, RadioTower, ShieldCheck, SlidersHorizontal, Sparkles, Vibrate, Zap } from "lucide-react";
import type { CSSProperties, MouseEvent, ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AchievementEvent, TrackerState } from "../../shared/types.js";
import type { AppRoute } from "../routes";
import {
  defaultRewardExplosionControls,
  getOriginFromElement,
  resolveRewardEffectDuration,
  type FlashIntensity,
  type ParticleIntensity,
  type RewardEffectMetrics,
  type RewardEffectQuality,
  type RewardExplosionControls,
  type RewardExplosionKind,
  type RewardExplosionOrigin,
  type RewardExplosionTiming,
  type RewardIntensityLevel,
  type ScreenShakeLevel
} from "../rewardExplosion";
import {
  getAchievementFeedback,
  getFeedbackDurationMs,
  getFeedbackSoundEvent,
  getRewardSoundCandidates,
  getWorkoutFeedback,
  resolveFeedbackSoundAsset,
  type FeedbackSound,
  type HapticPattern,
  type ResolvedFeedbackSoundAsset,
  type RewardSoundAssetCandidate
} from "../rewardFeedback";
import { MuteToggle } from "./MuteToggle";
import { AchievementOverlay } from "./AchievementOverlay";
import { CoupleClaimCard } from "./CoupleClaimCard";
import { getHoldHapticPattern, HOLD_TO_CONFIRM_MS, holdHapticMilestones } from "../holdGesture";
import { getHoldStage, type HoldStage } from "./HoldToLogTile";
import { CrackOverlay, SparkLeak } from "./CrackOverlay";
import { ShatterBurst } from "./ShatterBurst";
import { ProgressSegments } from "./ProgressSegments";
import type { FeedbackPlaybackResult } from "../useFeedback";

interface SoundLabProps {
  muted: boolean;
  unlocked: boolean;
  vibrationSupported: boolean;
  lastVibrationResult: boolean | null;
  effectMetrics: RewardEffectMetrics;
  onMuteChange: (muted: boolean) => void;
  onNavigate: (viewer: AppRoute) => void;
  onUnlock: () => void;
  onPlay: (sound: FeedbackSound) => Promise<FeedbackPlaybackResult>;
  onVibrate: (pattern: HapticPattern) => boolean;
  onExplode: (
    kind: RewardExplosionKind,
    origin?: RewardExplosionOrigin | null,
    controls?: RewardExplosionControls,
    timing?: RewardExplosionTiming
  ) => void;
}

const soundTests: Array<{
  label: string;
  detail: string;
  sound: FeedbackSound;
  haptic: HapticPattern;
  icon: ReactElement;
}> = [
  { label: "Play level-up-track.mp3", detail: "General fallback track", sound: "level-up-track", haptic: 20, icon: <RadioTower /> },
  { label: "Play daily workout sound", detail: "Normal daily workout", sound: "daily", haptic: getWorkoutFeedback({ countAfter: 0, created: true }).haptic, icon: <Bolt /> },
  {
    label: "Play calendar backfill sound",
    detail: "Backfill locked",
    sound: "backfill",
    haptic: getWorkoutFeedback({ countAfter: 0, created: true, source: "backfill" }).haptic,
    icon: <BadgeCheck />
  },
  { label: "Play 1/4 inertia broken sound", detail: "First weekly workout", sound: "first", haptic: getWorkoutFeedback({ countAfter: 1, created: true }).haptic, icon: <Zap /> },
  {
    label: "Play 2/4 momentum sound",
    detail: "Second weekly workout",
    sound: "momentum",
    haptic: getWorkoutFeedback({ countAfter: 2, created: true }).haptic,
    icon: <Activity />
  },
  { label: "Play 3/4 target in range sound", detail: "Third weekly workout", sound: "one-more", haptic: getWorkoutFeedback({ countAfter: 3, created: true }).haptic, icon: <Flame /> },
  {
    label: "Play 4/4 weekly complete sound",
    detail: "Workout milestone fallback path",
    sound: "weekly-complete",
    haptic: getWorkoutFeedback({ countAfter: 4, created: true }).haptic,
    icon: <BadgeCheck />
  },
  {
    label: "Play 4/4 individual goal sound",
    detail: "Individual achievement",
    sound: "individual-complete",
    haptic: getAchievementFeedback("individual_week_complete").haptic,
    icon: <ShieldCheck />
  },
  {
    label: "Play 8/8 couple goal sound",
    detail: "Couple achievement",
    sound: "couple-complete",
    haptic: getAchievementFeedback("couple_week_complete").haptic,
    icon: <ShieldCheck />
  }
];

type AssetStatus = "checking" | "loaded" | "missing";
interface AssetResolutionStatus {
  status: AssetStatus;
  asset: ResolvedFeedbackSoundAsset | null;
}

type AssetStatusMap = Partial<Record<FeedbackSound, AssetResolutionStatus>>;
const holdConstantLabel = "HOLD_TO_CONFIRM_MS = 3000";
const testedSounds = Array.from(new Set(soundTests.map((test) => test.sound)));
const qualityOptions: Array<{ label: string; value: RewardEffectQuality }> = [
  { label: "Low", value: "low" },
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" },
  { label: "Ridiculous", value: "ridiculous" }
];
const intensityOptions: Array<{ label: string; value: RewardIntensityLevel }> = [
  { label: "Off", value: "off" },
  ...qualityOptions
];

export function SoundLab({
  muted,
  unlocked,
  vibrationSupported,
  lastVibrationResult,
  effectMetrics,
  onMuteChange,
  onNavigate,
  onUnlock,
  onPlay,
  onVibrate,
  onExplode
}: SoundLabProps) {
  const [demoReward, setDemoReward] = useState("reward-none");
  const [demoRewardDurationMs, setDemoRewardDurationMs] = useState(() => getFeedbackDurationMs("daily"));
  const [overlay, setOverlay] = useState<{ kind: "individual" | "couple"; durationMs: number } | null>(null);
  const [claimPreview, setClaimPreview] = useState(false);
  const [lastPlayback, setLastPlayback] = useState<FeedbackPlaybackResult | null>(null);
  const [progressiveHapticsRunning, setProgressiveHapticsRunning] = useState(false);
  const holdPreviewRafRef = useRef<number | null>(null);
  const previewResetTimerRef = useRef<number | null>(null);
  const lockTimersRef = useRef<number[]>([]);
  const ruptureSurfaceRef = useRef<HTMLElement | null>(null);
  const [assetStatuses, setAssetStatuses] = useState<AssetStatusMap>(() => createInitialAssetStatuses());
  const [holdPreviewStage, setHoldPreviewStage] = useState<HoldStage>("idle");
  const [mechanicalLockCount, setMechanicalLockCount] = useState(3);
  const [quality, setQuality] = useState<RewardEffectQuality>(defaultRewardExplosionControls.quality);
  const [particleIntensity, setParticleIntensity] = useState<ParticleIntensity>(defaultRewardExplosionControls.particleIntensity);
  const [shardIntensity, setShardIntensity] = useState<RewardIntensityLevel>(defaultRewardExplosionControls.shardIntensity);
  const [fireworkIntensity, setFireworkIntensity] = useState<RewardIntensityLevel>(defaultRewardExplosionControls.fireworkIntensity);
  const [smokeIntensity, setSmokeIntensity] = useState<RewardIntensityLevel>(defaultRewardExplosionControls.smokeIntensity);
  const [shockwaveIntensity, setShockwaveIntensity] = useState<RewardIntensityLevel>(defaultRewardExplosionControls.shockwaveIntensity);
  const [distortionIntensity, setDistortionIntensity] = useState<RewardIntensityLevel>(defaultRewardExplosionControls.distortionIntensity);
  const [screenShake, setScreenShake] = useState<ScreenShakeLevel>(defaultRewardExplosionControls.screenShake);
  const [flashIntensity, setFlashIntensity] = useState<FlashIntensity>(defaultRewardExplosionControls.flashIntensity);
  const [showTriggerPoint, setShowTriggerPoint] = useState(defaultRewardExplosionControls.showTriggerPoint);
  const [reducedMotionPreview, setReducedMotionPreview] = useState(defaultRewardExplosionControls.reducedMotionPreview);

  const explosionControls = useMemo<RewardExplosionControls>(
    () => ({
      quality,
      particleIntensity,
      shardIntensity,
      fireworkIntensity,
      smokeIntensity,
      shockwaveIntensity,
      distortionIntensity,
      screenShake,
      flashIntensity,
      showTriggerPoint,
      reducedMotionPreview
    }),
    [
      distortionIntensity,
      fireworkIntensity,
      flashIntensity,
      particleIntensity,
      quality,
      reducedMotionPreview,
      screenShake,
      shardIntensity,
      shockwaveIntensity,
      showTriggerPoint,
      smokeIntensity
    ]
  );
  const soundResolutionEntries = soundTests.map((test) => {
    const candidates = getRewardSoundCandidates(test.sound);
    const primary = candidates[0] ?? null;
    const resolution = assetStatuses[test.sound];
    const asset = resolution?.asset ?? null;

    return {
      ...test,
      eventName: getFeedbackSoundEvent(test.sound) ?? test.sound,
      expectedPrimaryFile: primary?.sourceFile ?? "synthetic-heavy-impact",
      candidates,
      status: resolution?.status ?? "checking",
      asset
    };
  });
  const missingAssets = soundResolutionEntries.filter((entry) => entry.status === "missing");
  const loadedCount = soundResolutionEntries.filter((entry) => entry.status === "loaded").length;
  const levelUpAsset = getResolvedOrDefaultAsset("level-up-track", assetStatuses);
  const individualAsset = getResolvedOrDefaultAsset("individual-complete", assetStatuses);
  const coupleAsset = getResolvedOrDefaultAsset("couple-complete", assetStatuses);
  const goalFallbackWarnings = [individualAsset, coupleAsset].filter(
    (asset): asset is RewardSoundAssetCandidate | ResolvedFeedbackSoundAsset =>
      asset?.sourceFile === "level-up-track.mp3" && asset.source === "fallback-specific-missing"
  );
  const demoShattering = /reward-(daily|first|momentum|pressure|complete)/.test(demoReward) && !demoReward.includes("hold-preview-building");
  const demoHolding = holdPreviewStage !== "idle" && demoReward.includes("hold-preview-building");

  useEffect(() => {
    let cancelled = false;

    Promise.all(
      testedSounds.map(async (sound) => {
        const asset = await resolveFeedbackSoundAsset(sound);
        return [sound, { status: asset ? "loaded" : "missing", asset }] as const;
      })
    ).then((results) => {
      if (!cancelled) {
        setAssetStatuses(Object.fromEntries(results) as AssetStatusMap);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      for (const timerId of lockTimersRef.current) {
        window.clearTimeout(timerId);
      }
      if (previewResetTimerRef.current !== null) {
        window.clearTimeout(previewResetTimerRef.current);
      }
      if (holdPreviewRafRef.current !== null) {
        window.cancelAnimationFrame(holdPreviewRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const missingAssets = soundResolutionEntries.filter((entry) => entry.status === "missing");
    if (missingAssets.length === 0) {
      return;
    }

    const timerId = window.setTimeout(() => {
      console.warn(`Missing reward audio: ${missingAssets.map((entry) => `${entry.eventName} (${entry.expectedPrimaryFile})`).join(", ")}`);
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [assetStatuses]);

  const setPreviewProgress = (progress: number) => {
    ruptureSurfaceRef.current?.style.setProperty("--hold-progress-ratio", String(progress));
    ruptureSurfaceRef.current?.style.setProperty("--hold-progress-percent", `${Math.round(progress * 100)}%`);
    const nextStage = getHoldStage(progress, progress > 0);
    setHoldPreviewStage((current) => (current === nextStage ? current : nextStage));
  };

  const resetHoldPreview = () => {
    if (holdPreviewRafRef.current !== null) {
      window.cancelAnimationFrame(holdPreviewRafRef.current);
      holdPreviewRafRef.current = null;
    }
    if (previewResetTimerRef.current !== null) {
      window.clearTimeout(previewResetTimerRef.current);
      previewResetTimerRef.current = null;
    }
    setDemoReward("reward-none");
    setProgressiveHapticsRunning(false);
    setPreviewProgress(0);
  };

  const previewHold = (progress: number, durationMs = 1300, rewardClass = "reward-daily") => {
    resetHoldPreview();
    setPreviewProgress(progress);
    setDemoReward(`reward-hold-preview ${rewardClass}`);
    setDemoRewardDurationMs(durationMs);
    previewResetTimerRef.current = window.setTimeout(resetHoldPreview, durationMs);
  };

  const triggerExplosion = async (
    event: MouseEvent<HTMLButtonElement>,
    kind: RewardExplosionKind,
    options: { sound?: FeedbackSound; haptic?: HapticPattern; forceControls?: Partial<RewardExplosionControls>; overlay?: "individual" | "couple" } = {}
  ) => {
    const controls = { ...explosionControls, ...options.forceControls };
    const origin = getOriginFromElement(event.currentTarget);
    let playback: FeedbackPlaybackResult | null = null;
    if (options.sound) {
      playback = await onPlay(options.sound);
      setLastPlayback(playback);
    }

    onExplode(kind, origin, controls, playback ? { audioDurationMs: playback.durationMs, durationSource: playback.durationSource } : undefined);

    if (options.haptic) {
      onVibrate(options.haptic);
    }

    if (options.overlay) {
      const effectDuration = resolveRewardEffectDuration(kind, playback?.durationMs, playback?.durationSource);
      setOverlay({
        kind: options.overlay,
        durationMs: effectDuration.durationMs
      });
    }
  };

  const runHoldPreview = (event: MouseEvent<HTMLButtonElement>, stopAt: number) => {
    resetHoldPreview();
    const origin = getOriginFromElement(ruptureSurfaceRef.current) ?? getOriginFromElement(event.currentTarget);
    const startedAt = performance.now();
    const firedMilestones = new Set<string>();
    setDemoReward("reward-hold-preview hold-preview-building");
    setDemoRewardDurationMs(HOLD_TO_CONFIRM_MS);
    setProgressiveHapticsRunning(true);
    void onPlay("hold-charge");

    const frame = (now: number) => {
      const progress = Math.min(stopAt, (now - startedAt) / HOLD_TO_CONFIRM_MS);
      setPreviewProgress(progress);
      for (const milestone of holdHapticMilestones) {
        if (progress >= milestone.progress && !firedMilestones.has(milestone.milestone)) {
          firedMilestones.add(milestone.milestone);
          onVibrate(getHoldHapticPattern(milestone.milestone));
        }
      }

      if (progress < stopAt) {
        holdPreviewRafRef.current = window.requestAnimationFrame(frame);
        return;
      }

      holdPreviewRafRef.current = null;
      if (stopAt < 1) {
        setDemoReward("reward-hold-cancelled");
        setProgressiveHapticsRunning(false);
        void onPlay("hold-cancel");
        previewResetTimerRef.current = window.setTimeout(resetHoldPreview, 780);
        return;
      }

      setDemoReward("reward-hold-preview reward-daily");
      void onPlay("daily").then((playback) => {
        setLastPlayback(playback);
        setDemoRewardDurationMs(playback.durationMs);
        onExplode("daily", origin, explosionControls, {
          audioDurationMs: playback.durationMs,
          durationSource: playback.durationSource
        });
        onVibrate(getWorkoutFeedback({ countAfter: 1, created: true }).haptic);
        setProgressiveHapticsRunning(false);
        previewResetTimerRef.current = window.setTimeout(resetHoldPreview, playback.durationMs);
      });
    };

    holdPreviewRafRef.current = window.requestAnimationFrame(frame);
  };

  const runMechanicalLockTest = () => {
    for (const timer of lockTimersRef.current) {
      window.clearTimeout(timer);
    }
    lockTimersRef.current = [];
    setMechanicalLockCount(0);
    [1, 2, 3, 4].forEach((value, index) => {
      lockTimersRef.current.push(window.setTimeout(() => setMechanicalLockCount(value), 260 + index * 440));
    });
  };

  const playCoupleClaimPreview = async () => {
    const playback = await onPlay("couple-complete");
    const effectDuration = resolveRewardEffectDuration("couple", playback.durationMs, playback.durationSource);
    setLastPlayback(playback);
    setClaimPreview(false);
    setOverlay({ kind: "couple", durationMs: effectDuration.durationMs });
    onVibrate(getAchievementFeedback("couple_week_complete").haptic);
    onExplode("couple", null, explosionControls, {
      audioDurationMs: playback.durationMs,
      durationSource: playback.durationSource
    });
  };

  return (
    <main className="screen sound-lab tone-gold intensity-pressure">
      <header className="mission-header">
        <div>
          <p className="section-label">Dev testing</p>
          <h1 className="lab-title">Sound Lab</h1>
        </div>
        <div className="header-actions">
          <p>{unlocked ? "Audio unlocked" : "Tap unlock first"}</p>
          <MuteToggle muted={muted} onChange={onMuteChange} />
        </div>
      </header>

      <section className="mission-hero lab-hero">
        <div className="hero-grid" aria-hidden="true" />
        <p className="mission-status">
          <RadioTower aria-hidden="true" />
          Reward detonation range
        </p>
        <ProgressSegments value={3} target={4} />
        <button className="primary-lab-button" type="button" onClick={onUnlock}>
          Unlock audio engine
        </button>
      </section>

      <section className="asset-status-panel">
        <div className="section-heading">
          <h2>Resolved reward assets</h2>
          <span>
            {loadedCount} / {soundResolutionEntries.length} loaded / {holdConstantLabel}
          </span>
        </div>
        <div className="asset-status-grid">
          {soundResolutionEntries.map(({ asset, eventName, expectedPrimaryFile, label, sound, status }) => (
            <StatusPill
              key={sound}
              label={label}
              value={asset ? `${asset.sourceFile} / ${asset.source}` : status}
              detail={`event ${eventName} / expected ${expectedPrimaryFile} / actual ${asset?.src ?? "synthetic-heavy-impact"}`}
            />
          ))}
          <StatusPill label="8-bit fallback" value="disabled" detail="No chiptune, blips or coin sounds" />
        </div>
        {goalFallbackWarnings.length > 0 ? (
          <p className="asset-warning">
            Warning: {goalFallbackWarnings.map((asset) => asset.assignment).join(", ")} resolved to level-up-track.mp3 because the specific goal file was missing.
          </p>
        ) : null}
        {missingAssets.length > 0 ? (
          <p className="asset-warning">
            Warning: missing reward audio for {missingAssets.map((entry) => entry.eventName).join(", ")}. The app will use heavy fallback impacts until MP3s are available.
          </p>
        ) : null}
      </section>

      <section className="asset-status-panel lab-runtime-panel">
        <div className="section-heading">
          <h2>Phone feedback status</h2>
          <span>Live reward telemetry</span>
        </div>
        <div className="asset-status-grid">
          <StatusPill
            label="Vibration API"
            value={vibrationSupported ? "supported" : "unsupported"}
            detail={vibrationSupported ? "navigator.vibrate is available" : "iOS Safari commonly reports unsupported; visual shake and audio remain active"}
          />
          <StatusPill
            label="Last vibration call"
            value={lastVibrationResult === null ? "not tested" : lastVibrationResult ? "returned true" : "returned false"}
            detail="Shows the browser return value, not a guarantee that the motor physically fired"
          />
          <StatusPill
            label="Frame time / FPS"
            value={effectMetrics.active ? `${effectMetrics.averageFrameMs}ms / ${effectMetrics.fps} FPS` : "idle"}
            detail={
              effectMetrics.performanceGuardActive
                ? `Dynamic throttling active / spawn ${Math.round(effectMetrics.spawnScale * 100)}%`
                : `Dynamic throttling idle / spawn ${Math.round(effectMetrics.spawnScale * 100)}%`
            }
          />
          <StatusPill
            label="Active particles"
            value={String(effectMetrics.activeParticles)}
            detail={`${effectMetrics.quality} quality / ${Math.round(effectMetrics.progress * 100)}% complete`}
          />
          <StatusPill
            label="Effect duration"
            value={effectMetrics.durationMs ? `${effectMetrics.durationMs}ms` : "not running"}
            detail={`source ${effectMetrics.durationSource}`}
          />
          <StatusPill
            label="Current audio duration"
            value={lastPlayback ? `${lastPlayback.durationMs}ms` : "not played"}
            detail={lastPlayback ? `source ${lastPlayback.durationSource} / ${lastPlayback.assetSrc ?? "heavy fallback"}` : "Run an effect test"}
          />
        </div>
        {!vibrationSupported ? (
          <p className="asset-warning">Vibration is unavailable in this browser. The app automatically leans harder on screen shake, pressure glow and audio impact.</p>
        ) : null}
        <div className="lab-inline-actions">
          <button type="button" onClick={() => onVibrate(35)}>
            <Vibrate aria-hidden="true" /> Test vibration support
          </button>
          <button type="button" disabled={progressiveHapticsRunning} onClick={(event) => runHoldPreview(event, 1)}>
            <HeartPulse aria-hidden="true" /> {progressiveHapticsRunning ? "Progressive hold running" : "Test progressive 3-second hold"}
          </button>
        </div>
      </section>

      <section className="section lab-control-panel">
        <div className="section-heading">
          <h2>Explosion controls</h2>
          <span>Canvas particle system</span>
        </div>
        <SegmentedControl label="Quality level" value={quality} options={qualityOptions} onChange={setQuality} />
        <SegmentedControl
          label="Particle intensity"
          value={particleIntensity}
          options={qualityOptions}
          onChange={setParticleIntensity}
        />
        <SegmentedControl label="Shard intensity" value={shardIntensity} options={intensityOptions} onChange={setShardIntensity} />
        <SegmentedControl label="Firework intensity" value={fireworkIntensity} options={intensityOptions} onChange={setFireworkIntensity} />
        <SegmentedControl label="Smoke intensity" value={smokeIntensity} options={intensityOptions} onChange={setSmokeIntensity} />
        <SegmentedControl label="Shockwave intensity" value={shockwaveIntensity} options={intensityOptions} onChange={setShockwaveIntensity} />
        <SegmentedControl label="Distortion intensity" value={distortionIntensity} options={intensityOptions} onChange={setDistortionIntensity} />
        <SegmentedControl
          label="Screen shake"
          value={screenShake}
          options={[
            { label: "Off", value: "off" },
            { label: "Normal", value: "normal" },
            { label: "Heavy", value: "heavy" },
            { label: "Ridiculous", value: "ridiculous" }
          ]}
          onChange={setScreenShake}
        />
        <SegmentedControl
          label="Flash intensity"
          value={flashIntensity}
          options={[
            { label: "Off", value: "off" },
            { label: "Normal", value: "normal" },
            { label: "High", value: "high" },
            { label: "Ridiculous", value: "ridiculous" }
          ]}
          onChange={setFlashIntensity}
        />
        <div className="lab-toggle-grid">
          <ToggleControl label="Show trigger point" checked={showTriggerPoint} onChange={setShowTriggerPoint} />
          <ToggleControl label="Reduced motion preview" checked={reducedMotionPreview} onChange={setReducedMotionPreview} />
        </div>
      </section>

      <section
        ref={ruptureSurfaceRef}
        className={[
          "lab-reward-card",
          "lab-rupture-surface",
          `hold-stage-${holdPreviewStage}`,
          demoHolding ? "holding" : "",
          demoShattering ? "shattering" : "",
          demoReward
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          {
            "--reward-duration": `${demoRewardDurationMs}ms`,
            "--hold-progress-ratio": 0,
            "--hold-progress-percent": "0%"
          } as CSSProperties
        }
      >
        <span className="hold-shockwave" aria-hidden="true" />
        <CrackOverlay active={demoHolding || demoShattering} />
        <SparkLeak active={demoHolding || demoShattering} />
        <ShatterBurst active={demoShattering} intensity="weekly" />
        <HeartPulse aria-hidden="true" />
        <strong>{holdPreviewStage === "idle" ? "Rupture preview surface" : getHoldStageLabelForLab(holdPreviewStage)}</strong>
        <small>LIVE HOLD DAMAGE // {holdPreviewStage.replaceAll("-", " ")}</small>
        <div className="lab-lock-preview">
          <ProgressSegments value={mechanicalLockCount} target={4} />
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>Explosion tests</h2>
          <span>Full-screen canvas</span>
        </div>
        <div className="lab-grid explosion-test-grid">
          <button
            className="lab-test-button mega-test"
            type="button"
            onClick={(event) => {
              previewHold(0.3, 600, "reward-daily");
              triggerExplosion(event, "daily", { sound: "daily", haptic: getWorkoutFeedback({ countAfter: 0, created: true }).haptic });
            }}
          >
            <Bolt />
            <span>Test Daily Rupture</span>
            <small>Tile centre plus two secondary epicentres</small>
          </button>
          <button
            className="lab-test-button mega-test"
            type="button"
            onClick={(event) => {
              previewHold(0.56, 700, "reward-first");
              triggerExplosion(event, "first", { sound: "first", haptic: getWorkoutFeedback({ countAfter: 1, created: true }).haptic });
            }}
          >
            <Zap />
            <span>Test 1/4 Inertia Rupture</span>
            <small>High-quality staged rupture</small>
          </button>
          <button
            className="lab-test-button mega-test"
            type="button"
            onClick={(event) => {
              previewHold(1, 900, "reward-complete");
              triggerExplosion(event, "weekly", {
                sound: "individual-complete",
                haptic: getAchievementFeedback("individual_week_complete").haptic,
                overlay: "individual"
              });
            }}
          >
            <ShieldCheck />
            <span>Test 4/4 Full-Duration Achievement</span>
            <small>{formatAssetSummary(individualAsset)} / full audio timeline</small>
          </button>
          <button
            className="lab-test-button mega-test couple-mega-test"
            type="button"
            onClick={(event) => {
              previewHold(1, 1000, "reward-complete");
              triggerExplosion(event, "couple", {
                sound: "couple-complete",
                haptic: getAchievementFeedback("couple_week_complete").haptic,
                overlay: "couple"
              });
            }}
          >
            <Sparkles />
            <span>Test 8/8 Full-Duration Couple Achievement</span>
            <small>{formatAssetSummary(coupleAsset)} / full audio timeline + off-screen bursts</small>
          </button>
          <button className="lab-test-button mega-test" type="button" onClick={(event) => runHoldPreview(event, 1)}>
            <Flame />
            <span>Test Full 3-Second Hold Build</span>
            <small>Crack glow for 3000ms, then blast</small>
          </button>
          <button className="lab-test-button mega-test" type="button" onClick={(event) => runHoldPreview(event, 0.25)}>
            <Flame />
            <span>Test Cancelled Hold at 25%</span>
            <small>Early pressure release and clean reset</small>
          </button>
          <button className="lab-test-button mega-test" type="button" onClick={(event) => runHoldPreview(event, 0.6)}>
            <Flame />
            <span>Test Cancelled Hold at 60%</span>
            <small>Visible cracks, unstable surface, then abort</small>
          </button>
          <button
            className="lab-test-button mega-test"
            type="button"
            onClick={(event) =>
              triggerExplosion(event, "target", {
                forceControls: { showTriggerPoint: true, particleIntensity: particleIntensity === "low" ? "normal" : particleIntensity }
              })
            }
          >
            <Sparkles />
            <span>Test Multiple Epicentres</span>
            <small>Badge, edges, bottom and random viewport bursts</small>
          </button>
          <button
            className="lab-test-button mega-test"
            type="button"
            onClick={(event) =>
              triggerExplosion(event, "screen-shake", {
                haptic: [45, 35, 90, 45, 140],
                forceControls: { screenShake: screenShake === "off" ? "heavy" : screenShake }
              })
            }
          >
            <SlidersHorizontal />
            <span>Test Screen Shake</span>
            <small>Sharp high-frequency shake</small>
          </button>
          <button
            className="lab-test-button mega-test"
            type="button"
            onClick={(event) =>
              triggerExplosion(event, "offscreen", {
                forceControls: { showTriggerPoint: true, particleIntensity: particleIntensity === "low" ? "normal" : particleIntensity }
              })
            }
          >
            <Gauge />
            <span>Test Off-Screen Epicentres</span>
            <small>Rings and streaks enter from every viewport edge</small>
          </button>
          <button
            className="lab-test-button mega-test"
            type="button"
            onClick={(event) =>
              triggerExplosion(event, "daily", {
                forceControls: {
                  distortionIntensity: "ridiculous",
                  particleIntensity: "low",
                  shardIntensity: "off",
                  fireworkIntensity: "off",
                  smokeIntensity: "off",
                  shockwaveIntensity: "high"
                }
              })
            }
          >
            <Gauge />
            <span>Test Distortion Shockwave</span>
            <small>Chromatic radial blast and viewport-layer recoil</small>
          </button>
          <button
            className="lab-test-button mega-test"
            type="button"
            onClick={() => setOverlay({ kind: "individual", durationMs: 6000 })}
          >
            <ShieldCheck />
            <span>Test Badge Slam</span>
            <small>Oversized impact, recoil and final lock</small>
          </button>
          <button className="lab-test-button mega-test" type="button" onClick={runMechanicalLockTest}>
            <BadgeCheck />
            <span>Test Mechanical Progress Locks</span>
            <small>Slams all four weekly segments into place</small>
          </button>
          <button className="lab-test-button mega-test couple-mega-test" type="button" onClick={() => setClaimPreview(true)}>
            <ShieldCheck />
            <span>Test Couple Claim Modal</span>
            <small>Claim interaction unlocks the full 8/8 sound and animation</small>
          </button>
          <button
            className="lab-test-button mega-test stress-test"
            type="button"
            onClick={(event) =>
              triggerExplosion(event, "stress", {
                sound: "couple-complete",
                haptic: getAchievementFeedback("couple_week_complete").haptic,
                forceControls: {
                  quality: "ridiculous",
                  particleIntensity: "ridiculous",
                  shardIntensity: "ridiculous",
                  fireworkIntensity: "ridiculous",
                  smokeIntensity: "high",
                  shockwaveIntensity: "ridiculous",
                  distortionIntensity: "ridiculous",
                  screenShake: "ridiculous",
                  flashIntensity: "ridiculous"
                }
              })
            }
          >
            <Sparkles />
            <span>Test Particle Stress</span>
            <small>Ridiculous quality stress pass</small>
          </button>
          <button className="lab-test-button" type="button" onClick={() => void onPlay("level-up-track").then(setLastPlayback)}>
            <RadioTower />
            <span>Play level-up-track.mp3</span>
            <small>{formatAssetSummary(levelUpAsset)}</small>
          </button>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>Sound and haptics</h2>
          <span>Web Audio API</span>
        </div>
        <div className="lab-grid">
          {soundResolutionEntries.map((test) => (
            <button
              className="lab-test-button"
              type="button"
              key={test.sound}
              onClick={() => {
                void onPlay(test.sound).then(setLastPlayback);
                onVibrate(test.haptic);
              }}
            >
              {test.icon}
              <span>{test.label}</span>
              <small>{test.detail}</small>
              <small>event {test.eventName}</small>
              <small>expected {test.expectedPrimaryFile}</small>
              <small className={test.asset?.source === "fallback-specific-missing" ? "lab-resolution-warning" : ""}>
                actual {test.asset?.sourceFile ?? "synthetic-heavy-impact"} / {test.status} / {test.asset?.source ?? "fallback-missing"}
              </small>
            </button>
          ))}
        </div>
      </section>

      <section className="person-links">
        <button type="button" onClick={() => setOverlay({ kind: "individual", durationMs: getAchievementFeedback("individual_week_complete").durationMs })}>
          Individual overlay
          <span>4 / 4</span>
        </button>
        <button type="button" onClick={() => setOverlay({ kind: "couple", durationMs: getAchievementFeedback("couple_week_complete").durationMs })}>
          Couple overlay
          <span>8 / 8</span>
        </button>
      </section>

      <section className="person-links">
        <button type="button" onClick={() => onNavigate("doug")}>
          Doug
          <span>Back</span>
        </button>
        <button type="button" onClick={() => onNavigate("couple")}>
          Couple
          <span>View</span>
        </button>
      </section>

      {overlay ? (
        <AchievementOverlay
          achievement={overlay.kind === "couple" ? sampleCoupleAchievement : sampleIndividualAchievement}
          state={sampleState}
          viewer="doug"
          durationMs={overlay.durationMs}
          onDismiss={() => setOverlay(null)}
        />
      ) : null}
      {claimPreview ? (
        <CoupleClaimCard
          achievement={sampleCoupleAchievement}
          state={sampleState}
          viewer="doug"
          claiming={false}
          preview
          onClaim={() => void playCoupleClaimPreview()}
        />
      ) : null}
    </main>
  );
}

function StatusPill({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <div className="asset-status-pill">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function SegmentedControl<T extends string>({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="lab-segmented-control">
      <span>{label}</span>
      <div>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={option.value === value ? "selected" : ""}
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleControl({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="lab-toggle-control">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} />
      <span>{label}</span>
    </label>
  );
}

function createInitialAssetStatuses(): AssetStatusMap {
  return Object.fromEntries(testedSounds.map((sound) => [sound, { status: "checking", asset: null }])) as AssetStatusMap;
}

function getResolvedOrDefaultAsset(sound: FeedbackSound, assetStatuses: AssetStatusMap): RewardSoundAssetCandidate | ResolvedFeedbackSoundAsset | null {
  return assetStatuses[sound]?.asset ?? getRewardSoundCandidates(sound)[0] ?? null;
}

function formatAssetSummary(asset: RewardSoundAssetCandidate | ResolvedFeedbackSoundAsset | null): string {
  return asset ? `${asset.sourceFile} / ${asset.source}` : "synthetic-heavy-impact";
}

function getHoldStageLabelForLab(stage: HoldStage): string {
  if (stage === "initial-lock" || stage === "pressure-build") return "Locking...";
  if (stage === "cracking") return "Pressure building";
  if (stage === "unstable") return "Do not let go";
  if (stage === "final-warning") return "Rupture imminent";
  return "Rupture preview surface";
}

const sampleState: TrackerState = {
  viewer: "doug",
  pageUser: null,
  users: [
    { id: 1, slug: "doug", displayName: "Doug", createdAt: "2026-07-06T00:00:00.000Z" },
    { id: 2, slug: "rosie", displayName: "Rosie", createdAt: "2026-07-06T00:00:00.000Z" }
  ],
  today: "2026-07-06",
  week: { start: "2026-07-05", end: "2026-07-11" },
  month: { label: "July 2026", start: "2026-07-01", end: "2026-07-31", days: [] },
  workoutsByUser: {
    doug: ["2026-07-05", "2026-07-06", "2026-07-08", "2026-07-10"],
    rosie: ["2026-07-05", "2026-07-07", "2026-07-09", "2026-07-11"]
  },
  counts: {
    doug: { week: 4, target: 4 },
    rosie: { week: 4, target: 4 },
    couple: { week: 8, target: 8 }
  },
  pendingAchievements: []
};

const sampleIndividualAchievement: AchievementEvent = {
  id: 9001,
  eventType: "individual_week_complete",
  userId: 1,
  triggeringUserId: 1,
  weekStartDate: "2026-07-05",
  createdAt: "2026-07-06T00:00:00.000Z",
  payload: {}
};

const sampleCoupleAchievement: AchievementEvent = {
  id: 9002,
  eventType: "couple_week_complete",
  userId: null,
  triggeringUserId: 2,
  weekStartDate: "2026-07-05",
  createdAt: "2026-07-06T00:00:00.000Z",
  payload: {}
};
