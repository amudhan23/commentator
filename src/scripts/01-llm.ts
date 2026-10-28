// DAY-1 SCRIPT #1 — prove you can call an LLM and get text back.
// Run:  npm run llm
//
// Success = you see a commentary line printed. That is it. One concept down.

import { generateCommentary } from "../commentary/generate.js";
import { getPersona } from "../commentary/personas.js";

async function main() {
  const drury = await getPersona("drury");
  const line = await generateCommentary(
    { tSeconds: 67 * 60, intensity: 2.4, note: "striker through on goal, one-on-one with the keeper" },
    { style: drury.style, language: "English" },
  );
  console.log("\n🎙️  Commentary:\n" + line + "\n");
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
