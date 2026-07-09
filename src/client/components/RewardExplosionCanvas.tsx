import { useEffect, useRef, useState } from "react";
import {
  getRewardExplosionProfile,
  type RewardExplosionOrigin,
  type RewardExplosionRequest,
  type ScreenShakeLevel
} from "../rewardExplosion";

interface RewardExplosionCanvasProps {
  request: RewardExplosionRequest | null;
  onComplete?: () => void;
}

type ParticleType = "spark" | "firework" | "shard" | "ember" | "smoke" | "pre-spark";

interface Particle {
  type: ParticleType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  drag: number;
  delay: number;
  life: number;
  maxLife: number;
  size: number;
  length: number;
  rotation: number;
  spin: number;
  color: string;
  secondaryColor?: string;
  curve: number;
}

interface Shockwave {
  x: number;
  y: number;
  delay: number;
  life: number;
  maxLife: number;
  radius: number;
  speed: number;
  width: number;
  color: string;
}

export function RewardExplosionCanvas({ request, onComplete }: RewardExplosionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeRequest, setActiveRequest] = useState<RewardExplosionRequest | null>(null);

  useEffect(() => {
    if (request) {
      setActiveRequest(request);
    }
  }, [request]);

  useEffect(() => {
    if (!activeRequest) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const controls = {
      ...activeRequest.controls,
      reducedMotionPreview: activeRequest.controls.reducedMotionPreview || prefersReducedMotion
    };
    const profile = getRewardExplosionProfile(activeRequest.kind, controls);
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    const origin = activeRequest.origin ?? getViewportOrigin();
    const particles = createParticles(profile, origin);
    const shockwaves = createShockwaves(profile, origin);
    const shell = document.querySelector(".app-shell");
    const shakeClass = getShakeClass(controls.screenShake, activeRequest.kind);
    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let ratio = 1;
    let finished = false;
    const startedAt = performance.now();

    const resize = () => {
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    if (shakeClass && profile.shakeMs > 0) {
      (shell as HTMLElement | null)?.style.setProperty("--explosion-shake-duration", `${profile.shakeMs}ms`);
      shell?.classList.add(shakeClass);
      window.setTimeout(() => {
        shell?.classList.remove(shakeClass);
        (shell as HTMLElement | null)?.style.removeProperty("--explosion-shake-duration");
      }, profile.shakeMs);
    }

    const draw = (now: number) => {
      const elapsed = now - startedAt;
      context.clearRect(0, 0, width, height);
      drawScreenFlash(context, width, height, elapsed, profile.impactDelayMs, controls.flashIntensity);
      drawPressureBuild(context, origin, elapsed, profile.impactDelayMs);

      context.save();
      context.globalCompositeOperation = "lighter";
      for (const particle of particles) {
        if (particle.type === "spark" || particle.type === "firework" || particle.type === "ember" || particle.type === "pre-spark") {
          drawParticle(context, particle, elapsed);
        }
      }
      for (const shockwave of shockwaves) {
        drawShockwave(context, shockwave, elapsed);
      }
      context.restore();

      context.save();
      context.globalCompositeOperation = "source-over";
      for (const particle of particles) {
        if (particle.type === "smoke" || particle.type === "shard") {
          drawParticle(context, particle, elapsed);
        }
      }
      context.restore();

      if (elapsed < profile.durationMs) {
        animationFrame = window.requestAnimationFrame(draw);
        return;
      }

      if (!finished) {
        finished = true;
        setActiveRequest(null);
        onComplete?.();
      }
    };

    animationFrame = window.requestAnimationFrame(draw);

    return () => {
      finished = true;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      if (shakeClass) {
        shell?.classList.remove(shakeClass);
        (shell as HTMLElement | null)?.style.removeProperty("--explosion-shake-duration");
      }
    };
  }, [activeRequest, onComplete]);

  if (!activeRequest) {
    return null;
  }

  return (
    <div className="reward-explosion-overlay" data-explosion-kind={activeRequest.kind}>
      <canvas ref={canvasRef} className="reward-explosion-canvas" aria-hidden="true" />
      {activeRequest.controls.showTriggerPoint ? <TriggerPoint origin={activeRequest.origin ?? null} /> : null}
    </div>
  );
}

function TriggerPoint({ origin }: { origin: RewardExplosionOrigin | null }) {
  const point = origin ?? getViewportOrigin();
  return <span className="reward-trigger-point" style={{ left: point.x, top: point.y }} aria-hidden="true" />;
}

