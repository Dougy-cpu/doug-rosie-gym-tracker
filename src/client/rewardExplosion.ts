import type { AchievementEvent } from "../shared/types.js";

export type RewardExplosionKind = "daily" | "first" | "weekly" | "couple" | "hold" | "screen-shake" | "stress";
export type ParticleIntensity = "normal" | "high" | "ridiculous";
export type ScreenShakeLevel = "off" | "normal" | "heavy" | "ridiculous";
export type FlashIntensity = "normal" | "high";

export interface RewardExplosionOrigin {
  x: number;
  y: number;
}

export interface RewardExplosionControls {
  particleIntensity: ParticleIntensity;
  screenShake: ScreenShakeLevel;
  flashIntensity: FlashIntensity;
  showTriggerPoint: boolean;
  reducedMotionPreview: boolean;
}

export interface ParticleCounts {
  sparks: number;
  shards: number;
  embers: number;
  smoke: number;
  shockwaves: number;
  fireworks: number;
}

export interface RewardExplosionProfile {
  kind: RewardExplosionKind;
  label: string;
  durationMs: number;
  impactDelayMs: number;
  shakeMs: number;
  counts: ParticleCounts;
  fireworkDelaysMs: number[];
}

export interface RewardExplosionRequest {
  id: number;
  kind: RewardExplosionKind;
  origin?: RewardExplosionOrigin | null;
  controls: RewardExplosionControls;
}

export const defaultRewardExplosionControls: RewardExplosionControls = {
  particleIntensity: "normal",
  screenShake: "normal",
  flashIntensity: "normal",
  showTriggerPoint: false,
  reducedMotionPreview: false
};

export const baseRewardExplosionProfiles: Record<RewardExplosionKind, RewardExplosionProfile> = {
  daily: {
    kind: "daily",
    label: "Daily explosion",
    durationMs: 3200,
    impactDelayMs: 300,
    shakeMs: 280,
    counts: { sparks: 160, shards: 52, embers: 52, smoke: 26, shockwaves: 3, fireworks: 3 },
    fireworkDelaysMs: [650, 920, 1180]
  },
  first: {
    kind: "first",
    label: "1/4 inertia explosion",
    durationMs: 3800,
    impactDelayMs: 300,
    shakeMs: 430,
    counts: { sparks: 240, shards: 85, embers: 76, smoke: 38, shockwaves: 3, fireworks: 4 },
    fireworkDelaysMs: [620, 840, 1080, 1320]
  },
  weekly: {
    kind: "weekly",
    label: "4/4 weekly complete explosion",
    durationMs: 5800,
    impactDelayMs: 300,
    shakeMs: 760,
    counts: { sparks: 520, shards: 210, embers: 190, smoke: 78, shockwaves: 6, fireworks: 8 },
    fireworkDelaysMs: [620, 760, 910, 1080, 1240, 1420, 1620, 1840]
  },
  couple: {
    kind: "couple",
    label: "8/8 couple mega explosion",
    durationMs: 7800,
    impactDelayMs: 300,
    shakeMs: 1150,
    counts: { sparks: 860, shards: 340, embers: 290, smoke: 118, shockwaves: 9, fireworks: 12 },
    fireworkDelaysMs: [580, 700, 840, 980, 1120, 1280, 1440, 1620, 1820, 2050, 2320, 2620]
  },
  hold: {
    kind: "hold",
    label: "Hold build-up rupture",
    durationMs: 3400,
    impactDelayMs: 300,
    shakeMs: 460,
    counts: { sparks: 220, shards: 90, embers: 70, smoke: 36, shockwaves: 4, fireworks: 4 },
    fireworkDelaysMs: [640, 860, 1120, 1380]
  },
  "screen-shake": {
    kind: "screen-shake",
    label: "Screen shake test",
    durationMs: 1600,
    impactDelayMs: 140,
    shakeMs: 900,
    counts: { sparks: 36, shards: 12, embers: 16, smoke: 8, shockwaves: 2, fireworks: 1 },
    fireworkDelaysMs: [500]
  },
  stress: {
    kind: "stress",
    label: "Particle stress test",
    durationMs: 8000,
    impactDelayMs: 300,
    shakeMs: 1200,
    counts: { sparks: 900, shards: 350, embers: 300, smoke: 120, shockwaves: 9, fireworks: 12 },
    fireworkDelaysMs: [520, 640, 780, 920, 1080, 1260, 1440, 1640, 1880, 2160, 2460, 2800]
  }
};

const particleIntensityScale: Record<ParticleIntensity, number> = {
  normal: 1,
  high: 1.28,
  ridiculous: 1.72
};

const shakeScale: Record<ScreenShakeLevel, number> = {
  off: 0,
  normal: 1,
  heavy: 1.35,
  ridiculous: 1.75
};

export function getRewardExplosionProfile(kind: RewardExplosionKind, controls: RewardExplosionControls = defaultRewardExplosionControls): RewardExplosionProfile {
  const base = baseRewardExplosionProfiles[kind];
  const particleScale = controls.reducedMotionPreview ? 0.26 : particleIntensityScale[controls.particleIntensity];
  const shakeMs = controls.reducedMotionPreview ? 0 : Math.round(base.shakeMs * shakeScale[controls.screenShake]);

  return {
    ...base,
    durationMs: controls.reducedMotionPreview ? Math.min(base.durationMs, 1800) : base.durationMs,
    shakeMs,
    counts: {
      sparks: scaleCount(base.counts.sparks, particleScale),
      shards: scaleCount(base.counts.shards, particleScale),
      embers: scaleCount(base.counts.embers, particleScale),
      smoke: scaleCount(base.counts.smoke, particleScale),
      shockwaves: Math.max(controls.reducedMotionPreview ? 1 : 0, scaleCount(base.counts.shockwaves, controls.reducedMotionPreview ? 0.45 : particleScale)),
      fireworks: Math.max(controls.reducedMotionPreview ? 1 : 0, scaleCount(base.counts.fireworks, controls.reducedMotionPreview ? 0.35 : particleScale))
    },
    fireworkDelaysMs: controls.reducedMotionPreview ? base.fireworkDelaysMs.slice(0, 1) : base.fireworkDelaysMs
  };
}

export function getExplosionKindForReward({
  countAfter,
  created,
  achievement
}: {
  countAfter: number;
  created: boolean;
  achievement?: AchievementEvent | null;
}): RewardExplosionKind | null {
  if (!created && !achievement) {
    return null;
  }

  if (achievement?.eventType === "couple_week_complete") {
    return "couple";
  }

  if (achievement?.eventType === "individual_week_complete" || countAfter >= 4) {
    return "weekly";
  }

  if (countAfter === 1) {
    return "first";
  }

  return "daily";
}

export function getOriginFromElement(element: Element | null): RewardExplosionOrigin | null {
  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function scaleCount(value: number, scale: number): number {
  return Math.max(0, Math.round(value * scale));
}
