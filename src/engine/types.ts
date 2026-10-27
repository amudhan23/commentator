// ─────────────────────────────────────────────────────────────────────────
// THE MOAT LIVES HERE.
// These types are the contract for your real-time moment-detection engine.
// Today it is backed by a simple TypeScript audio-spike detector.
// Later, you swap the implementation for a Rust service that satisfies the
// SAME interface — nothing else in the app has to change.
// Keep this boundary clean and you never do a rewrite, only a swap.
// ─────────────────────────────────────────────────────────────────────────

/** A single "something is happening" event detected in the match. */
export interface Moment {
  /** Seconds into the clip/stream when the moment peaks. */
  tSeconds: number;
  /** How intense it was (relative). Higher = more likely a goal / big chance. */
  intensity: number;
  /** What kind of signal fired. For v1 everything is "audio-spike". */
  kind: "audio-spike" | "score-change" | "vision";
}

/**
 * The one method the rest of the app depends on.
 * A Rust service, a Python worker, or this TS class — anything that can
 * turn audio into a list of Moments satisfies this. That is the swap point.
 */
export interface MomentDetector {
  /** Analyze an audio or video file and return the moments found in it. */
  detectFromFile(path: string): Promise<Moment[]>;
}
