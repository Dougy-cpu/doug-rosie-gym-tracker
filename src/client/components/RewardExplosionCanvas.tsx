import { useEffect, useRef, useState } from "react";
import {
  buildRewardBurstTimeline,
  getRewardEpicentres,
  getRewardExplosionProfile,
  type RewardBurstEvent,
  type RewardEffectMetrics,
  type RewardEpicentre,
  type RewardExplosionRequest,
  type ScreenShakeLevel
} from "../rewardExplosion";

interface RewardExplosionCanvasProps {
  request: RewardExplosionRequest | null;
  onComplete?: () => void;
  onMetrics?: (metrics: RewardEffectMetrics) => void;
}

type ParticleType = "spark" | "firework" | "shard" | "ember" | "smoke" | "pre-spark";

interface Particle {
  type: ParticleType;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  vx: number;
  vy: number;
  gravity: number;
  drag: number;
  age: number;
  maxLife: number;
  size: number;
  length: number;
  rotation: number;
  spin: number;
  color: string;
  secondaryColor: string;
}

interface Shockwave {
  x: number;
  y: number;
  age: number;
  maxLife: number;
  radius: number;
  speed: number;
  width: number;
  color: string;
}

interface FlashBurst {
  age: number;
  strength: number;
}

const emptyMetrics: RewardEffectMetrics = {
  active: false,
  activeParticles: 0,
  averageFrameMs: 0,
  fps: 0,
  quality: "normal",
  durationMs: 0,
  durationSource: "fixed",
  progress: 0,
  performanceGuardActive: false
};

