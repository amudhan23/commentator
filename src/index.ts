// ─────────────────────────────────────────────────────────────────────────
// THE DEMO — everything wired together on a recorded clip.
// Run:  npm run demo -- ./src/clips/match.mp4
//
// Pipeline:
//   detect moments  ->  generate a commentary line per moment  ->  speak it
//
// This is your week-1 target: ugly but end-to-end. Week 2 is making it
// real-time and tightening the sync. Note how the three stages are cleanly
// separated — detection (the future Rust service) never mixes with the LLM
// or the voice. That separation is what lets you harden the core later
// without touching anything else.
// ─────────────────────────────────────────────────────────────────────────

import { AudioSpikeDetector } from "./engine/detector.js";
import { generateCommentary } from "./commentary/generate.js";
import { synthesize, play } from "./voice/speak.js";
import { PersonaName } from "./commentary/personas.js";

async function main() {
  const file = process.argv[2];
  const persona = (process.argv[3] as PersonaName) ?? "drury";
  if (!file) {
    console.error("Usage: npm run demo -- <clip.mp4> [drury|analyst|neutral]");
    process.exit(1);
  }

  // 1. DETECT — the moat. (Later: a Rust service behind this same call.)
  console.log("Detecting moments…");
  const detector = new AudioSpikeDetector({ thresholdRatio: 1.8 });
  const moments = await detector.detectFromFile(file);
  console.log(`Found ${moments.length} moment(s).`);

  // 2 + 3. For each moment: write the line, speak it.
  // (v1 does these after detection. The real-time version interleaves them
  //  with playback — that's the week-2 upgrade.)
  let i = 0;
  for (const m of moments) {
    i++;
    const line = await generateCommentary(
      { tSeconds: m.tSeconds, intensity: m.intensity },
      { persona },
    );
    const mm = Math.floor(m.tSeconds / 60);
    const ss = String(Math.floor(m.tSeconds % 60)).padStart(2, "0");
    console.log(`\n[${mm}:${ss}] ${line}`);

    const mp3 = await synthesize(line, `moment-${i}.mp3`);
    await play(mp3);
  }

  console.log("\nDemo complete.");
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
