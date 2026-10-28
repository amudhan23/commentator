import { spawn } from "node:child_process";
import { mkdir, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { FFMPEG } from "../util/ffmpeg.js";

// ─────────────────────────────────────────────────────────────────────────
// Pull actual frames out of the video so the agent can SEE the play.
// This is what turns "generic hype" into "he cuts inside onto his left and
// curls it into the far corner" — the commentary is grounded in real pixels.
// ffmpeg does the extraction; we hand the model a short burst of frames
// around each moment so it sees the motion, not a single still.
// ─────────────────────────────────────────────────────────────────────────

export interface Frame {
  /** Seconds into the video this frame is from. */
  t: number;
  /** base64 JPEG, ready to send to a vision model. */
  b64: string;
}

/**
 * Extract `count` frames spanning [tSeconds - pre, tSeconds + post], as a burst
 * that captures the build-up and the moment itself.
 */
export async function extractBurst(
  videoPath: string,
  tSeconds: number,
  opts: { pre?: number; post?: number; count?: number; outDir?: string } = {},
): Promise<Frame[]> {
  const pre = opts.pre ?? 2;
  const post = opts.post ?? 2;
  const count = opts.count ?? 5;
  const start = Math.max(0, tSeconds - pre);
  const span = pre + post;
  const fps = count / span; // frames per second across the window

  const dir = join(opts.outDir ?? "/tmp", `frames-${Math.round(tSeconds * 1000)}`);
  await mkdir(dir, { recursive: true });

  await runFfmpeg([
    "-ss", String(start),
    "-t", String(span),
    "-i", videoPath,
    "-vf", `fps=${fps.toFixed(4)},scale=512:-1`, // small = cheap + fast for vision
    "-frames:v", String(count),
    "-q:v", "4",
    join(dir, "f-%02d.jpg"),
  ]);

  const files = (await readdir(dir)).filter((f) => f.endsWith(".jpg")).sort();
  const frames: Frame[] = [];
  for (let i = 0; i < files.length; i++) {
    const b64 = (await readFile(join(dir, files[i]))).toString("base64");
    frames.push({ t: +(start + i / fps).toFixed(2), b64 });
  }
  return frames;
}

/** Grab a single poster frame (for gallery thumbnails) and write it as a jpg. */
export async function extractPoster(videoPath: string, tSeconds: number, outPath: string): Promise<void> {
  await runFfmpeg([
    "-ss", String(Math.max(0, tSeconds)),
    "-i", videoPath,
    "-frames:v", "1",
    "-vf", "scale=640:-1",
    "-q:v", "3",
    outPath,
  ]);
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ff = spawn(FFMPEG, ["-y", "-loglevel", "error", ...args]);
    let err = "";
    ff.stderr.on("data", (d) => (err += d));
    ff.on("error", (e) => reject(new Error(`ffmpeg not runnable: ${e.message}`)));
    ff.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg failed (${code}): ${err}`)),
    );
  });
}