export function RewardExplosionCanvas({ request, onComplete, onMetrics }: RewardExplosionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onMetricsRef = useRef(onMetrics);
  const [activeRequest, setActiveRequest] = useState<RewardExplosionRequest | null>(null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onMetricsRef.current = onMetrics;
  }, [onComplete, onMetrics]);

  useEffect(() => {
    setActiveRequest(request);
  }, [request]);

  useEffect(() => {
    if (!activeRequest) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const controls = {
      ...activeRequest.controls,
      reducedMotionPreview: activeRequest.controls.reducedMotionPreview || prefersReducedMotion
    };
    const profile = getRewardExplosionProfile(activeRequest.kind, controls, activeRequest);
    const particles: Particle[] = [];
    const particlePool: Particle[] = [];
    const shockwaves: Shockwave[] = [];
    const flashes: FlashBurst[] = [];
    const smokeSprite = createSmokeSprite();
    const shell = document.querySelector(".app-shell");
    const shakeClass = getShakeClass(controls.screenShake, activeRequest.kind);
    let width = 0;
    let height = 0;
    let ratio = 1;
    let epicentres: RewardEpicentre[] = [];
    let timeline: RewardBurstEvent[] = [];
    let nextBurstIndex = 0;
    let animationFrame = 0;
    let shakeTimer = 0;
    let startedAt = performance.now();
    let previousFrameAt = startedAt;
    let pausedAt: number | null = null;
    let averageFrameMs = 16.7;
    let lastMetricAt = 0;
    let lastGuardAt = 0;
    let adaptiveSpawnScale = 1;
    let performanceGuardActive = false;
    let finished = false;

    const resize = () => {
      const qualityRatio = profile.quality === "low" ? 1 : profile.quality === "normal" ? 1.5 : 2;
      ratio = Math.min(window.devicePixelRatio || 1, qualityRatio);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      epicentres = getRewardEpicentres(activeRequest.kind, width, height, activeRequest.origin);
      timeline = buildRewardBurstTimeline(profile, epicentres.length);
    };

    const reportMetrics = (elapsed: number, force = false) => {
      if (!force && elapsed - lastMetricAt < 280) {
        return;
      }

      lastMetricAt = elapsed;
      onMetricsRef.current?.({
        active: true,
        activeParticles: particles.length,
        averageFrameMs: Math.round(averageFrameMs * 10) / 10,
        fps: Math.round(1000 / Math.max(1, averageFrameMs)),
        quality: profile.quality,
        durationMs: profile.durationMs,
        durationSource: profile.durationSource,
        progress: Math.min(1, elapsed / profile.durationMs),
        performanceGuardActive
      });
    };

    const restartShake = (strength: number) => {
      if (!shakeClass || profile.shakeMs <= 0) {
        return;
      }

      window.clearTimeout(shakeTimer);
      shell?.classList.remove(shakeClass);
      void (shell as HTMLElement | null)?.offsetWidth;
      (shell as HTMLElement | null)?.style.setProperty(
        "--explosion-shake-duration",
        `${Math.max(260, Math.round(profile.shakeMs * Math.min(1, strength)))}ms`
      );
      shell?.classList.add(shakeClass);
      shakeTimer = window.setTimeout(() => {
        shell?.classList.remove(shakeClass);
        (shell as HTMLElement | null)?.style.removeProperty("--explosion-shake-duration");
      }, profile.shakeMs + 80);
    };

    const spawnTimelineEvent = (event: RewardBurstEvent) => {
      const origin = epicentres[event.epicentreIndex] ?? epicentres[0];
      if (!origin) {
        return;
      }

      spawnBurst({
        event,
        origin,
        viewport: { x: width * 0.5, y: height * 0.5 },
        profile,
        particles,
        particlePool,
        shockwaves,
        activeCap: profile.activeParticleCap,
        spawnScale: adaptiveSpawnScale,
        timelineLength: timeline.length
      });

      if (event.kind === "impact" || event.kind === "final") {
        flashes.push({ age: 0, strength: event.strength });
        restartShake(event.kind === "final" ? 0.72 : event.strength);
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden && pausedAt === null) {
        pausedAt = performance.now();
        return;
      }

      if (!document.hidden && pausedAt !== null) {
        const now = performance.now();
        startedAt += now - pausedAt;
        previousFrameAt = now;
        pausedAt = null;
      }
    };

    const draw = (now: number) => {
      if (document.hidden) {
        animationFrame = window.requestAnimationFrame(draw);
        return;
      }

      const elapsed = now - startedAt;
      const frameMs = Math.min(50, Math.max(1, now - previousFrameAt));
      previousFrameAt = now;
      averageFrameMs = averageFrameMs * 0.92 + frameMs * 0.08;

      if (elapsed > 800 && averageFrameMs > 23 && elapsed - lastGuardAt > 850 && adaptiveSpawnScale > 0.36) {
        adaptiveSpawnScale = Math.max(0.36, adaptiveSpawnScale * 0.8);
        performanceGuardActive = true;
        lastGuardAt = elapsed;
      }

      while (nextBurstIndex < timeline.length && timeline[nextBurstIndex].atMs <= elapsed) {
        spawnTimelineEvent(timeline[nextBurstIndex]);
        nextBurstIndex += 1;
      }

      context.clearRect(0, 0, width, height);
      drawPressureBuild(context, epicentres, elapsed, profile.durationMs * profile.impactAt);
      updateFlashes(flashes, frameMs);
      drawScreenFlashes(context, width, height, flashes, controls.flashIntensity);
      updateParticles(particles, particlePool, frameMs);
      updateShockwaves(shockwaves, frameMs);

      context.save();
      context.globalCompositeOperation = "source-over";
      for (const particle of particles) {
        if (particle.type === "smoke") {
          drawSmoke(context, particle, smokeSprite);
        } else if (particle.type === "shard") {
          drawShard(context, particle);
        }
      }
      context.restore();

      context.save();
      context.globalCompositeOperation = "lighter";
      for (const particle of particles) {
        if (particle.type !== "smoke" && particle.type !== "shard") {
          drawLuminousParticle(context, particle);
        }
      }
      for (const shockwave of shockwaves) {
        drawShockwave(context, shockwave);
      }
      if (controls.showTriggerPoint) {
        drawEpicentreMarkers(context, epicentres);
      }
      context.restore();

      reportMetrics(elapsed);

      if (elapsed < profile.durationMs) {
        animationFrame = window.requestAnimationFrame(draw);
        return;
      }

      if (!finished) {
        finished = true;
        onMetricsRef.current?.({ ...emptyMetrics, quality: profile.quality, durationMs: profile.durationMs, durationSource: profile.durationSource });
        setActiveRequest(null);
        onCompleteRef.current?.();
      }
    };

    resize();
    reportMetrics(0, true);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibilityChange);
    animationFrame = window.requestAnimationFrame(draw);

    return () => {
      finished = true;
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(shakeTimer);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      shell?.classList.remove(shakeClass ?? "");
      (shell as HTMLElement | null)?.style.removeProperty("--explosion-shake-duration");
      particles.length = 0;
      particlePool.length = 0;
      shockwaves.length = 0;
      flashes.length = 0;
      onMetricsRef.current?.({ ...emptyMetrics, quality: profile.quality, durationMs: profile.durationMs, durationSource: profile.durationSource });
    };
  }, [activeRequest]);

  if (!activeRequest) {
    return null;
  }

  return (
    <div className="reward-explosion-overlay" data-explosion-kind={activeRequest.kind}>
      <canvas ref={canvasRef} className="reward-explosion-canvas" aria-hidden="true" />
    </div>
  );
}

