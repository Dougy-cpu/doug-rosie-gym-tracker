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
export type RewardIntensityLevel = "off" | RewardEffectQuality;
export type ParticleIntensity = RewardEffectQuality;
export type ScreenShakeLevel = "off" | "normal" | "heavy" | "ridiculous";
export type FlashIntensity = "off" | "normal" | "high" | "ridiculous";
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
  quality: RewardEffectQuality;
  particleIntensity: ParticleIntensity;
  shardIntensity: RewardIntensityLevel;
  fireworkIntensity: RewardIntensityLevel;
  smokeIntensity: RewardIntensityLevel;
  shockwaveIntensity: RewardIntensityLevel;
  distortionIntensity: RewardIntensityLevel;
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
  sparkRain: number;
}

export interface RewardEffectDefinition {
  durationMs: number;
  durationMode: "fixed" | "match-audio";
  epicentreMode: EpicentreMode;
  defaultIntensity: RewardEffectQuality;
  impactAt: number;
  finalBurstAt: number;
  shakeMs: number;
  distortionMs: number;
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
  spawnScale: number;
}

export interface RewardBurstEvent {
  atMs: number;
  epicentreIndex: number;
  kind: "charge" | "impact" | "firework" | "rain" | "final";
  strength: number;
}

export const rewardEffectConfig: Record<RewardExplosionKind, RewardEffectDefinition> = {
  daily: effect(2800, "fixed", "tile-plus-secondary", "normal", 0.14, 0.78, 280, 1050, {
    sparks: 175,
    shards: 70,
    embers: 62,
    smoke: 22,
    shockwaves: 4,
    fireworks: 3,
    sparkRain: 46
  }),
  first: effect(3600, "fixed", "multi-stage-offscreen", "high", 0.16, 0.8, 420, 1320, {
    sparks: 280,
    shards: 115,
    embers: 92,
    smoke: 32,
    shockwaves: 6,
    fireworks: 6,
    sparkRain: 78
  }),
  momentum: effect(3600, "fixed", "tile-plus-secondary", "high", 0.16, 0.82, 440, 1250, {
    sparks: 290,
    shards: 105,
    embers: 96,
    smoke: 34,
    shockwaves: 5,
    fireworks: 5,
    sparkRain: 76
  }),
  target: effect(5200, "fixed", "multi-stage", "high", 0.16, 0.84, 620, 1580, {
    sparks: 390,
    shards: 145,
    embers: 145,
    smoke: 48,
    shockwaves: 7,
    fireworks: 9,
    sparkRain: 112
  }),
  weekly: effect(6000, "match-audio", "multi-stage", "high", 0.2, 0.82, 720, 1900, {
    sparks: 610,
    shards: 210,
    embers: 235,
    smoke: 72,
    shockwaves: 11,
    fireworks: 15,
    sparkRain: 185
  }),
  couple: effect(8000, "match-audio", "multi-stage-offscreen", "ridiculous", 0.34, 0.9, 1100, 2500, {
    sparks: 980,
    shards: 340,
    embers: 370,
    smoke: 108,
    shockwaves: 17,
    fireworks: 28,
    sparkRain: 290
  }),
  hold: effect(3400, "fixed", "tile-plus-secondary", "high", 0.88, 0.9, 460, 1320, {
    sparks: 260,
    shards: 92,
    embers: 78,
    smoke: 30,
    shockwaves: 5,
    fireworks: 4,
    sparkRain: 64
  }),
  "screen-shake": effect(1600, "fixed", "tile", "low", 0.12, 0.72, 900, 720, {
    sparks: 32,
    shards: 10,
    embers: 14,
    smoke: 5,
    shockwaves: 2,
    fireworks: 1,
    sparkRain: 0
  }),
  offscreen: effect(6200, "fixed", "multi-stage-offscreen", "high", 0.18, 0.84, 720, 1900, {
    sparks: 480,
    shards: 150,
    embers: 175,
    smoke: 54,
    shockwaves: 12,
    fireworks: 15,
    sparkRain: 150
  }),
  stress: effect(8000, "fixed", "multi-stage-offscreen", "ridiculous", 0.14, 0.86, 1200, 2500, {
    sparks: 1200,
    shards: 390,
    embers: 420,
    smoke: 132,
    shockwaves: 20,
    fireworks: 34,
    sparkRain: 360
  })
};

export const rewardEffectLabels: Record<RewardExplosionKind, string> = {
  daily: "Daily rupture",
  first: "1/4 inertia rupture",
  momentum: "2/4 momentum rupture",
  target: "3/4 target-in-range rupture",
  weekly: "4/4 weekly complete",
  couple: "8/8 couple mega rupture",
  hold: "Hold build-up rupture",
  "screen-shake": "Screen shake test",
  offscreen: "Off-screen epicentre test",
  stress: "Particle stress test"
};

const intensityScale: Record<RewardIntensityLevel, number> = {
  off: 0,
  low: 0.42,
  normal: 0.7,
  high: 1,
  ridiculous: 1.16
};

