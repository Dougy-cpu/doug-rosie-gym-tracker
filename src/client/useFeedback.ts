import { useCallback, useEffect, useRef, useState } from "react";

const muteStorageKey = "gym-tracker-muted";

export function useFeedback() {
  const [muted, setMutedState] = useState(() => localStorage.getItem(muteStorageKey) === "true");
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    localStorage.setItem(muteStorageKey, String(muted));
  }, [muted]);

  const unlock = useCallback(async () => {
    if (muted || typeof window === "undefined") {
      return;
    }

    const AudioContextConstructor =
      window.AudioContext ??
      (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextConstructor) {
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextConstructor();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }
  }, [muted]);

  const play = useCallback(
    async (kind: "tap" | "success" | "complete") => {
      if (muted) {
        return;
      }

      await unlock();
      const context = audioContextRef.current;
      if (!context) {
        return;
      }

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      const frequency = kind === "complete" ? 220 : kind === "success" ? 440 : 330;
      const duration = kind === "complete" ? 0.22 : 0.12;

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.35, now + duration);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.03);
    },
    [muted, unlock]
  );

  const vibrate = useCallback((pattern: number | number[]) => {
    if ("vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  const setMuted = useCallback((next: boolean) => {
    setMutedState(next);
  }, []);

  return { muted, setMuted, unlock, play, vibrate };
}