function spawnBurst({
  event,
  origin,
  viewport,
  profile,
  particles,
  particlePool,
  shockwaves,
  activeCap,
  spawnScale,
  timelineLength
}: {
  event: RewardBurstEvent;
  origin: RewardEpicentre;
  viewport: { x: number; y: number };
  profile: ReturnType<typeof getRewardExplosionProfile>;
  particles: Particle[];
  particlePool: Particle[];
  shockwaves: Shockwave[];
  activeCap: number;
  spawnScale: number;
  timelineLength: number;
}) {
  const remainingCapacity = Math.max(0, activeCap - particles.length);
  if (remainingCapacity === 0) {
    return;
  }

  const weight = Math.max(0.25, event.strength);
  const base = 1 / Math.max(1, timelineLength - 2);
  const requested = {
    sparks: Math.max(4, Math.round(profile.counts.sparks * base * weight * spawnScale)),
    shards: event.kind === "charge" ? 0 : Math.round(profile.counts.shards * base * weight * spawnScale),
    embers: Math.max(2, Math.round(profile.counts.embers * base * weight * spawnScale)),
    smoke: event.kind === "charge" ? 0 : Math.round(profile.counts.smoke * base * weight * spawnScale)
  };
  let budget = remainingCapacity;

  budget -= spawnParticleGroup("spark", requested.sparks, budget, origin, viewport, particles, particlePool, event.kind);
  budget -= spawnParticleGroup("shard", requested.shards, budget, origin, viewport, particles, particlePool, event.kind);
  budget -= spawnParticleGroup("ember", requested.embers, budget, origin, viewport, particles, particlePool, event.kind);
  budget -= spawnParticleGroup("smoke", requested.smoke, budget, origin, viewport, particles, particlePool, event.kind);

  if (event.kind === "firework") {
    spawnParticleGroup("firework", Math.min(budget, Math.round(22 * event.strength * spawnScale)), budget, origin, viewport, particles, particlePool, event.kind);
  }

  if (event.kind !== "charge") {
    const ringCount = event.kind === "impact" || event.kind === "final" ? Math.min(3, profile.counts.shockwaves) : 1;
    for (let index = 0; index < ringCount; index += 1) {
      shockwaves.push({
        x: origin.x,
        y: origin.y,
        age: -index * 90,
        maxLife: 760 + index * 180,
        radius: 16 + index * 9,
        speed: 0.48 + event.strength * 0.16 + index * 0.08,
        width: 2.5 + event.strength * 1.4 + index,
        color: index === 0 ? "rgba(255,255,245,0.92)" : index % 2 === 0 ? "rgba(255,201,40,0.72)" : "rgba(255,91,24,0.66)"
      });
    }
  }
}

function spawnParticleGroup(
  type: ParticleType,
  requestedCount: number,
  budget: number,
  origin: RewardEpicentre,
  viewport: { x: number; y: number },
  particles: Particle[],
  particlePool: Particle[],
  burstKind: RewardBurstEvent["kind"]
): number {
  const count = Math.max(0, Math.min(requestedCount, budget));
  for (let index = 0; index < count; index += 1) {
    particles.push(acquireParticle(type, origin, viewport, particlePool, burstKind));
  }
  return count;
}

function acquireParticle(
  type: ParticleType,
  origin: RewardEpicentre,
  viewport: { x: number; y: number },
  pool: Particle[],
  burstKind: RewardBurstEvent["kind"]
): Particle {
  const particle = pool.pop() ?? ({} as Particle);
  const inwardAngle = Math.atan2(viewport.y - origin.y, viewport.x - origin.x);
  const angle = origin.offscreen && Math.random() < 0.82 ? inwardAngle + random(-0.72, 0.72) : random(0, Math.PI * 2);
  const speedRange = getSpeedRange(type, burstKind);
  const speed = random(speedRange[0], speedRange[1]);
  const palette = getPalette(type);

  particle.type = type;
  particle.x = origin.x + random(-9, 9);
  particle.y = origin.y + random(-9, 9);
  particle.previousX = particle.x;
  particle.previousY = particle.y;
  particle.vx = Math.cos(angle) * speed;
  particle.vy = Math.sin(angle) * speed + (type === "smoke" ? random(-0.08, -0.02) : 0);
  particle.gravity = type === "shard" ? random(0.00055, 0.0011) : type === "smoke" ? -0.00005 : type === "ember" ? random(0.00004, 0.0002) : random(0.00008, 0.0003);
  particle.drag = type === "smoke" ? 0.965 : type === "ember" ? 0.985 : 0.978;
  particle.age = 0;
  particle.maxLife = getLife(type);
  particle.size = type === "smoke" ? random(22, 58) : type === "shard" ? random(4, 11) : random(1.3, 3.4);
  particle.length = type === "smoke" ? random(28, 72) : type === "shard" ? random(9, 24) : random(20, 70);
  particle.rotation = random(0, Math.PI * 2);
  particle.spin = random(-0.012, 0.012);
  particle.color = palette[0];
  particle.secondaryColor = palette[1];
  return particle;
}

