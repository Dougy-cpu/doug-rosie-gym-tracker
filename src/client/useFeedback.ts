import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedbackSound, HapticPattern } from "./rewardFeedback";

const muteStorageKey = "gym-tracker-muted";

type AudioContextWithWebkit = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

export function useFeedback() {
  const [muted, setMutedState] = useState(() => localStorage.getItem(muteStorageKey) === "true");
  const [unlocked, setUnlocked] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    localStorage.setItem(muteStorageKey, String(muted));
  }, [muted]);

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
    async (kind: FeedbackSound) => {
      if (muted) {
        return;
      }

      try {
        await unlock();
      } catch {
        return;
      }

      const context = audioContextRef.current;
      if (!context) {
        return;
      }

      try {
        playSound(context, kind);
      } catch {
        audioContextRef.current = null;
        setUnlocked(false);
      }
    },
    [muted, unlock]
  );

  const vibrate = useCallback((pattern: HapticPattern) => {
    if ("vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  const setMuted = useCallback((next: boolean) => {
    setMutedState(next);
  }, []);

  return { muted, setMuted, unlocked, unlock, play, vibrate };
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
      await context.resume();
    }

    return context.state === "running";
  } catch {
    return false;
  }
}

function playSound(context: AudioContext, kind: FeedbackSound) {
  const now = context.currentTime;

  if (kind === "tap") {
    tone(context, now, { start: 210, end: 160, duration: 0.07, type: "square", gain: 0.03 });
    return;
  }

  if (kind === "hold-cancel") {
    tone(context, now, { start: 180, end: 82, duration: 0.14, type: "sawtooth", gain: 0.035 });
    return;
  }

  if (kind === "hold-charge") {
    tone(context, now, { start: 95, end: 240, duration: 0.2, type: "sawtooth", gain: 0.035 });
    tone(context, now + 0.04, { start: 360, end: 520, duration: 0.12, type: "triangle", gain: 0.025 });
    return;
  }

  if (kind === "daily") {
    impact(context, now, 95, 0.13);
    tone(context, now + 0.04, { start: 340, end: 720, duration: 0.16, type: "triangle", gain: 0.06 });
    return;
  }

  if (kind === "first") {
    impact(context, now, 72, 0.18);
    tone(context, now + 0.03, { start: 180, end: 620, duration: 0.28, type: "sawtooth", gain: 0.055 });
    tone(context, now + 0.1, { start: 520, end: 880, duration: 0.14, type: "triangle", gain: 0.035 });
    return;
  }

  if (kind === "momentum") {
    impact(context, now, 88, 0.13);
    tone(context, now + 0.03, { start: 220, end: 440, duration: 0.12, type: "square", gain: 0.04 });
    tone(context, now + 0.16, { start: 300, end: 740, duration: 0.16, type: "triangle", gain: 0.045 });
    return;
  }

  if (kind === "one-more") {
    impact(context, now, 62, 0.16);
    tone(context, now + 0.04, { start: 420, end: 260, duration: 0.1, type: "sawtooth", gain: 0.05 });
    tone(context, now + 0.16, { start: 420, end: 760, duration: 0.24, type: "square", gain: 0.045 });
    return;
  }

  if (kind === "weekly-complete") {
    impact(context, now, 52, 0.22);
    tone(context, now + 0.04, { start: 180, end: 520, duration: 0.22, type: "sawtooth", gain: 0.06 });
    tone(context, now + 0.22, { start: 480, end: 1080, duration: 0.32, type: "triangle", gain: 0.045 });
    return;
  }

  impact(context, now, 44, 0.28);
  tone(context, now + 0.03, { start: 150, end: 420, duration: 0.24, type: "sawtooth", gain: 0.07 });
  tone(context, now + 0.18, { start: 360, end: 980, duration: 0.34, type: "triangle", gain: 0.055 });
  tone(context, now + 0.36, { start: 560, end: 1320, duration: 0.28, type: "square", gain: 0.035 });
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
