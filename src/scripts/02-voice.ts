// DAY-1 SCRIPT #2 — prove you can turn text into a real voice and hear it.
// Run:  npm run voice
//
// Success = your speakers say the line out loud. That is the "voice agent"
// part demystified: it is one API call plus playback.

import { speak } from "../voice/speak.js";

async function main() {
  const line =
    "Oh, and he's through! Just the keeper to beat... AND HE BURIES IT! What a moment!";
  console.log("Speaking:", line);
  await speak(line);
  console.log("Done.");
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
