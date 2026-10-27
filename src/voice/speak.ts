import { writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

// ─────────────────────────────────────────────────────────────────────────
// Text → voice, via ElevenLabs. This single step is what makes the demo feel
// alive instead of robotic. It is a plain HTTPS call: we use fetch directly
// so there is no SDK version to keep up with.
//
// Get a key at elevenlabs.io → Profile → API key.
// Pick a voice at elevenlabs.io/app/voice-library and copy its Voice ID.
// ─────────────────────────────────────────────────────────────────────────

const DEFAULT_VOICE = process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM"; // "Rachel" sample voice

/** Synthesize `text` to an mp3 file and return the path. */
export async function synthesize(
  text: string,
  outPath = "out.mp3",
  voiceId = DEFAULT_VOICE,
): Promise<string> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("Set ELEVENLABS_API_KEY in your .env");

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5", // low-latency model — matters for "live"
        voice_settings: { stability: 0.4, similarity_boost: 0.8 },
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`ElevenLabs error ${res.status}: ${await res.text()}`);
  }

  const audio = Buffer.from(await res.arrayBuffer());
  await writeFile(outPath, audio);
  return outPath;
}

/**
 * Play an audio file through the OS. macOS has `afplay` built in.
 * On Linux use `ffplay`/`mpg123`; on Windows wire up your own player.
 */
export function play(path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const player =
      process.platform === "darwin" ? "afplay" :
      process.platform === "linux" ? "ffplay" :
      "afplay";
    const args = player === "ffplay" ? ["-nodisp", "-autoexit", path] : [path];
    const p = spawn(player, args, { stdio: "ignore" });
    p.on("error", reject);
    p.on("close", () => resolve());
  });
}

/** Convenience: say a line out loud in one call. */
export async function speak(text: string, outPath = "out.mp3"): Promise<void> {
  const file = await synthesize(text, outPath);
  await play(file);
}
