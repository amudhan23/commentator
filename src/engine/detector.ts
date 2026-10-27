import { spawn } from "node:child_process";
import { Moment, MomentDetector } from "./types.js";

// ─────────────────────────────────────────────────────────────────────────
// AudioSpikeDetector
//
// The idea: crowds (and commentators) get LOUD right as something big
// happens — a goal, a big chance, a save. That loudness spike is a shockingly
// good "something matters NOW" signal, and it needs zero ML training.
//
// How it works:
//   1. ffmpeg decodes the file's audio to raw mono PCM (16-bit samples).
//   2. We chop that into short windows (default 0.5s) and compute the RMS
//      energy (loudness) of each window.
//   3. A window counts as a "moment" when it is much louder than the
//      rolling recent average — i.e. a sudden spike, not just a loud match.
//
// This is deliberately simple and readable. It is the FIRST implementation
// of the MomentDetector contract — later you replace it with a Rust service
// doing the same job with lower latency on a live stream.
// ─────────────────────────────────────────────────────────────────────────

const SAMPLE_RATE = 16_000; // 16 kHz mono is plenty for loudness detection

export interface SpikeOptions {
  /** Window length in seconds. Smaller = finer timing, noisier. */
  windowSeconds?: number;
  /** How many times louder than the recent average counts as a spike. */
  thresholdRatio?: number;
  /** Seconds of history the "recent average" looks back over. */
  baselineSeconds?: number;
  /** Minimum gap between reported moments, so one roar isn't 5 events. */
  cooldownSeconds?: number;
}

export class AudioSpikeDetector implements MomentDetector {
  private readonly win: number;
  private readonly threshold: number;
  private readonly baseline: number;
  private readonly cooldown: number;

  constructor(opts: SpikeOptions = {}) {
    this.win = opts.windowSeconds ?? 0.5;
    this.threshold = opts.thresholdRatio ?? 1.8;
    this.baseline = opts.baselineSeconds ?? 8;
    this.cooldown = opts.cooldownSeconds ?? 6;
  }

  async detectFromFile(path: string): Promise<Moment[]> {
    const samples = await decodeToPcm(path);
    return this.detectFromSamples(samples);
  }

  /** Pure function over samples — easy to unit test, no ffmpeg needed. */
  detectFromSamples(samples: Int16Array): Moment[] {
    const perWindow = Math.max(1, Math.floor(SAMPLE_RATE * this.win));
    const baselineWindows = Math.max(1, Math.floor(this.baseline / this.win));
    const cooldownWindows = Math.max(1, Math.floor(this.cooldown / this.win));

    // 1. RMS energy per window.
    const energies: number[] = [];
    for (let i = 0; i < samples.length; i += perWindow) {
      let sum = 0;
      const end = Math.min(i + perWindow, samples.length);
      for (let j = i; j < end; j++) sum += samples[j] * samples[j];
      energies.push(Math.sqrt(sum / (end - i)));
    }

    // 2. Flag windows that jump above their recent rolling average.
    const moments: Moment[] = [];
    let lastHit = -Infinity;
    for (let w = 0; w < energies.length; w++) {
      const from = Math.max(0, w - baselineWindows);
      const hist = energies.slice(from, w);
      if (hist.length < baselineWindows) continue; // need enough history first
      const avg = hist.reduce((a, b) => a + b, 0) / hist.length;
      if (avg <= 0) continue;

      const ratio = energies[w] / avg;
      if (ratio >= this.threshold && w - lastHit >= cooldownWindows) {
        lastHit = w;
        moments.push({
          tSeconds: +(w * this.win).toFixed(2),
          intensity: +ratio.toFixed(2),
          kind: "audio-spike",
        });
      }
    }
    return moments;
  }
}

/**
 * Shell out to ffmpeg to decode any audio/video file into raw PCM samples.
 * ffmpeg does the hard codec work; we just read the bytes.
 * Requires ffmpeg on PATH (`brew install ffmpeg`).
 */
function decodeToPcm(path: string): Promise<Int16Array> {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", [
      "-i", path,
      "-ac", "1", // mono
      "-ar", String(SAMPLE_RATE), // resample
      "-f", "s16le", // raw 16-bit little-endian PCM
      "-", // write to stdout
    ]);

    const chunks: Buffer[] = [];
    ff.stdout.on("data", (c) => chunks.push(c));
    ff.stderr.on("data", () => {}); // ffmpeg logs to stderr; ignore for now
    ff.on("error", (e) =>
      reject(new Error(`Could not run ffmpeg (is it installed?): ${e.message}`)),
    );
    ff.on("close", (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg exited with code ${code}`));
      const buf = Buffer.concat(chunks);
      resolve(new Int16Array(buf.buffer, buf.byteOffset, buf.length / 2));
    });
  });
}
