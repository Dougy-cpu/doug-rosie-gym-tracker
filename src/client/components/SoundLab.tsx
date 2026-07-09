import { Activity, BadgeCheck, Bolt, Flame, HeartPulse, RadioTower, ShieldCheck, Zap } from "lucide-react";
import type { CSSProperties, ReactElement } from "react";
import { useEffect, useState } from "react";
import type { AchievementEvent, TrackerState } from "../../shared/types.js";
import type { AppRoute } from "../routes";
import {
  feedbackSoundAssets,
  getAchievementFeedback,
  getFeedbackDurationMs,
  getWorkoutFeedback,
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
  onVibrate
}: SoundLabProps) {
  const [demoReward, setDemoReward] = useState("reward-none");
  const [demoRewardDurationMs, setDemoRewardDurationMs] = useState(() => getFeedbackDurationMs("daily"));
  const [overlay, setOverlay] = useState<"individual" | "couple" | null>(null);
  const [assetStatuses, setAssetStatuses] = useState<AssetStatusMap>(() => createInitialAssetStatuses());
  const [holdPreviewProgress, setHoldPreviewProgress] = useState(0);
  const [holdDurationMs, setHoldDurationMs] = useState(HOLD_TO_CONFIRM_MS);

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

  const triggerReward = (rewardClass: string, sound: FeedbackSound, haptic: HapticPattern) => {
    const durationMs = getFeedbackDurationMs(sound);
    setDemoReward(rewardClass);
    setDemoRewardDurationMs(durationMs);
    onPlay(sound);
    onVibrate(haptic);
    window.setTimeout(() => setDemoReward("reward-none"), durationMs);
  };

  const previewHold = (progress: number, rewardClass = "reward-daily") => {
    setHoldPreviewProgress(progress);
    setDemoReward(`reward-hold-preview ${rewardClass}`);
    setDemoRewardDurationMs(holdDurationMs);
    window.setTimeout(() => {
      setDemoReward("reward-none");
      setHoldPreviewProgress(0);
    }, 1300);
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
          Original tactical cues
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
            {loadedCount} / {uploadedRewardAssets.length} loaded · {holdConstantLabel}
          </span>
        </div>
        <div className="asset-status-grid">
          {uploadedRewardAssets.map(([sound, asset]) => (
            <StatusPill
              key={sound}
              label={asset.assignment}
              value={`${assetStatuses[sound] ?? "checking"} · ${asset.durationMs}ms`}
              detail={`${asset.sourceFile} -> public${asset.src}`}
            />
          ))}
          <StatusPill label="8-bit fallback" value="disabled" detail="No chiptune, blips or coin sounds" />
        </div>
        {missingAssets.length > 0 ? (
          <p className="asset-warning">
            Warning: missing uploaded reward audio: {missingAssets.map(([, asset]) => asset.sourceFile).join(", ")}. The app will use heavy fallback impacts until the MP3s are
            available.
          </p>
        ) : null}
      </section>

      <section
        className={`lab-reward-card ${demoReward}`}
        style={
          {
            "--reward-duration": `${demoRewardDurationMs}ms`,
            "--hold-progress-ratio": holdPreviewProgress
          } as CSSProperties
        }
      >
        <span className="hold-shockwave" aria-hidden="true" />
        <span className="hold-crack-overlay lab-crack-preview" aria-hidden="true" style={{ "--crack-intensity": holdPreviewProgress } as CSSProperties}>
          {Array.from({ length: 7 }, (_, index) => (
            <i
              key={index}
              style={
                {
                  "--crack-left": `${38 + (index % 3) * 10}%`,
                  "--crack-top": `${30 + index * 7}%`,
                  "--crack-rotate": `${index % 2 === 0 ? -24 : 36}deg`,
                  "--crack-length": `${28 + index * 4}px`,
                  "--crack-delay": `${index * 45}ms`
                } as CSSProperties
              }
            />
          ))}
        </span>
        <HeartPulse aria-hidden="true" />
        <strong>Daily animation test</strong>
        <button type="button" onClick={() => triggerReward("reward-daily", "daily", [35, 20, 60])}>
          Trigger reward burst
        </button>
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>Hold sequence previews</h2>
          <span>{holdDurationMs}ms dev preview</span>
        </div>
        <label className="lab-slider">
          <span>Hold duration</span>
          <input
            type="range"
            min="2000"
            max="4500"
            step="100"
            value={holdDurationMs}
            onChange={(event) => setHoldDurationMs(Number(event.currentTarget.value))}
          />
        </label>
        <div className="lab-grid">
          <button className="lab-test-button" type="button" onClick={() => previewHold(1, "reward-complete")}>
            <Bolt />
            <span>Preview full hold sequence</span>
            <small>3000ms pressure build</small>
          </button>
          <button className="lab-test-button" type="button" onClick={() => previewHold(0.25)}>
            <Activity />
            <span>Preview cancelled hold at 25%</span>
            <small>Pressure collapses</small>
          </button>
          <button className="lab-test-button" type="button" onClick={() => previewHold(0.6, "reward-pressure")}>
            <Flame />
            <span>Preview cancelled hold at 60%</span>
            <small>Cracks drain away</small>
          </button>
          <button className="lab-test-button" type="button" onClick={() => triggerReward("reward-daily", "daily", [35, 20, 60])}>
            <Bolt />
            <span>Preview daily rupture</span>
            <small>Shards and shockwave</small>
          </button>
          <button className="lab-test-button" type="button" onClick={() => triggerReward("reward-first", "first", getWorkoutFeedback({ countAfter: 1, created: true }).haptic)}>
            <Zap />
            <span>Preview 1/4 inertia rupture</span>
            <small>Inertia broken</small>
          </button>
          <button className="lab-test-button" type="button" onClick={() => onPlay("weekly-complete")}>
            <RadioTower />
            <span>Play weekly track</span>
            <small>{weeklyAsset?.sourceFile}</small>
          </button>
          <button
            className="lab-test-button"
            type="button"
            onClick={() => {
              onPlay("individual-complete");
              onVibrate(getAchievementFeedback("individual_week_complete").haptic);
              setOverlay("individual");
            }}
          >
            <ShieldCheck />
            <span>Preview 4/4 weekly complete</span>
            <small>
              {individualAsset?.sourceFile} · {individualAsset?.durationMs}ms
            </small>
          </button>
          <button
            className="lab-test-button"
            type="button"
            onClick={() => {
              onPlay("couple-complete");
              onVibrate(getAchievementFeedback("couple_week_complete").haptic);
              setOverlay("couple");
            }}
          >
            <ShieldCheck />
            <span>Preview 8/8 couple complete</span>
            <small>
              {coupleAsset?.sourceFile} · {coupleAsset?.durationMs}ms
            </small>
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