const activeParticleCaps: Record<RewardEffectQuality, number> = {
  low: 230,
  normal: 400,
  high: 660,
  ridiculous: 940
};

const shakeScale: Record<ScreenShakeLevel, number> = {
  off: 0,
  normal: 1,
  heavy: 1.26,
  ridiculous: 1.58
};

const automaticQuality = getDefaultRewardQuality();

export const defaultRewardExplosionControls: RewardExplosionControls = {
  quality: automaticQuality,
  particleIntensity: automaticQuality,
  shardIntensity: automaticQuality,
  fireworkIntensity: automaticQuality,
  smokeIntensity: automaticQuality === "high" ? "normal" : automaticQuality,
  shockwaveIntensity: automaticQuality,
  distortionIntensity: automaticQuality,
  screenShake: "normal",
  flashIntensity: "high",
  showTriggerPoint: false,
  reducedMotionPreview: false
};

export function getRewardExplosionProfile(
  kind: RewardExplosionKind,
  controls: RewardExplosionControls = defaultRewardExplosionControls,
  timing: RewardExplosionTiming = {}
): RewardExplosionProfile {
  const base = rewardEffectConfig[kind];
  const requestedQuality = controls.reducedMotionPreview ? "low" : controls.quality;
  const duration = resolveRewardEffectDuration(kind, timing.audioDurationMs, timing.durationSource);
  const particleLevel = controls.reducedMotionPreview ? "low" : controls.particleIntensity;
  const shardLevel = controls.reducedMotionPreview ? "low" : controls.shardIntensity;
  const fireworkLevel = controls.reducedMotionPreview ? "low" : controls.fireworkIntensity;
  const smokeLevel = controls.reducedMotionPreview ? "low" : controls.smokeIntensity;
  const shockwaveLevel = controls.reducedMotionPreview ? "low" : controls.shockwaveIntensity;

  return {
    ...base,
    kind,
    label: rewardEffectLabels[kind],
    durationMs: duration.durationMs,
    durationSource: duration.durationSource,
    quality: requestedQuality,
    activeParticleCap: activeParticleCaps[requestedQuality],
    shakeMs: controls.reducedMotionPreview ? 0 : Math.round(base.shakeMs * shakeScale[controls.screenShake]),
    counts: {
      sparks: scaleCount(base.counts.sparks, intensityScale[particleLevel]),
      shards: scaleCount(base.counts.shards, intensityScale[shardLevel]),
      embers: scaleCount(base.counts.embers, intensityScale[particleLevel]),
      smoke: scaleCount(base.counts.smoke, intensityScale[smokeLevel]),
      shockwaves: scaleCount(base.counts.shockwaves, intensityScale[shockwaveLevel]),
      fireworks: scaleCount(base.counts.fireworks, intensityScale[fireworkLevel]),
      sparkRain: scaleCount(base.counts.sparkRain, intensityScale[particleLevel])
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

  if (kind === "daily" || kind === "momentum" || kind === "hold") {
    return tileSecondary;
  }

  if (kind === "first") {
    return [
      epicentre("tile", centre.x, centre.y),
      epicentre("top-left-viewport", width * 0.08, height * 0.18),
      epicentre("top-right-viewport", width * 0.92, height * 0.2),
      epicentre("left-edge-offscreen", -width * 0.1, height * 0.46, true)
    ];
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
  for (let index = 0; index < profile.counts.fireworks; index += 1) {
    const progress = profile.counts.fireworks === 1 ? 0 : index / (profile.counts.fireworks - 1);
    events.push({
      atMs: secondaryStart + (secondaryEnd - secondaryStart) * progress,
      epicentreIndex: (index + (profile.kind === "couple" ? 3 : 1)) % count,
      kind: "firework",
      strength: index % 4 === 0 ? 1.05 : 0.72
    });
  }

  const rainBursts = Math.round(profile.counts.sparkRain / 24);
  const rainStart = duration * (profile.kind === "couple" ? 0.58 : 0.38);
  const rainEnd = Math.max(rainStart, finalMs - 100);
  for (let index = 0; index < rainBursts; index += 1) {
    const progress = rainBursts === 1 ? 0 : index / (rainBursts - 1);
    events.push({
      atMs: rainStart + (rainEnd - rainStart) * progress,
      epicentreIndex: (index + count - 1) % count,
      kind: "rain",
      strength: index % 3 === 0 ? 0.95 : 0.68
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

export function getDistortionScale(level: RewardIntensityLevel): number {
  return intensityScale[level];
}

function effect(
  durationMs: number,
  durationMode: RewardEffectDefinition["durationMode"],
  epicentreMode: EpicentreMode,
  defaultIntensity: RewardEffectQuality,
  impactAt: number,
  finalBurstAt: number,
  shakeMs: number,
  distortionMs: number,
  counts: ParticleCounts
): RewardEffectDefinition {
  return { durationMs, durationMode, epicentreMode, defaultIntensity, impactAt, finalBurstAt, shakeMs, distortionMs, counts };
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
