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
  feedbackSoundAssets,
  getAchievementFeedback,
  getFeedbackDurationMs,
  getWorkoutFeedback,
  LEVEL_UP_TRACK_SRC,
  type FeedbackSound,
  type FeedbackSoundAsset,
  type HapticPattern
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
  { label: "Daily", detail: "Session locked", sound: "daily", haptic: getWorkoutFeedback({ countAfter: 0, created: true }).haptic, icon: <Bolt /> },
  {
    label: "Calendar",
    detail: "Backfill locked",
    sound: "backfill",
    haptic: getWorkoutFeedback({ countAfter: 0, created: true, source: "backfill" }).haptic,
    icon: <BadgeCheck />
  },
  { label: "First", detail: "Inertia broken", sound: "first", haptic: getWorkoutFeedback({ countAfter: 1, created: true }).haptic, icon: <Zap /> },
  {
    label: "Momentum",
    detail: "Two banked",
    sound: "momentum",
    haptic: getWorkoutFeedback({ countAfter: 2, created: true }).haptic,
    icon: <Activity />
  },
  { label: "One more", detail: "Target in range", sound: "one-more", haptic: getWorkoutFeedback({ countAfter: 3, created: true }).haptic, icon: <Flame /> },
  {
    label: "4th",
    detail: "Weekly locked",
    sound: "weekly-complete",
    haptic: getWorkoutFeedback({ countAfter: 4, created: true }).haptic,
    icon: <BadgeCheck />
  },
  { label: "4/4", detail: "Individual overlay", sound: "individual-complete", haptic: getAchievementFeedback("individual_week_complete").haptic, icon: <ShieldCheck /> },
  {
    label: "8/8",
    detail: "Couple complete",
    sound: "couple-complete",
    haptic: getAchievementFeedback("couple_week_complete").haptic,
    icon: <ShieldCheck />
  }
];

type AssetStatus = "checking" | "loaded" | "missing";
type AssetStatusMap = Partial<Record<FeedbackSound, AssetStatus>>;
const holdConstantLabel = "HOLD_TO_CONFIRM_MS = 3000";
const uploadedRewardAssets = Object.entries(feedbackSoundAssets) as Array<[FeedbackSound, FeedbackSoundAsset]>;

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

  useEffect(() => {
    let cancelled = false;

    Promise.all(
      uploadedRewardAssets.map(async ([sound, asset]) => {
        try {
          const response = await fetch(asset.src, { method: "HEAD" });
          const contentType = response.headers.get("content-type") ?? "";
          return [sound, response.ok && contentType.startsWith("audio/") ? "loaded" : "missing"] as const;
        } catch {
          return [sound, "missing"] as const;
        }
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
    const missingAssets = uploadedRewardAssets.filter(([sound]) => assetStatuses[sound] === "missing");
    if (missingAssets.length === 0) {
      return;
    }

    const timerId = window.setTimeout(() => {
      console.warn(`Missing uploaded reward audio: ${missingAssets.map(([, asset]) => `${asset.sourceFile} (${asset.src})`).join(", ")}`);
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

  const missingAssets = uploadedRewardAssets.filter(([sound]) => assetStatuses[sound] === "missing");
  const loadedCount = uploadedRewardAssets.filter(([sound]) => assetStatuses[sound] === "loaded").length;
  const weeklyAsset = feedbackSoundAssets["weekly-complete"];
  const individualAsset = feedbackSoundAssets["individual-complete"];
  const coupleAsset = feedbackSoundAssets["couple-complete"];

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
          <h2>Uploaded reward assets</h2>
          <span>
            {loadedCount} / {uploadedRewardAssets.length} loaded / {holdConstantLabel}
          </span>
        </div>
        <div className="asset-status-grid">
          {uploadedRewardAssets.map(([sound, asset]) => (
            <StatusPill
              key={sound}
              label={asset.assignment}
              value={`${assetStatuses[sound] ?? "checking"} / ${asset.durationMs}ms`}
              detail={`${asset.sourceFile} -> public${asset.src}`}
            />
          ))}
          <StatusPill label="Level-up track" value={LEVEL_UP_TRACK_SRC} detail="Main sound for 4/4 and 8/8" />
          <StatusPill label="8-bit fallback" value="disabled" detail="No chiptune, blips or coin sounds" />
        </div>
        {missingAssets.length > 0 ? (
          <p className="asset-warning">
            Warning: missing uploaded reward audio: {missingAssets.map(([, asset]) => asset.sourceFile).join(", ")}. The app will use heavy fallback impacts until the MP3s are
            available.
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
            <small>{individualAsset?.sourceFile} / 520 sparks / 8 pops</small>
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
            <small>{coupleAsset?.sourceFile} / 860 sparks / 12 pops</small>
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
          <button className="lab-test-button" type="button" onClick={() => onPlay("weekly-complete")}>
            <RadioTower />
            <span>Play weekly track</span>
            <small>{weeklyAsset?.sourceFile}</small>
          </button>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>Sound and haptics</h2>
          <span>Web Audio API</span>
        </div>
        <div className="lab-grid">
          {soundTests.map((test) => (
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
  return Object.fromEntries(uploadedRewardAssets.map(([sound]) => [sound, "checking"])) as AssetStatusMap;
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