function updateParticles(particles: Particle[], pool: Particle[], frameMs: number) {
  const frameScale = frameMs / 16.7;
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    particle.age += frameMs;
    if (particle.age >= particle.maxLife) {
      const last = particles.pop();
      if (last && index < particles.length) {
        particles[index] = last;
      }
      pool.push(particle);
      continue;
    }

    particle.previousX = particle.x;
    particle.previousY = particle.y;
    particle.vx *= Math.pow(particle.drag, frameScale);
    particle.vy = particle.vy * Math.pow(particle.drag, frameScale) + particle.gravity * frameMs;
    particle.x += particle.vx * frameMs;
    particle.y += particle.vy * frameMs;
    particle.rotation += particle.spin * frameMs;
  }
}

function updateShockwaves(shockwaves: Shockwave[], frameMs: number) {
  for (let index = shockwaves.length - 1; index >= 0; index -= 1) {
    shockwaves[index].age += frameMs;
    if (shockwaves[index].age >= shockwaves[index].maxLife) {
      shockwaves.splice(index, 1);
    }
  }
}

function updateFlashes(flashes: FlashBurst[], frameMs: number) {
  for (let index = flashes.length - 1; index >= 0; index -= 1) {
    flashes[index].age += frameMs;
    if (flashes[index].age >= 900) {
      flashes.splice(index, 1);
    }
  }
}

function drawLuminousParticle(context: CanvasRenderingContext2D, particle: Particle) {
  const fade = Math.max(0, 1 - particle.age / particle.maxLife);
  context.globalAlpha = fade;

  if (particle.type === "ember") {
    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.size * (0.8 + fade), 0, Math.PI * 2);
    context.fill();
    return;
  }

  context.strokeStyle = particle.color;
  context.lineWidth = particle.size;
  context.lineCap = "round";
  context.beginPath();
  const trailScale = Math.min(1, particle.length / Math.max(1, Math.hypot(particle.x - particle.previousX, particle.y - particle.previousY) * 6));
  const trailX = particle.x - (particle.x - particle.previousX) * 6 * trailScale;
  const trailY = particle.y - (particle.y - particle.previousY) * 6 * trailScale;
  context.moveTo(trailX, trailY);
  context.lineTo(particle.x, particle.y);
  context.stroke();
}

function drawShard(context: CanvasRenderingContext2D, particle: Particle) {
  const fade = Math.max(0, 1 - particle.age / particle.maxLife);
  context.save();
  context.translate(particle.x, particle.y);
  context.rotate(particle.rotation);
  context.globalAlpha = fade;
  context.fillStyle = particle.color;
  context.strokeStyle = particle.secondaryColor;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(-particle.size, -particle.length * 0.45);
  context.lineTo(particle.size * 0.85, -particle.length * 0.18);
  context.lineTo(particle.size * 0.3, particle.length * 0.58);
  context.lineTo(-particle.size * 0.72, particle.length * 0.24);
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}

function drawSmoke(context: CanvasRenderingContext2D, particle: Particle, sprite: HTMLCanvasElement) {
  const progress = particle.age / particle.maxLife;
  const fade = Math.max(0, (1 - progress) * 0.44);
  const size = particle.size * (0.8 + progress * 1.8);
  context.globalAlpha = fade;
  context.drawImage(sprite, particle.x - size, particle.y - size, size * 2, size * 2);
  context.globalAlpha = 1;
}

function drawShockwave(context: CanvasRenderingContext2D, shockwave: Shockwave) {
  if (shockwave.age <= 0) {
    return;
  }

  const progress = shockwave.age / shockwave.maxLife;
  context.globalAlpha = Math.max(0, 1 - progress);
  context.strokeStyle = shockwave.color;
  context.lineWidth = shockwave.width * (1 - progress * 0.4);
  context.beginPath();
  context.arc(shockwave.x, shockwave.y, shockwave.radius + shockwave.age * shockwave.speed, 0, Math.PI * 2);
  context.stroke();
  context.globalAlpha = 1;
}

