import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import {
  feedbackSoundAssets,
  getAchievementFeedback,
  getWorkoutFeedback,
  LEVEL_UP_TRACK_DURATION_MS,
  LEVEL_UP_TRACK_SRC
} from "./rewardFeedback.js";

describe("reward feedback catalog", () => {
  it("uses progressive sound and haptic patterns for workout milestones", () => {
    assert.deepEqual(getWorkoutFeedback({ countAfter: 1, created: true }), {
      sound: "first",
      haptic: [45, 30, 90],
      rewardClass: "reward-first",
      durationMs: 3056
    });
    assert.deepEqual(getWorkoutFeedback({ countAfter: 2, created: true }), {
      sound: "momentum",
      haptic: [35, 25, 55, 25, 80],
      rewardClass: "reward-momentum",
      durationMs: 3187
    });
    assert.deepEqual(getWorkoutFeedback({ countAfter: 3, created: true }), {
      sound: "one-more",
      haptic: [40, 20, 40, 20, 110],
      rewardClass: "reward-pressure",
      durationMs: 6269
    });
    assert.deepEqual(getWorkoutFeedback({ countAfter: 4, created: true }), {
      sound: "weekly-complete",
      haptic: [60, 40, 120, 50, 180],
      rewardClass: "reward-complete",
      durationMs: LEVEL_UP_TRACK_DURATION_MS
    });
  });

  it("uses the dedicated backfill sound for non-milestone calendar sessions", () => {
    assert.deepEqual(getWorkoutFeedback({ countAfter: 0, created: true }), {
      sound: "daily",
      haptic: [35, 20, 60],
      rewardClass: "reward-daily",
      durationMs: 2952
    });

    assert.deepEqual(getWorkoutFeedback({ countAfter: 0, created: true, source: "backfill" }), {
      sound: "backfill",
      haptic: [35, 20, 60],
      rewardClass: "reward-daily",
      durationMs: 2978
    });
  });

  it("falls back to tap feedback when a workout was already logged", () => {
    assert.deepEqual(getWorkoutFeedback({ countAfter: 4, created: false }), {
      sound: "tap",
      haptic: 20,
      rewardClass: "reward-none",
      durationMs: 120
    });
  });

  it("uses the largest feedback pattern for couple completion", () => {
    assert.deepEqual(getAchievementFeedback("couple_week_complete"), {
      sound: "couple-complete",
      haptic: [70, 40, 130, 60, 200, 80, 240],
      durationMs: LEVEL_UP_TRACK_DURATION_MS
    });
  });

  it("uses the long individual completion cue for the weekly target overlay", () => {
    assert.deepEqual(getAchievementFeedback("individual_week_complete"), {
      sound: "individual-complete",
      haptic: [60, 40, 120, 50, 180],
      durationMs: LEVEL_UP_TRACK_DURATION_MS
    });
  });

  it("uses uploaded milestone cues and the level-up track for major completion actions", () => {
    assert.deepEqual(
      Object.fromEntries(Object.entries(feedbackSoundAssets).map(([sound, asset]) => [sound, asset.sourceFile])),
      {
        daily: "battlefield_6_sting.mp3",
        backfill: "warzone_victory.mp3",
        first: "call_of_duty.mp3",
        momentum: "battlefield_4_rank_up.mp3",
        "one-more": "call-of-duty-modern-warfare-2-level-up-track-2.mp3",
        "weekly-complete": "level-up-track.mp3",
        "individual-complete": "level-up-track.mp3",
        "couple-complete": "level-up-track.mp3"
      }
    );

    assert.equal(LEVEL_UP_TRACK_SRC, "/sfx/level-up-track.mp3");
    assert.equal(feedbackSoundAssets["weekly-complete"]?.src, LEVEL_UP_TRACK_SRC);
    assert.equal(feedbackSoundAssets["individual-complete"]?.src, LEVEL_UP_TRACK_SRC);
    assert.equal(feedbackSoundAssets["couple-complete"]?.src, LEVEL_UP_TRACK_SRC);
  });

  it("keeps reward animation durations matched to the MP3 frame lengths", async () => {
    for (const [sound, asset] of Object.entries(feedbackSoundAssets)) {
      const audio = await readFile(new URL(`../../public${asset.src}`, import.meta.url));
      assert.equal(getMp3DurationMs(audio), asset.durationMs, sound);
    }
  });
});

const mpegVersions: Record<number, "1" | "2" | "2.5" | null> = {
  0b00: "2.5",
  0b01: null,
  0b10: "2",
  0b11: "1"
};

const mpegLayers: Record<number, "I" | "II" | "III" | null> = {
  0b00: null,
  0b01: "III",
  0b10: "II",
  0b11: "I"
};

const bitrates: Record<string, number[]> = {
  "1-I": [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 0],
  "1-II": [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0],
  "1-III": [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
  "2-I": [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 0],
  "2-II": [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
  "2-III": [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
};

const sampleRates: Record<"1" | "2" | "2.5", Array<number | null>> = {
  "1": [44100, 48000, 32000, null],
  "2": [22050, 24000, 16000, null],
  "2.5": [11025, 12000, 8000, null]
};

function getMp3DurationMs(audio: Buffer): number {
  let offset = getId3v2Offset(audio);
  let samples = 0;
  let sampleRate: number | null = null;

  while (offset + 4 <= audio.length) {
    if (audio[offset] !== 0xff || (audio[offset + 1] & 0xe0) !== 0xe0) {
      offset += 1;
      continue;
    }

    const header = audio.readUInt32BE(offset);
    const version = mpegVersions[(header >> 19) & 0b11];
    const layer = mpegLayers[(header >> 17) & 0b11];
    const bitrateIndex = (header >> 12) & 0b1111;
    const sampleRateIndex = (header >> 10) & 0b11;
    const padding = (header >> 9) & 0b1;

    if (!version || !layer) {
      offset += 1;
      continue;
    }

    const rate = sampleRates[version][sampleRateIndex];
    const bitrateVersion = version === "1" ? "1" : "2";
    const bitrate = bitrates[`${bitrateVersion}-${layer}`][bitrateIndex] * 1000;

    if (!rate || !bitrate) {
      offset += 1;
      continue;
    }

    const frameSamples = layer === "I" ? 384 : layer === "III" && version !== "1" ? 576 : 1152;
    const frameLength =
      layer === "I"
        ? Math.floor((12 * bitrate) / rate + padding) * 4
        : layer === "III" && version !== "1"
          ? Math.floor((72 * bitrate) / rate + padding)
          : Math.floor((144 * bitrate) / rate + padding);

    samples += frameSamples;
    sampleRate ??= rate;
    offset += frameLength;
  }

  assert.ok(sampleRate, "Expected at least one MP3 frame");
  return Math.round((samples / sampleRate) * 1000);
}

function getId3v2Offset(audio: Buffer): number {
  if (audio.length < 10 || audio.subarray(0, 3).toString("utf8") !== "ID3") {
    return 0;
  }

  return 10 + ((audio[6] & 0x7f) << 21) + ((audio[7] & 0x7f) << 14) + ((audio[8] & 0x7f) << 7) + (audio[9] & 0x7f);
}
