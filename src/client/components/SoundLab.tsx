import { Activity, BadgeCheck, Bolt, Flame, HeartPulse, RadioTower, ShieldCheck, Zap } from "lucide-react";
import type { ReactElement } from "react";
import { useState } from "react";
import type { AchievementEvent, TrackerState } from "../../shared/types.js";
import type { AppRoute } from "../routes";
import type { FeedbackSound, HapticPattern } from "../rewardFeedback";
import { MuteToggle } from "./MuteToggle";
import { AchievementOverlay } from "./AchievementOverlay";
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
  { label: "Daily", detail: "Session locked", sound: "daily", haptic: [20, 30, 40], icon: <Bolt /> },
  { label: "First", detail: "Inertia broken", sound: "first", haptic: [30, 30, 70], icon: <Zap /> },
  { label: "Momentum", detail: "Two banked", sound: "momentum", haptic: [20, 30, 40], icon: <Activity /> },
  { label: "One more", detail: "Target in range", sound: "one-more", haptic: [20, 20, 30, 20, 60], icon: <Flame /> },
  { label: "4/4", detail: "Weekly complete", sound: "weekly-complete", haptic: [40, 40, 80, 40, 120], icon: <BadgeCheck /> },
  {
    label: "8/8",
    detail: "Couple complete",
    sound: "couple-complete",
    haptic: [40, 30, 80, 40, 120, 60, 180],
    icon: <ShieldCheck />
  }
];

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
  const [overlay, setOverlay] = useState<"individual" | "couple" | null>(null);

  const triggerReward = (rewardClass: string, sound: FeedbackSound, haptic: HapticPattern) => {
    setDemoReward(rewardClass);
    onPlay(sound);
    onVibrate(haptic);
    window.setTimeout(() => setDemoReward("reward-none"), 1400);
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
          Original tactical cues
        </p>
        <ProgressSegments value={3} target={4} />
        <button className="primary-lab-button" type="button" onClick={onUnlock}>
          Unlock audio engine
        </button>
      </section>

      <section className={`lab-reward-card ${demoReward}`}>
        <span className="hold-shockwave" aria-hidden="true" />
        <HeartPulse aria-hidden="true" />
        <strong>Daily animation test</strong>
        <button type="button" onClick={() => triggerReward("reward-daily", "daily", [20, 30, 40])}>
          Trigger reward burst
        </button>
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