function drawScreenFlashes(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  flashes: FlashBurst[],
  intensity: "normal" | "high"
) {
  for (const flash of flashes) {
    const white = flash.age < 150 ? (1 - flash.age / 150) * flash.strength * (intensity === "high" ? 0.62 : 0.42) : 0;
    const orange = flash.age < 900 ? (1 - flash.age / 900) * flash.strength * (intensity === "high" ? 0.24 : 0.16) : 0;
    if (white > 0) {
      context.fillStyle = `rgba(255,255,240,${Math.min(0.82, white)})`;
      context.fillRect(0, 0, width, height);
    }
    if (orange > 0) {
      context.fillStyle = `rgba(255,94,24,${Math.min(0.42, orange)})`;
      context.fillRect(0, 0, width, height);
    }
  }
}

function drawPressureBuild(
  context: CanvasRenderingContext2D,
  epicentres: RewardEpicentre[],
  elapsed: number,
  impactAtMs: number
) {
  if (elapsed >= impactAtMs || epicentres.length === 0) {
    return;
  }

  const progress = elapsed / impactAtMs;
  const visibleCentres = epicentres.slice(0, 3);
  context.save();
  for (const origin of visibleCentres) {
    context.globalAlpha = 0.18 + progress * 0.42;
    context.strokeStyle = `rgba(255,201,40,${0.34 + progress * 0.46})`;
    context.lineWidth = 2 + progress * 3;
    context.beginPath();
    context.arc(origin.x, origin.y, 16 + progress * 48, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}

function drawEpicentreMarkers(context: CanvasRenderingContext2D, epicentres: RewardEpicentre[]) {
  context.save();
  context.strokeStyle = "rgba(184,255,56,0.92)";
  context.lineWidth = 1.5;
  for (const point of epicentres) {
    context.beginPath();
    context.arc(point.x, point.y, 10, 0, Math.PI * 2);
    context.moveTo(point.x - 16, point.y);
    context.lineTo(point.x + 16, point.y);
    context.moveTo(point.x, point.y - 16);
    context.lineTo(point.x, point.y + 16);
    context.stroke();
  }
  context.restore();
}

function createSmokeSprite(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  if (!context) {
    return canvas;
  }

  const gradient = context.createRadialGradient(48, 48, 0, 48, 48, 48);
  gradient.addColorStop(0, "rgba(255,139,48,0.28)");
  gradient.addColorStop(0.35, "rgba(76,65,53,0.34)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 96, 96);
  return canvas;
}

function getSpeedRange(type: ParticleType, burstKind: RewardBurstEvent["kind"]): [number, number] {
  const multiplier = burstKind === "final" ? 1.18 : burstKind === "impact" ? 1.08 : 1;
  if (type === "smoke") return [0.035, 0.13];
  if (type === "ember") return [0.08 * multiplier, 0.34 * multiplier];
  if (type === "shard") return [0.22 * multiplier, 0.68 * multiplier];
  if (type === "firework") return [0.2 * multiplier, 0.64 * multiplier];
  return [0.34 * multiplier, 0.9 * multiplier];
}

function getLife(type: ParticleType): number {
  if (type === "smoke") return random(1200, 2600);
  if (type === "ember") return random(900, 2300);
  if (type === "shard") return random(700, 1700);
  return random(360, 940);
}

function getPalette(type: ParticleType): [string, string] {
  if (type === "shard") return ["rgba(43,40,34,0.96)", "rgba(255,226,128,0.94)"];
  if (type === "smoke") return ["rgba(65,58,49,0.44)", "rgba(255,128,44,0.18)"];
  if (type === "ember") return ["rgba(255,82,20,0.96)", "rgba(255,214,68,0.88)"];
  if (type === "firework") {
    const colors: Array<[string, string]> = [
      ["#fff8c8", "#ffc928"],
      ["#ffffff", "#ff7a1f"],
      ["#ffe7a3", "#b8ff38"],
      ["#fff1e0", "#ff4444"]
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  return ["#ffc928", "#ffffff"];
}

function getShakeClass(screenShake: ScreenShakeLevel, kind: RewardExplosionRequest["kind"]): string | null {
  if (screenShake === "off") return null;
  if (screenShake === "normal") {
    if (kind === "couple" || kind === "stress") return "explosion-shake-ridiculous";
    if (kind === "weekly" || kind === "target" || kind === "first" || kind === "hold" || kind === "offscreen") {
      return "explosion-shake-heavy";
    }
  }
  return `explosion-shake-${screenShake}`;
}

function random(minimum: number, maximum: number): number {
  return minimum + Math.random() * (maximum - minimum);
}
