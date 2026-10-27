// DAY-1 SCRIPT #3 — prove you can find the big moments in a clip's audio,
// with no ML, no training. This is the seed of your actual moat.
// Run:  npm run detect -- ./src/clips/match.mp4
//
// Success = it prints a list of timestamps where the crowd/commentary spiked.
// Eyeball them against the clip: the goals should line up.

import { AudioSpikeDetector } from "../engine/detector.js";

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: npm run detect -- <path-to-clip.mp4>");
    process.exit(1);
  }

  const detector = new AudioSpikeDetector({
    windowSeconds: 0.5,
    thresholdRatio: 1.8, // tune this: lower = more sensitive
    cooldownSeconds: 6,
  });

  console.log("Analyzing audio… (ffmpeg decoding)");
  const moments = await detector.detectFromFile(file);

  if (moments.length === 0) {
    console.log("No spikes found. Try lowering thresholdRatio (e.g. 1.4).");
    return;
  }
  console.log(`\nFound ${moments.length} moment(s):\n`);
  for (const m of moments) {
    const mm = Math.floor(m.tSeconds / 60);
    const ss = String(Math.floor(m.tSeconds % 60)).padStart(2, "0");
    console.log(`  ${mm}:${ss}   intensity ${m.intensity}`);
  }
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
