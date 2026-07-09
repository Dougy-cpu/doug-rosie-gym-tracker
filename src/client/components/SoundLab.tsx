import { Activity, BadgeCheck, Bolt, Flame, HeartPulse, RadioTower, ShieldCheck, SlidersHorizontal, Sparkles, Zap } from "lucide-react";
import type { CSSProperties, MouseEvent, ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import type { AchievementEvent, TrackerState } from "../../shared/types.js";
import type { AppRoute } from "../routes";
import {
  defaultRewardExplosionControls,
  getOriginFromElement,
  type FlashIntensity,
  type ParticleIntensity,
  type RewardExplosionControls,
  type RewardExplosionKind,
  type RewardExplosionOrigin,
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
import { HOLD_TO_CONFIRM_MS } from "./HoldToLogTile";
import { ProgressSegments } from "./ProgressSegments";

interface SoundLabProps {
  muted: boolean;
  unlocked: boolean;
  onMuteChange: (muted: boolean) => void;
  onNavigate: (viewer: AppRoute) => void;
  onUnlock: () => void;
  onPlay: (sound: FeedbackSound) => void;
  onVibrate: (pattern: HapticPattern) => void;
  onExplode: (kind: RewardExplosionKind, origin?: RewardExplosionOrigin | null, controls?: RewardExplosionControls) => void;
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

export function SoundLab({
  muted,
  unlocked,
  onMuteChange,
  onNavigate,
  onUnlock,
  onPlay,
  onVibrate,
  onExplode
}: SoundLabProps) {
  const [demoReward, setDemoReward] = useState("reward-none");
  const [demoRewardDurationMs, setDemoRewardDurationMs] = useState(() => getFeedbackDurationMs("daily"));
  const [overlay, setOverlay] = useState<"individual" | "couple" | null>(null);
  const [assetStatuses, setAssetStatuses] = useState<AssetStatusMap>(() => createInitialAssetStatuses());
  const [holdPreviewProgress, setHoldPreviewProgress] = useState(0);
  const [particleIntensity, setParticleIntensity] = useState<ParticleIntensity>(defaultRewardExplosionControls.particleIntensity);
  const [screenShake, setScreenShake] = useState<ScreenShakeLevel>(defaultRewardExplosionControls.screenShake);
  const [flashIntensity, setFlashIntensity] = useState<FlashIntensity>(defaultRewardExplosionControls.flashIntensity);
  const [showTriggerPoint, setShowTriggerPoint] = useState(defaultRewardExplosionControls.showTriggerPoint);
  const [reducedMotionPreview, setReducedMotionPreview] = useState(defaultRewardExplosionControls.reducedMotionPreview);

  const explosionControls = useMemo<RewardExplosionControls>(
    () => ({
      particleIntensity,
      screenShake,
      flashIntensity,
      showTriggerPoint,
      reducedMotionPreview
    }),
    [flashIntensity, particleIntensity, reducedMotionPreview, screenShake, showTriggerPoint]
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

  const previewHold = (progress: number, durationMs = 1300, rewardClass = "reward-daily") => {
    setHoldPreviewProgress(progress);
    setDemoReward(`reward-hold-preview ${rewardClass}`);
    setDemoRewardDurationMs(durationMs);
    window.setTimeout(() => {
      setDemoReward("reward-none");
      setHoldPreviewProgress(0);
    }, durationMs);
  };

  const triggerExplosion = (
    event: MouseEvent<HTMLButtonElement>,
    kind: RewardExplosionKind,
    options: { sound?: FeedbackSound; haptic?: HapticPattern; forceControls?: Partial<RewardExplosionControls>; overlay?: "individual" | "couple" } = {}
  ) => {
    const controls = { ...explosionControls, ...options.forceControls };
    const origin = getOriginFromElement(event.currentTarget);
    onExplode(kind, origin, controls);

    if (options.sound) {
      onPlay(options.sound);
    }

    if (options.haptic) {
      onVibrate(options.haptic);
    }

    if (options.overlay) {
      setOverlay(options.overlay);
    }
  };

  const triggerHoldBuildUp = (event: MouseEvent<HTMLButtonElement>) => {
    const origin = getOriginFromElement(event.currentTarget);
    previewHold(1, HOLD_TO_CONFIRM_MS + 900, "reward-complete");
    onPlay("hold-charge");
    onVibrate([24, 35, 48, 45, 82]);
    window.setTimeout(() => {
      onExplode("hold", origin, explosionControls);
      onPlay("daily");
      onVibrate(getWorkoutFeedback({ countAfter: 1, created: true }).haptic);
    }, HOLD_TO_CONFIRM_MS);
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

      <section className="section lab-control-panel">
        <div className="section-heading">
          <h2>Explosion controls</h2>
          <span>Canvas particle system</span>
        </div>
        <SegmentedControl
          label="Particle intensity"
          value={particleIntensity}
          options={[
            { label: "Normal", value: "normal" },
            { label: "High", value: "high" },
            { label: "Ridiculous", value: "ridiculous" }
          ]}
          onChange={setParticleIntensity}
        />
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
            { label: "Normal", value: "normal" },
            { label: "High", value: "high" }
          ]}
          onChange={setFlashIntensity}
        />
        <div className="lab-toggle-grid">
          <ToggleControl label="Show trigger point" checked={showTriggerPoint} onChange={setShowTriggerPoint} />
          <ToggleControl label="Reduced motion preview" checked={reducedMotionPreview} onChange={setReducedMotionPreview} />
        </div>
      </section>

      <section
        className={`lab-reward-card lab-rupture-surface ${demoReward}`}
        style={
          {
            "--reward-duration": `${demoRewardDurationMs}ms`,
            "--hold-progress-ratio": holdPreviewProgress
          } as CSSProperties
        }
      >
        <span className="hold-shockwave" aria-hidden="true" />
        <span className="hold-crack-overlay lab-crack-preview" aria-hidden="true" style={{ "--crack-intensity": holdPreviewProgress } as CSSProperties}>
          {Array.from({ length: 13 }, (_, index) => (
            <i
              key={index}
              style={
                {
                  "--crack-left": `${24 + (index % 5) * 12}%`,
                  "--crack-top": `${18 + index * 5}%`,
                  "--crack-rotate": `${index % 2 === 0 ? -30 - index * 2 : 34 + index * 2}deg`,
                  "--crack-length": `${32 + index * 5}px`,
                  "--crack-delay": `${index * 28}ms`
                } as CSSProperties
              }
            />
          ))}
        </span>
        <HeartPulse aria-hidden="true" />
        <strong>Rupture preview surface</strong>
        <small>Use the test buttons below to smash this style of card apart.</small>
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
            <span>Test Daily Explosion</span>
            <small>160 sparks / 52 shards / 52 embers</small>
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
            <span>Test 1/4 Inertia Explosion</span>
            <small>240 sparks / 85 shards / 4 firework pops</small>
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
            <span>Test 4/4 Weekly Complete Explosion</span>
            <small>{formatAssetSummary(individualAsset)} / 520 sparks / 8 pops</small>
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
            <span>Test 8/8 Couple Mega Explosion</span>
            <small>{formatAssetSummary(coupleAsset)} / 860 sparks / 12 pops</small>
          </button>
          <button className="lab-test-button mega-test" type="button" onClick={triggerHoldBuildUp}>
            <Flame />
            <span>Test Hold Build-Up + Rupture</span>
            <small>Crack glow for 3000ms, then blast</small>
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
            className="lab-test-button mega-test stress-test"
            type="button"
            onClick={(event) =>
              triggerExplosion(event, "stress", {
                sound: "couple-complete",
                haptic: getAchievementFeedback("couple_week_complete").haptic,
                forceControls: { particleIntensity: "ridiculous", screenShake: "ridiculous", flashIntensity: "high" }
              })
            }
          >
            <Sparkles />
            <span>Test Particle Stress</span>
            <small>Ridiculous quality stress pass</small>
          </button>
          <button className="lab-test-button" type="button" onClick={() => onPlay("level-up-track")}>
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
                onPlay(test.sound);
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
        <button type="button" onClick={() => setOverlay("individual")}>
          Individual overlay
          <span>4 / 4</span>
        </button>
        <button type="button" onClick={() => setOverlay("couple")}>
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
          achievement={overlay === "couple" ? sampleCoupleAchievement : sampleIndividualAchievement}
          state={sampleState}
          viewer="doug"
          onDismiss={() => setOverlay(null)}
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
