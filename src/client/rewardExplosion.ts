import type { AchievementEvent } from "../shared/types.js";

export type RewardExplosionKind =
  | "daily"
  | "first"
  | "momentum"
  | "target"
  | "weekly"
  | "couple"
  | "hold"
  | "screen-shake"
  | "offscreen"
  | "stress";
export type RewardEffectQuality = "low" | "normal" | "high" | "ridiculous";
export type ParticleIntensity = RewardEffectQuality;
export type ScreenShakeLevel = "off" | "normal" | "heavy" | "ridiculous";
export type FlashIntensity = "normal" | "high";
export type EpicentreMode = "tile" | "tile-plus-secondary" | "multi-stage" | "multi-stage-offscreen";
export type EffectDurationSource = "audio-metadata" | "configured-audio" | "fallback" | "fixed";

export interface RewardExplosionOrigin {
  x: number;
  y: number;
}

export interface RewardEpicentre extends RewardExplosionOrigin {
  id: string;
  offscreen: boolean;
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

export interface RewardEffectDefinition {
  durationMs: number;
  durationMode: "fixed" | "match-audio";
  epicentreMode: EpicentreMode;
  defaultIntensity: RewardEffectQuality;
  impactAt: number;
  finalBurstAt: number;
  shakeMs: number;
  counts: ParticleCounts;
}

export interface RewardExplosionProfile extends RewardEffectDefinition {
  kind: RewardExplosionKind;
  label: string;
  durationSource: EffectDurationSource;
  quality: RewardEffectQuality;
  activeParticleCap: number;
}

export interface RewardExplosionTiming {
  audioDurationMs?: number | null;
  durationSource?: EffectDurationSource;
}

export interface RewardExplosionRequest extends RewardExplosionTiming {
  id: number;
  kind: RewardExplosionKind;
  origin?: RewardExplosionOrigin | null;
  controls: RewardExplosionControls;
}

export interface RewardEffectMetrics {
  active: boolean;
  activeParticles: number;
  averageFrameMs: number;
  fps: number;
  quality: RewardEffectQuality;
  durationMs: number;
  durationSource: EffectDurationSource;
  progress: number;
  performanceGuardActive: boolean;
}

export interface RewardBurstEvent {
  atMs: number;
  epicentreIndex: number;
  kind: "charge" | "impact" | "firework" | "final";
  strength: number;
}

export const rewardEffectConfig: Record<RewardExplosionKind, RewardEffectDefinition> = {
  daily: effect(2800, "fixed", "tile-plus-secondary", "normal", 0.14, 0.78, 320, {
    sparks: 150,
    shards: 42,
    embers: 48,
    smoke: 20,
    shockwaves: 3,
    fireworks: 2
  }),
  first: effect(3600, "fixed", "tile-plus-secondary", "high", 0.16, 0.8, 460, {
    sparks: 220,
    shards: 70,
    embers: 72,
    smoke: 28,
    shockwaves: 4,
    fireworks: 4
  }),
  momentum: effect(3600, "fixed", "tile-plus-secondary", "high", 0.16, 0.82, 480, {
    sparks: 250,
    shards: 74,
    embers: 80,
    smoke: 30,
    shockwaves: 4,
    fireworks: 4
  }),
  target: effect(5200, "fixed", "multi-stage", "high", 0.16, 0.84, 620, {
    sparks: 350,
    shards: 110,
    embers: 120,
    smoke: 42,
    shockwaves: 5,
    fireworks: 6
  }),
  weekly: effect(6000, "match-audio", "multi-stage", "high", 0.2, 0.82, 780, {
    sparks: 520,
    shards: 170,
    embers: 190,
    smoke: 64,
    shockwaves: 8,
    fireworks: 12
  }),
  couple: effect(8000, "match-audio", "multi-stage-offscreen", "ridiculous", 0.34, 0.9, 1150, {
    sparks: 880,
    shards: 280,
    embers: 310,
    smoke: 96,
    shockwaves: 14,
    fireworks: 24
  }),
  hold: effect(3400, "fixed", "tile-plus-secondary", "high", 0.88, 0.9, 520, {
    sparks: 220,
    shards: 80,
    embers: 64,
    smoke: 28,
    shockwaves: 4,
    fireworks: 3
  }),
  "screen-shake": effect(1600, "fixed", "tile", "low", 0.12, 0.72, 900, {
    sparks: 32,
    shards: 10,
    embers: 14,
    smoke: 5,
    shockwaves: 2,
    fireworks: 1
  }),
  offscreen: effect(6200, "fixed", "multi-stage-offscreen", "high", 0.18, 0.84, 720, {
    sparks: 430,
    shards: 130,
    embers: 150,
    smoke: 48,
    shockwaves: 10,
    fireworks: 12
  }),
  stress: effect(8000, "fixed", "multi-stage-offscreen", "ridiculous", 0.14, 0.86, 1200, {
    sparks: 1100,
    shards: 360,
    embers: 360,
    smoke: 120,
    shockwaves: 16,
    fireworks: 30
  })
};

export const rewardEffectLabels: Record<RewardExplosionKind, string> = {
  daily: "Daily explosion",
  first: "1/4 inertia explosion",
  momentum: "2/4 momentum explosion",
  target: "3/4 target-in-range explosion",
  weekly: "4/4 weekly complete explosion",
  couple: "8/8 couple mega explosion",
  hold: "Hold build-up rupture",
  "screen-shake": "Screen shake test",
  offscreen: "Off-screen epicentre test",
  stress: "Particle stress test"
};

const particleIntensityScale: Record<ParticleIntensity, number> = {
  low: 0.42,
  normal: 0.7,
  high: 1,
  ridiculous: 1.32
};

const activeParticleCaps: Record<ParticleIntensity, number> = {
  low: 220,
  normal: 380,
  high: 620,
  ridiculous: 920
};

const shakeScale: Record<ScreenShakeLevel, number> = {
  off: 0,
  normal: 1,
  heavy: 1.3,
  ridiculous: 1.65
};

export const defaultRewardExplosionControls: RewardExplosionControls = {
  particleIntensity: getDefaultRewardQuality(),
  screenShake: "normal",
  flashIntensity: "normal",
  showTriggerPoint: false,
  reducedMotionPreview: false
};

export function getRewardExplosionProfile(
  kind: RewardExplosionKind,
  controls: RewardExplosionControls = defaultRewardExplosionControls,
  timing: RewardExplosionTiming = {}
): RewardExplosionProfile {
  const base = rewardEffectConfig[kind];
  const requestedQuality = controls.reducedMotionPreview ? "low" : controls.particleIntensity;
  const duration = resolveRewardEffectDuration(kind, timing.audioDurationMs, timing.durationSource);
  const scale = particleIntensityScale[requestedQuality];

  return {
    ...base,
    kind,
    label: rewardEffectLabels[kind],
    durationMs: controls.reducedMotionPreview ? Math.min(duration.durationMs, 1800) : duration.durationMs,
    durationSource: controls.reducedMotionPreview ? "fixed" : duration.durationSource,
    quality: requestedQuality,
    activeParticleCap: activeParticleCaps[requestedQuality],
    shakeMs: controls.reducedMotionPreview ? 0 : Math.round(base.shakeMs * shakeScale[controls.screenShake]),
    counts: {
      sparks: scaleCount(base.counts.sparks, scale),
      shards: scaleCount(base.counts.shards, scale),
      embers: scaleCount(base.counts.embers, scale),
      smoke: scaleCount(base.counts.smoke, scale),
      shockwaves: Math.max(1, scaleCount(base.counts.shockwaves, controls.reducedMotionPreview ? 0.25 : scale)),
      fireworks: Math.max(1, scaleCount(base.counts.fireworks, controls.reducedMotionPreview ? 0.2 : scale))
    }
  };
}

export function resolveRewardEffectDuration(
  kind: RewardExplosionKind,
  audioDurationMs?: number | null,
  requestedSource?: EffectDurationSource
): { durationMs: number; durationSource: EffectDurationSource } {
  const config = rewardEffectConfig[kind];
  if (config.durationMode === "match-audio" && requestedSource !== "fallback" && isUsableDuration(audioDurationMs)) {
    return {
      durationMs: Math.round(audioDurationMs),
      durationSource: requestedSource === "configured-audio" ? "configured-audio" : "audio-metadata"
    };
  }

  return {
    durationMs: config.durationMs,
    durationSource: config.durationMode === "match-audio" ? "fallback" : "fixed"
  };
}

export function getRewardEpicentres(
  kind: RewardExplosionKind,
  width: number,
  height: number,
  origin?: RewardExplosionOrigin | null
): RewardEpicentre[] {
  const centre = origin ?? { x: width * 0.5, y: height * 0.48 };
  const tileSecondary = [
    epicentre("tile", centre.x, centre.y),
    epicentre("tile-top-right", centre.x + Math.min(110, width * 0.22), centre.y - 82),
    epicentre("tile-bottom-left", centre.x - Math.min(105, width * 0.2), centre.y + 92)
  ];

  if (kind === "daily" || kind === "first" || kind === "momentum" || kind === "hold") {
    return tileSecondary;
  }

  if (kind === "screen-shake") {
    return [epicentre("centre", centre.x, centre.y)];
  }

  const weekly = [
    epicentre("centre-badge", width * 0.5, height * 0.46),
    epicentre("top-left-edge", -width * 0.1, height * 0.25, true),
    epicentre("top-right-edge", width * 1.1, height * 0.3, true),
    epicentre("bottom-centre", width * 0.5, height * 0.92),
    epicentre("left-side", width * 0.08, height * 0.58),
    epicentre("right-side", width * 0.92, height * 0.62)
  ];

  if (kind === "weekly" || kind === "target") {
    return weekly;
  }

  return [
    epicentre("doug-side", width * 0.22, height * 0.42),
    epicentre("rosie-side", width * 0.78, height * 0.42),
    epicentre("central-8-8", width * 0.5, height * 0.5),
    epicentre("top-left-offscreen", -width * 0.1, height * 0.25, true),
    epicentre("top-right-offscreen", width * 1.1, height * 0.3, true),
    epicentre("bottom-left-offscreen", -width * 0.1, height * 0.84, true),
    epicentre("bottom-right-offscreen", width * 1.1, height * 0.84, true),
    epicentre("top-centre-offscreen", width * 0.5, -height * 0.1, true),
    epicentre("bottom-centre-offscreen", width * 0.5, height * 1.1, true)
  ];
}

export function buildRewardBurstTimeline(profile: RewardExplosionProfile, epicentreCount: number): RewardBurstEvent[] {
  const events: RewardBurstEvent[] = [];
  const duration = profile.durationMs;
  const count = Math.max(1, epicentreCount);
  const impactMs = duration * profile.impactAt;
  const finalMs = duration * profile.finalBurstAt;

  events.push({ atMs: duration * 0.04, epicentreIndex: 0, kind: "charge", strength: 0.35 });
  events.push({ atMs: duration * 0.1, epicentreIndex: Math.min(1, count - 1), kind: "charge", strength: 0.5 });

  if (profile.kind === "couple") {
    events.push({ atMs: duration * 0.17, epicentreIndex: 0, kind: "impact", strength: 0.92 });
    events.push({ atMs: duration * 0.19, epicentreIndex: Math.min(1, count - 1), kind: "impact", strength: 0.92 });
    events.push({ atMs: impactMs, epicentreIndex: Math.min(2, count - 1), kind: "impact", strength: 1.55 });
  } else {
    events.push({ atMs: impactMs, epicentreIndex: 0, kind: "impact", strength: profile.kind === "weekly" ? 1.35 : 1 });
  }

  const secondaryStart = duration * (profile.kind === "couple" ? 0.55 : 0.36);
  const secondaryEnd = Math.max(secondaryStart, finalMs - Math.min(420, duration * 0.04));
  const fireworkCount = Math.max(1, profile.counts.fireworks);
  for (let index = 0; index < fireworkCount; index += 1) {
    const progress = fireworkCount === 1 ? 0 : index / (fireworkCount - 1);
    events.push({
      atMs: secondaryStart + (secondaryEnd - secondaryStart) * progress,
      epicentreIndex: (index + (profile.kind === "couple" ? 3 : 1)) % count,
      kind: "firework",
      strength: index % 4 === 0 ? 1.05 : 0.72
    });
  }

  events.push({
    atMs: finalMs,
    epicentreIndex: profile.kind === "couple" ? Math.min(2, count - 1) : 0,
    kind: "final",
    strength: profile.kind === "couple" ? 1.75 : 1.45
  });

  return events.sort((left, right) => left.atMs - right.atMs);
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

  if (countAfter === 3) {
    return "target";
  }

  if (countAfter === 2) {
    return "momentum";
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

export function getDefaultRewardQuality(): RewardEffectQuality {
  if (typeof navigator === "undefined") {
    return "normal";
  }

  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  return cores >= 6 && deviceMemory >= 4 ? "high" : "normal";
}

function effect(
  durationMs: number,
  durationMode: RewardEffectDefinition["durationMode"],
  epicentreMode: EpicentreMode,
  defaultIntensity: RewardEffectQuality,
  impactAt: number,
  finalBurstAt: number,
  shakeMs: number,
  counts: ParticleCounts
): RewardEffectDefinition {
  return { durationMs, durationMode, epicentreMode, defaultIntensity, impactAt, finalBurstAt, shakeMs, counts };
}

function epicentre(id: string, x: number, y: number, offscreen = false): RewardEpicentre {
  return { id, x, y, offscreen };
}

function isUsableDuration(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 500;
}

function scaleCount(value: number, scale: number): number {
  return Math.max(0, Math.round(value * scale));
}
