import { spawn } from "node:child_process";
import { FFMPEG } from "./util/ffmpeg.js";

// ─────────────────────────────────────────────────────────────────────────
// Make a short, shareable MP4 of a single called moment: a few seconds of the
// match video with the AI commentary as the soundtrack. This is the viral unit
// — "watch this goal, called in Tamil" — the clip people post.
// ─────────────────────────────────────────────────────────────────────────

export interface ClipOptions {
  videoPath: string;
  /** Commentary mp3 to lay over the clip; null → keep the original audio. */
  audioPath: string | null;
  tSeconds: number;
  outPath: string;
  pre?: number;  // seconds before the moment
  post?: number; // seconds after
}

export function makeClip(o: ClipOptions): Promise<void> {
  const pre = o.pre ?? 3;
  const post = o.post ?? 7;
  const start = Math.max(0, o.tSeconds - pre);
  const dur = pre + post;

  const args: string[] = ["-y", "-loglevel", "error", "-ss", String(start), "-t", String(dur), "-i", o.videoPath];
  if (o.audioPath) {
    // video from input 0, audio = the commentary (input 1), trim to the shorter.
    args.push("-i", o.audioPath,
      "-map", "0:v:0", "-map", "1:a:0",
      "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "128k",
      "-vf", "scale=720:-2",
      "-shortest");
  } else {
    args.push("-map", "0:v:0", "-map", "0:a:0?",
      "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "128k",
      "-vf", "scale=720:-2");
  }
  args.push(o.outPath);

  return new Promise((resolve, reject) => {
    const ff = spawn(FFMPEG, args);
    let err = "";
    ff.stderr.on("data", (d) => (err += d));
    ff.on("error", (e) => reject(new Error(`ffmpeg not runnable: ${e.message}`)));
    ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg clip failed (${code}): ${err.slice(0, 200)}`))));
  });
}
