// Lists the ElevenLabs voices your key can use, so you set valid voice IDs on
// your commentators. Run:  npm run voices
import { listVoices } from "../voice/speak.js";

async function main() {
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error("Set ELEVENLABS_API_KEY in .env first (elevenlabs.io → Profile).");
    process.exit(1);
  }
  const voices = await listVoices();
  if (!voices.length) {
    console.log("No voices found for this key.");
    return;
  }
  console.log(`\nVoices your key can use (${voices.length}):\n`);
  for (const v of voices) {
    const tags = v.labels ? Object.values(v.labels).filter(Boolean).join(", ") : "";
    console.log(`  ${v.id}   ${v.name}${tags ? "   (" + tags + ")" : ""}`);
  }
  console.log(`\nUse an id in .env (ELEVENLABS_VOICE_ID) or on a commentator in the Commentators tab.\n`);
}

main().catch((e) => {
  console.error("Failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});

export {};