function createParticles(profile: ReturnType<typeof getRewardExplosionProfile>, origin: RewardExplosionOrigin): Particle[] {
  const particles: Particle[] = [];

  for (let index = 0; index < Math.max(24, Math.round(profile.counts.sparks * 0.16)); index += 1) {
    particles.push(createParticle("pre-spark", origin, {
      delay: random(20, profile.impactDelayMs - 40),
      speed: random(80, 280),
      life: random(160, 360),
      size: random(1.5, 3.2),
      length: random(16, 42)
    }));
  }

  for (let index = 0; index < profile.counts.sparks; index += 1) {
    particles.push(createParticle("spark", origin, {
      delay: profile.impactDelayMs + random(0, 180),
      speed: random(480, 1360),
      life: random(320, 820),
      size: random(1.2, 3),
      length: random(28, 90)
    }));
  }

  for (let index = 0; index < profile.counts.shards; index += 1) {
    particles.push(createParticle("shard", origin, {
      delay: profile.impactDelayMs + random(0, 220),
      speed: random(360, 980),
      life: random(760, 1900),
      size: random(4, 14),
      length: random(8, 24)
    }));
  }

  for (let index = 0; index < profile.counts.embers; index += 1) {
    particles.push(createParticle("ember", origin, {
      delay: profile.impactDelayMs + random(80, 620),
      speed: random(120, 560),
      life: random(1200, 3100),
      size: random(2, 6),
      length: random(5, 12)
    }));
  }

  for (let index = 0; index < profile.counts.smoke; index += 1) {
    particles.push(createParticle("smoke", origin, {
      delay: profile.impactDelayMs + random(120, 900),
      speed: random(45, 220),
      life: random(1400, 3200),
      size: random(18, 58),
      length: random(28, 82)
    }));
  }

  profile.fireworkDelaysMs.slice(0, profile.counts.fireworks).forEach((delay, burstIndex) => {
    const burstOrigin = offsetOrigin(origin, random(58, 170 + burstIndex * 10), random(0, Math.PI * 2));
    const burstParticles = profile.kind === "couple" || profile.kind === "stress" ? 54 : profile.kind === "weekly" ? 42 : 28;
    for (let index = 0; index < burstParticles; index += 1) {
      particles.push(createParticle("firework", burstOrigin, {
        delay: delay + random(0, 70),
        speed: random(260, profile.kind === "couple" || profile.kind === "stress" ? 980 : 720),
        life: random(360, 980),
        size: random(1.2, 3.5),
        length: random(22, 74)
      }));
    }
  });

  return particles;
}

function createShockwaves(profile: ReturnType<typeof getRewardExplosionProfile>, origin: RewardExplosionOrigin): Shockwave[] {
  return Array.from({ length: profile.counts.shockwaves }, (_, index) => ({
    x: origin.x,
    y: origin.y,
    delay: profile.impactDelayMs + index * 110,
    life: 0,
    maxLife: 780 + index * 140,
    radius: 18 + index * 8,
    speed: 0.54 + index * 0.12,
    width: 3 + index * 2,
    color: index === 0 ? "rgba(255,255,255,0.92)" : index % 2 === 0 ? "rgba(255,201,40,0.7)" : "rgba(255,98,24,0.62)"
  }));
}

function createParticle(
  type: ParticleType,
  origin: RewardExplosionOrigin,
  options: { delay: number; speed: number; life: number; size: number; length: number }
): Particle {
  const angle = random(0, Math.PI * 2);
  const speed = options.speed / 1000;
  const verticalBias = type === "smoke" || type === "ember" ? random(-0.38, 0.25) : random(-0.12, 0.12);
  const palette = getPalette(type);

  return {
    type,
    x: origin.x + random(-10, 10),
    y: origin.y + random(-10, 10),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed + verticalBias,
    gravity: type === "shard" ? random(0.00075, 0.00145) : type === "smoke" ? -0.00012 : type === "ember" ? random(0.00005, 0.00028) : random(0.0001, 0.00042),
    drag: type === "smoke" ? 0.994 : type === "ember" ? 0.998 : 0.996,
    delay: Math.max(0, options.delay),
    life: 0,
    maxLife: options.life,
    size: options.size,
    length: options.length,
    rotation: random(0, Math.PI * 2),
    spin: random(-0.018, 0.018),
    color: palette[0],
    secondaryColor: palette[1],
    curve: random(-0.0015, 0.0015)
  };
}

