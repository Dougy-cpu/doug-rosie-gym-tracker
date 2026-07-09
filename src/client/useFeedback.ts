import { useCallback, useEffect, useRef, useState } from "react";
import {
  getFeedbackDurationMs,
  logRewardSoundResolution,
  resolveFeedbackSoundAsset,
  type FeedbackSound,
  type HapticPattern
} from "./rewardFeedback";

const muteStorageKey = "gym-tracker-muted";

type AudioContextWithWebkit = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

export interface FeedbackPlaybackResult {
  started: boolean;
  durationMs: number;
  durationSource: "audio-metadata" | "configured-audio" | "fallback";
  assetSrc: string | null;
}

export function useFeedback() {
  const [muted, setMutedState] = useState(() => localStorage.getItem(muteStorageKey) === "true");
  const [unlocked, setUnlocked] = useState(false);
  const [lastVibrationResult, setLastVibrationResult] = useState<boolean | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
  const vibrationSupported = typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

  useEffect(() => {
    localStorage.setItem(muteStorageKey, String(muted));
  }, [muted]);

  useEffect(() => {
    if (typeof Audio === "undefined") {
      return;
    }

    let cancelled = false;
    void Promise.all(["individual-complete", "couple-complete"].map((sound) => resolveFeedbackSoundAsset(sound as FeedbackSound))).then(
      (assets) => {
        if (cancelled) {
          return;
        }

        for (const asset of assets) {
          if (!asset || audioElementsRef.current[asset.src]) {
            continue;
          }

          const audio = new Audio(asset.src);
          audio.preload = "metadata";
          audio.load();
          audioElementsRef.current[asset.src] = audio;
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const unlock = useCallback(async () => {
    if (muted || typeof window === "undefined") {
      return;
    }

    const AudioContextConstructor = window.AudioContext ?? (window as AudioContextWithWebkit).webkitAudioContext;

    if (!AudioContextConstructor) {
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContextSafely(AudioContextConstructor);
    }

    if (!audioContextRef.current) {
      setUnlocked(false);
      return;
    }

    setUnlocked(await resumeAudioContextSafely(audioContextRef.current));
  }, [muted]);

  const play = useCallback(
    async (kind: FeedbackSound): Promise<FeedbackPlaybackResult> => {
      if (muted) {
        return fallbackPlayback(kind, false);
      }

      try {
        await unlock();
      } catch {
        return fallbackPlayback(kind, false);
      }

      const audioPlayback = await playAudioAsset(kind, audioElementsRef.current);
      if (audioPlayback) {
        setUnlocked(true);
        return audioPlayback;
      }

      const context = audioContextRef.current;
      if (!context) {
        return fallbackPlayback(kind, false);
      }

      try {
        playSound(context, kind);
        return fallbackPlayback(kind, true);
      } catch {
        audioContextRef.current = null;
        setUnlocked(false);
        return fallbackPlayback(kind, false);
      }
    },
    [muted, unlock]
  );

  const vibrate = useCallback((pattern: HapticPattern) => {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
      setLastVibrationResult(false);
      return false;
    }

    try {
      const result = navigator.vibrate(pattern);
      setLastVibrationResult(result);
      return result;
    } catch {
      setLastVibrationResult(false);
      return false;
    }
  }, []);

  const stop = useCallback(() => {
    for (const audio of Object.values(audioElementsRef.current)) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

  const setMuted = useCallback((next: boolean) => {
    setMutedState(next);
  }, []);

  return {
    muted,
    setMuted,
    unlocked,
    unlock,
    play,
    stop,
    vibrate,
    vibrationSupported,
    lastVibrationResult
  };
}

export function createAudioContextSafely(AudioContextConstructor: typeof AudioContext): AudioContext | null {
  try {
    return new AudioContextConstructor();
  } catch {
    return null;
  }
}

export async function resumeAudioContextSafely(context: AudioContext): Promise<boolean> {
  try {
    if (context.state === "suspended") {
      await Promise.race([
        context.resume().catch(() => undefined),
        new Promise<void>((resolve) => globalThis.setTimeout(resolve, 220))
      ]);
    }

    return context.state === "running";
  } catch {
    return false;
  }
}

async function playAudioAsset(
  kind: FeedbackSound,
  audioElements: Record<string, HTMLAudioElement>
): Promise<FeedbackPlaybackResult | null> {
  const asset = await resolveFeedbackSoundAsset(kind);
  logRewardSoundResolution(kind, asset);

  if (!asset || typeof Audio === "undefined") {
    return null;
  }

  const audio = audioElements[asset.src] ?? new Audio(asset.src);
  audioElements[asset.src] = audio;
  audio.preload = "auto";
  audio.volume = kind === "couple-complete" ? 0.94 : kind === "weekly-complete" || kind === "individual-complete" || kind === "level-up-track" ? 0.88 : 0.82;

  try {
    audio.pause();
    audio.currentTime = 0;
    const playResult = await requestAudioPlayback(audio);
    if (playResult === "rejected") {
      return null;
    }
    const measuredDurationMs = getFiniteAudioDurationMs(audio);
    return {
      started: playResult === "started",
      durationMs: measuredDurationMs ?? asset.durationMs,
      durationSource: measuredDurationMs ? "audio-metadata" : "configured-audio",
      assetSrc: asset.src
    };
  } catch {
    return null;
  }
}

async function requestAudioPlayback(audio: HTMLAudioElement): Promise<"started" | "pending" | "rejected"> {
  try {
    const attempt = audio.play();
    if (!attempt) {
      return "started";
    }

    let timerId = 0;
    const result = await Promise.race([
      attempt.then(() => "started" as const).catch(() => "rejected" as const),
      new Promise<"pending">((resolve) => {
        timerId = window.setTimeout(() => resolve("pending"), 220);
      })
    ]);
    window.clearTimeout(timerId);
    return result;
  } catch {
    return "rejected";
  }
}

function getFiniteAudioDurationMs(audio: HTMLAudioElement): number | null {
  return Number.isFinite(audio.duration) && audio.duration >= 0.5 ? Math.round(audio.duration * 1000) : null;
}

function fallbackPlayback(kind: FeedbackSound, started: boolean): FeedbackPlaybackResult {
  return {
    started,
    durationMs: getFeedbackDurationMs(kind),
    durationSource: "fallback",
    assetSrc: null
  };
}

function playSound(context: AudioContext, kind: FeedbackSound) {
  const now = context.currentTime;

  if (kind === "tap") {
    heavyImpact(context, now, 0.28);
    return;
  }

  if (kind === "hold-cancel") {
    heavyImpact(context, now, 0.4);
    return;
  }

  if (kind === "hold-charge") {
    pressureRumble(context, now, 0.55);
    return;
  }

  if (kind === "daily") {
    heavyImpact(context, now, 0.72);
    return;
  }

  if (kind === "first") {
    heavyImpact(context, now, 0.86);
    pressureRumble(context, now + 0.08, 0.34);
    return;
  }

  if (kind === "momentum") {
    heavyImpact(context, now, 0.7);
    heavyImpact(context, now + 0.16, 0.62);
    return;
  }

  if (kind === "one-more") {
    pressureRumble(context, now, 0.42);
    heavyImpact(context, now + 0.12, 0.95);
    return;
  }

  if (kind === "weekly-complete" || kind === "level-up-track") {
    ruptureFallback(context, now, 1);
    return;
  }

  ruptureFallback(context, now, kind === "couple-complete" ? 1.25 : 1.05);
}

function tone(
  context: AudioContext,
  startTime: number,
  options: { start: number; end: number; duration: number; type: OscillatorType; gain: number }
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = options.type;
  oscillator.frequency.setValueAtTime(options.start, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(options.end, startTime + options.duration);
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.exponentialRampToValueAtTime(options.gain, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + options.duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + options.duration + 0.03);
}

function impact(context: AudioContext, startTime: number, frequency: number, duration: number) {
  tone(context, startTime, { start: frequency, end: Math.max(30, frequency * 0.45), duration, type: "sine", gain: 0.09 });
}

function heavyImpact(context: AudioContext, startTime: number, intensity: number) {
  impact(context, startTime, 48 + 26 * intensity, 0.18 + 0.08 * intensity);
  noiseBurst(context, startTime, 0.09 + 0.05 * intensity, 0.035 + 0.035 * intensity);
}

function pressureRumble(context: AudioContext, startTime: number, intensity: number) {
  tone(context, startTime, {
    start: 42,
    end: 66 + 22 * intensity,
    duration: 0.34 + 0.16 * intensity,
    type: "sawtooth",
    gain: 0.018 + 0.025 * intensity
  });
  noiseBurst(context, startTime + 0.04, 0.22 + 0.08 * intensity, 0.018 + 0.018 * intensity);
}

function ruptureFallback(context: AudioContext, startTime: number, intensity: number) {
  heavyImpact(context, startTime, intensity);
  heavyImpact(context, startTime + 0.11, intensity * 0.9);
  noiseBurst(context, startTime + 0.04, 0.42, 0.09 * intensity);
}

function noiseBurst(context: AudioContext, startTime: number, duration: number, gainValue: number) {
  const bufferSize = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < bufferSize; index += 1) {
    channel[index] = (Math.random() * 2 - 1) * (1 - index / bufferSize);
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(700, startTime);
  filter.frequency.exponentialRampToValueAtTime(120, startTime + duration);
  gain.gain.setValueAtTime(gainValue, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start(startTime);
  source.stop(startTime + duration + 0.02);
}
