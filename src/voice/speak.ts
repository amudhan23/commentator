import { writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

// ─────────────────────────────────────────────────────────────────────────
// Text → voice, via ElevenLabs. Plain HTTPS, no SDK to keep up with.
//   - Multilingual model by default (so Tamil/Hindi/etc. actually render — the
//     whole point of the product). Override with ELEVENLABS_MODEL.
//   - Retries transient failures (429 / 5xx) with backoff.
//   - Clear errors so a bad voice id / model is obvious, not silent.
// Get a key at elevenlabs.io → Profile. List your voices: `npm run voices`.
// ─────────────────────────────────────────────────────────────────────────

const DEFAULT_VOICE = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // "Rachel"
const MODEL = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";
// Low-latency model for LIVE mode: Flash is ~sub-200ms TTFB and still
// multilingual, so the real voice can keep up with the match. Override with
// ELEVENLABS_LIVE_MODEL (e.g. a Turbo/other model) if you want.
export const LIVE_MODEL = process.env.ELEVENLABS_LIVE_MODEL || "eleven_flash_v2_5";

/** Synthesize `text` to raw mp3 bytes. Throws on failure. */
export async function ttsBuffer(
  text: string,
  voiceId = DEFAULT_VOICE,
  model = MODEL,
): Promise<Buffer> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("Set ELEVENLABS_API_KEY in your .env (elevenlabs.io → Profile).");

  return withRetry(async () => {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: { stability: 0.4, similarity_boost: 0.8 },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      const err = new Error(`ElevenLabs ${res.status} (voice ${voiceId}, model ${model}): ${body.slice(0, 160)}`);
      (err as { status?: number }).status = res.status;
      throw err;
    }
    return Buffer.from(await res.arrayBuffer());
  });
}

/** Synthesize `text` to an mp3 file and return the path. Throws on failure. */
export async function synthesize(
  text: string,
  outPath = "out.mp3",
  voiceId = DEFAULT_VOICE,
): Promise<string> {
  const audio = await ttsBuffer(text, voiceId, MODEL);
  await writeFile(outPath, audio);
  return outPath;
}

async function withRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let delay = 2000;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e: unknown) {
      const status = (e as { status?: number }).status;
      const msg = e instanceof Error ? e.message : String(e);
      const transient = status === 429 || (status && status >= 500) || /network|fetch failed|timeout/i.test(msg);
      if (!transient || i === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
  throw new Error("unreachable");
}

/** List the voices this key can use: [{ id, name, labels }]. */
export async function listVoices(): Promise<Array<{ id: string; name: string; labels?: Record<string, string> }>> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return [];
  const res = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": key } });
  if (!res.ok) throw new Error(`ElevenLabs voices ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = (await res.json()) as { voices?: Array<{ voice_id: string; name: string; labels?: Record<string, string> }> };
  return (data.voices ?? []).map((v) => ({ id: v.voice_id, name: v.name, labels: v.labels }));
}

/** Play an audio file through the OS (afplay on macOS, ffplay on Linux). */
export function play(path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const player = process.platform === "darwin" ? "afplay" : process.platform === "linux" ? "ffplay" : "afplay";
    const args = player === "ffplay" ? ["-nodisp", "-autoexit", path] : [path];
    const p = spawn(player, args, { stdio: "ignore" });
    p.on("error", reject);
    p.on("close", () => resolve());
  });
}

/** Convenience: say a line out loud in one call. */
export async function speak(text: string, outPath = "out.mp3", voiceId = DEFAULT_VOICE): Promise<void> {
  await play(await synthesize(text, outPath, voiceId));
}