function drawParticle(context: CanvasRenderingContext2D, particle: Particle, elapsed: number) {
  const age = elapsed - particle.delay;
  if (age <= 0 || age >= particle.maxLife) {
    return;
  }

  const progress = age / particle.maxLife;
  const fade = 1 - progress;
  const curvedVx = particle.vx + particle.curve * age;
  const x = particle.x + curvedVx * age;
  const y = particle.y + particle.vy * age + particle.gravity * age * age;
  const rotation = particle.rotation + particle.spin * age;

  if (particle.type === "smoke") {
    context.globalAlpha = Math.max(0, fade * 0.36);
    const radius = particle.size * (0.8 + progress * 1.8);
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(255,142,48,0.22)");
    gradient.addColorStop(0.45, particle.color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
    return;
  }

  if (particle.type === "shard") {
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.globalAlpha = Math.max(0, fade);
    context.fillStyle = particle.color;
    context.strokeStyle = particle.secondaryColor ?? "rgba(255,231,148,0.9)";
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(-particle.size, -particle.length * 0.45);
    context.lineTo(particle.size * 0.8, -particle.length * 0.2);
    context.lineTo(particle.size * 0.35, particle.length * 0.58);
    context.lineTo(-particle.size * 0.7, particle.length * 0.28);
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
    return;
  }

  if (particle.type === "ember") {
    context.globalAlpha = Math.max(0, fade * 0.95);
    context.fillStyle = particle.color;
    context.shadowBlur = 18;
    context.shadowColor = particle.color;
    context.beginPath();
    context.arc(x, y, particle.size * (1 + progress), 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.globalAlpha = 1;
    return;
  }

  context.save();
  context.translate(x, y);
  context.rotate(Math.atan2(particle.vy + particle.gravity * age, curvedVx) + Math.PI / 2);
  context.globalAlpha = Math.max(0, fade);
  const gradient = context.createLinearGradient(0, -particle.length, 0, particle.length * 0.15);
  gradient.addColorStop(0, particle.secondaryColor ?? "#ffffff");
  gradient.addColorStop(0.28, particle.color);
  gradient.addColorStop(1, "rgba(255,80,24,0)");
  context.fillStyle = gradient;
  context.fillRect(-particle.size / 2, -particle.length, particle.size, particle.length);
  context.restore();
}

function drawShockwave(context: CanvasRenderingContext2D, shockwave: Shockwave, elapsed: number) {
  const age = elapsed - shockwave.delay;
  if (age <= 0 || age >= shockwave.maxLife) {
    return;
  }

  const progress = age / shockwave.maxLife;
  context.globalAlpha = 1 - progress;
  context.strokeStyle = shockwave.color;
  context.lineWidth = shockwave.width * (1 - progress * 0.35);
  context.beginPath();
  context.arc(shockwave.x, shockwave.y, shockwave.radius + age * shockwave.speed, 0, Math.PI * 2);
  context.stroke();
  context.globalAlpha = 1;
}

function drawScreenFlash(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsed: number,
  impactDelayMs: number,
  flashIntensity: "normal" | "high"
) {
  const buildAlpha = elapsed < impactDelayMs ? (elapsed / impactDelayMs) * 0.14 : 0;
  const impactAge = Math.max(0, elapsed - impactDelayMs);
  const whiteFlash = impactAge < 180 ? (1 - impactAge / 180) * (flashIntensity === "high" ? 0.78 : 0.55) : 0;
  const orangeGlow = impactAge < 920 ? (1 - impactAge / 920) * (flashIntensity === "high" ? 0.34 : 0.22) : 0;

  if (buildAlpha > 0) {
    context.fillStyle = `rgba(255,104,24,${buildAlpha})`;
    context.fillRect(0, 0, width, height);
  }

  if (whiteFlash > 0) {
    context.fillStyle = `rgba(255,255,236,${whiteFlash})`;
    context.fillRect(0, 0, width, height);
  }

  if (orangeGlow > 0) {
    context.fillStyle = `rgba(255,103,24,${orangeGlow})`;
    context.fillRect(0, 0, width, height);
  }
}

function drawPressureBuild(context: CanvasRenderingContext2D, origin: RewardExplosionOrigin, elapsed: number, impactDelayMs: number) {
  if (elapsed > impactDelayMs) {
    return;
  }

  const progress = elapsed / impactDelayMs;
  context.save();
  context.globalAlpha = 0.2 + progress * 0.42;
  context.strokeStyle = `rgba(255,201,40,${0.35 + progress * 0.45})`;
  context.lineWidth = 2 + progress * 4;
  context.beginPath();
  context.arc(origin.x, origin.y, 18 + progress * 46, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function getPalette(type: ParticleType): [string, string] {
  if (type === "shard") {
    return ["rgba(40,39,34,0.96)", "rgba(255,226,128,0.94)"];
  }

  if (type === "smoke") {
    return ["rgba(65,58,49,0.44)", "rgba(255,128,44,0.18)"];
  }

  if (type === "ember") {
    return ["rgba(255,94,24,0.95)", "rgba(255,214,68,0.85)"];
  }

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

function getViewportOrigin(): RewardExplosionOrigin {
  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
  };
}

function offsetOrigin(origin: RewardExplosionOrigin, distance: number, angle: number): RewardExplosionOrigin {
  return {
    x: origin.x + Math.cos(angle) * distance,
    y: origin.y + Math.sin(angle) * distance
  };
}

function getShakeClass(screenShake: ScreenShakeLevel, kind: RewardExplosionRequest["kind"]): string | null {
  if (screenShake === "off") {
    return null;
  }

  if (screenShake === "normal") {
    if (kind === "couple" || kind === "stress") {
      return "explosion-shake-ridiculous";
    }

    if (kind === "weekly" || kind === "first" || kind === "hold") {
      return "explosion-shake-heavy";
    }
  }

  return `explosion-shake-${screenShake}`;
}

function random(minimum: number, maximum: number): number {
  return minimum + Math.random() * (maximum - minimum);
}
