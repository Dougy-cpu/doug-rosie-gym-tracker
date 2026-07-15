import { useEffect, useRef, type CSSProperties } from "react";
import {
  getDistortionScale,
  getRewardExplosionProfile,
  type RewardExplosionRequest,
  type RewardExplosionOrigin
} from "../rewardExplosion";

interface DistortionRing {
  id: string;
  origin: RewardExplosionOrigin;
  delayMs: number;
  strength: number;
}

export function DistortionShockwave({ request }: { request: RewardExplosionRequest | null }) {
  const layerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!request || request.controls.reducedMotionPreview || request.controls.distortionIntensity === "off") {
      return;
    }

    const layer = layerRef.current;
    if (!layer) {
      return;
    }

    const profile = getRewardExplosionProfile(request.kind, request.controls, request);
    const scale = getDistortionScale(request.controls.distortionIntensity);
    const pulseTimers: number[] = [];
    const pulseAnimations: Animation[] = [];
    const pulseAt = request.kind === "couple"
      ? [profile.durationMs * 0.17, profile.durationMs * profile.impactAt, profile.durationMs * profile.finalBurstAt]
      : [profile.durationMs * profile.impactAt, profile.durationMs * profile.finalBurstAt];

    for (const delay of pulseAt) {
      pulseTimers.push(
        window.setTimeout(() => {
          pulseAnimations.push(
            layer.animate(
              [
                { transform: "scale(1)", opacity: 1 },
                { transform: `scale(${1 + 0.008 * scale})`, opacity: 1, offset: 0.16 },
                { transform: "scale(0.997)", opacity: 0.96, offset: 0.42 },
                { transform: "scale(1.003)", opacity: 1, offset: 0.68 },
                { transform: "scale(1)", opacity: 1 }
              ],
              { duration: 540, easing: "cubic-bezier(0.08, 0.8, 0.2, 1)" }
            )
          );
        }, delay)
      );
    }

    return () => {
      for (const timer of pulseTimers) {
        window.clearTimeout(timer);
      }
      for (const animation of pulseAnimations) {
        animation.cancel();
      }
    };
  }, [request]);

  if (!request || request.controls.reducedMotionPreview || request.controls.distortionIntensity === "off") {
    return null;
  }

  const profile = getRewardExplosionProfile(request.kind, request.controls, request);
  const width = typeof window === "undefined" ? 390 : window.innerWidth;
  const height = typeof window === "undefined" ? 844 : window.innerHeight;
  const primaryOrigin = request.origin ?? getDefaultOrigin(request.kind, width, height);
  const rings = getDistortionRings(request, profile.durationMs, primaryOrigin, width, height);
  const scale = getDistortionScale(request.controls.distortionIntensity);

  return (
    <div
      ref={layerRef}
      className={`distortion-shockwave distortion-${request.controls.distortionIntensity}`}
      data-distortion-kind={request.kind}
      aria-hidden="true"
      style={
        {
          "--distortion-strength": scale,
          "--distortion-duration": `${profile.distortionMs}ms`
        } as CSSProperties
      }
    >
      {rings.map((ring) => (
        <span
          className="distortion-ring"
          key={ring.id}
          style={
            {
              "--distortion-x": `${ring.origin.x}px`,
              "--distortion-y": `${ring.origin.y}px`,
              "--distortion-delay": `${Math.round(ring.delayMs)}ms`,
              "--ring-strength": ring.strength
            } as CSSProperties
          }
        >
          <i className="distortion-ring-core" />
          <i className="distortion-ring-red" />
          <i className="distortion-ring-cyan" />
          <i className="distortion-smear" />
        </span>
      ))}
    </div>
  );
}

function getDistortionRings(
  request: RewardExplosionRequest,
  durationMs: number,
  primaryOrigin: RewardExplosionOrigin,
  width: number,
  height: number
): DistortionRing[] {
  const impactAt = durationMs * getRewardExplosionProfile(request.kind, request.controls, request).impactAt;
  const finalAt = durationMs * getRewardExplosionProfile(request.kind, request.controls, request).finalBurstAt;
  const rings: DistortionRing[] = [
    { id: "primary", origin: primaryOrigin, delayMs: impactAt, strength: 1 },
    { id: "primary-echo", origin: primaryOrigin, delayMs: impactAt + 110, strength: 0.72 },
    { id: "final", origin: primaryOrigin, delayMs: finalAt, strength: 1.08 }
  ];

  if (request.kind === "weekly" || request.kind === "target" || request.kind === "offscreen") {
    rings.push(
      { id: "left-edge", origin: { x: -width * 0.1, y: height * 0.27 }, delayMs: durationMs * 0.42, strength: 0.74 },
      { id: "right-edge", origin: { x: width * 1.1, y: height * 0.32 }, delayMs: durationMs * 0.58, strength: 0.78 }
    );
  }

  if (request.kind === "couple" || request.kind === "stress") {
    rings.push(
      { id: "doug-side", origin: { x: width * 0.22, y: height * 0.42 }, delayMs: durationMs * 0.17, strength: 0.92 },
      { id: "rosie-side", origin: { x: width * 0.78, y: height * 0.42 }, delayMs: durationMs * 0.19, strength: 0.92 },
      { id: "top-left", origin: { x: -width * 0.1, y: height * 0.25 }, delayMs: durationMs * 0.6, strength: 0.78 },
      { id: "bottom-right", origin: { x: width * 1.1, y: height * 0.84 }, delayMs: durationMs * 0.72, strength: 0.82 }
    );
  }

  return rings;
}

function getDefaultOrigin(kind: RewardExplosionRequest["kind"], width: number, height: number): RewardExplosionOrigin {
  if (kind === "couple" || kind === "stress") {
    return { x: width * 0.5, y: height * 0.5 };
  }

  return { x: width * 0.5, y: height * 0.46 };
}
