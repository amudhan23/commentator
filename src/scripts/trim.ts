import { spawn } from "node:child_process";
import { FFMPEG } from "../util/ffmpeg.js";

// Trim a clip with the bundled ffmpeg — no separate install needed.
// Usage:  npm run trim -- <input> <startSeconds> <durationSeconds> [output]
// Example: npm run trim -- arsVsReal.mp4 60 120 short.mp4   (2 min starting at 1:00)

const [input, start, dur, out = "short.mp4"] = process.argv.slice(2);
if (!input || start === undefined || dur === undefined) {
  console.error("Usage: npm run trim -- <input> <startSeconds> <durationSeconds> [output]");
  console.error("Example: npm run trim -- arsVsReal.mp4 60 120 short.mp4");
  process.exit(1);
}

console.log(`Trimming ${input}: ${dur}s starting at ${start}s → ${out}`);
const ff = spawn(FFMPEG, [
  "-y", "-ss", String(start), "-i", input, "-t", String(dur),
  "-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac", out,
], { stdio: ["ignore", "ignore", "inherit"] });
ff.on("error", (e) => { console.error("ffmpeg error:", e.message); process.exit(1); });
ff.on("close", (code) => {
  if (code === 0) console.log(`Done → ${out}. Now: npm run track -- ./${out} drury ta football`);
  else { console.error(`ffmpeg failed (${code})`); process.exit(1); }
});

export {};
