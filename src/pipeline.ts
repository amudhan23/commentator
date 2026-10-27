import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AudioSpikeDetector } from "./engine/detector.js";
import { synthesize } from "./voice/speak.js";
import { PersonaName } from "./commentary/personas.js";
import { langBySlug } from "./commentary/languages.js";
import { extractBurst } from "./vision/frames.js";
import { narrateMoment } from "./vision/narrate.js";
import { geminiText } from "./llm/gemini.js";

// ─────────────────────────────────────────────────────────────────────────
// THE PIPELINE (vision-grounded)
//
// clip -> DETECT moments (audio) -> for each: the agent SEES the frames and
// reports what actually happened -> narrate THAT in persona+language -> TTS
// -> emit a MANIFEST the UI plays in sync, plus the agent's memory for Q&A.
//
// The difference from the skeleton: commentary is now tied to real pixels.
// "He drives into the box and finishes low across the keeper" — because the
// agent watched it — instead of "what a moment!".
// ─────────────────────────────────────────────────────────────────────────

export interface ManifestEvent {
  t: number;
  /** The commentary line (persona + language). */
  text: string;
  /** What the agent actually saw — shown in the UI, powers Q&A. */
  saw: string;
  eventType: string;
  significance: number;
  onScreen?: string;
  audio: string | null;
}

export interface Manifest {
  video: string | null;
  persona: PersonaName;
  langSlug: string;
  bcp47: string;
  generatedAt: string;
  events: ManifestEvent[];
}

export interface PipelineOptions {
  clipPath: string;
  persona: PersonaName;
  langSlug: string;
  outDir?: string;
  mock?: boolean;
  /** Minimum vision significance to keep a moment (filters out false spikes). */
  minSignificance?: number;
  /** Max moments to analyze (strongest by audio intensity). Saves API calls. */
  maxMoments?: number;
}

export async function buildTrack(opts: PipelineOptions): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Set GEMINI_API_KEY in .env (free key at aistudio.google.com).");
  }

  // Preflight: one tiny call so a bad key/model/endpoint fails loudly up front,
  // before we spend time on ffmpeg + vision for every moment.
  try {
    await geminiText("Reply with the single word OK.", ["ping"], 64);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Gemini preflight failed — the API rejected a basic request.\n` +
        `This is usually the model name or the key. Full error:\n${msg}`,
    );
  }
  const outDir = opts.outDir ?? "public";
  const lang = langBySlug(opts.langSlug);
  const mock = opts.mock || !process.env.ELEVENLABS_API_KEY; // no voice key = browser voice
  const minSig = opts.minSignificance ?? 0.25;

  // 1. DETECT candidate moments from audio (cheap, fast).
  const detector = new AudioSpikeDetector({ thresholdRatio: 1.7 });
  const all = await detector.detectFromFile(opts.clipPath);

  // Cap to the strongest N by intensity (saves free-tier calls, keeps the demo
  // tight), then put them back in time order for the agent to watch.
  const max = opts.maxMoments ?? (Number(process.env.MAX_MOMENTS) || 8);
  const candidates = [...all]
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, max)
    .sort((a, b) => a.tSeconds - b.tSeconds);
  console.log(`Audio flagged ${all.length}; looking at the top ${candidates.length} by intensity…`);

  const audioDir = join(outDir, "audio");
  await mkdir(audioDir, { recursive: true });

  const events: ManifestEvent[] = [];
  let i = 0;
  for (const c of candidates) {
    try {
      // 2 + 3. SEE and NARRATE in ONE call — the agent watches the frames,
      // works out what happened, and writes the commentary together.
      const frames = await extractBurst(opts.clipPath, c.tSeconds, { count: 5 });
      const m = await narrateMoment(frames, { persona: opts.persona, language: lang.name });

      // Filter: a loud crowd during a throw-in is not a moment. Vision decides.
      if (m.significance < minSig || m.eventType === "nothing") {
        console.log(`  [${fmt(c.tSeconds)}] skipped (${m.eventType}, sig ${m.significance})`);
        continue;
      }

      // 4. VOICE (unless mock).
      i++;
      let audio: string | null = null;
      if (!mock) {
        const file = `${opts.persona}-${lang.slug}-${i}.mp3`;
        await synthesize(m.commentary, join(audioDir, file));
        audio = `audio/${file}`;
      }

      console.log(`  [${fmt(c.tSeconds)}] ${m.eventType}: ${m.commentary}`);
      events.push({
        t: c.tSeconds,
        text: m.commentary,
        saw: m.description,
        eventType: m.eventType,
        significance: m.significance,
        onScreen: m.onScreen,
        audio,
      });
    } catch (e) {
      // One moment failing (e.g. the server stayed overloaded through every
      // retry) shouldn't throw away the whole run — skip it, keep the rest.
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`  [${fmt(c.tSeconds)}] skipped (error: ${msg})`);
    }
  }

  const manifest: Manifest = {
    video: opts.clipPath,
    persona: opts.persona,
    langSlug: lang.slug,
    bcp47: lang.bcp47,
    generatedAt: new Date().toISOString(),
    events,
  };

  const tracksDir = join(outDir, "tracks");
  await mkdir(tracksDir, { recursive: true });
  const name = `manifest.${opts.persona}.${lang.slug}.json`;
  await writeFile(join(tracksDir, name), JSON.stringify(manifest, null, 2));
  console.log(`\nKept ${events.length} real moment(s). Wrote ${join(tracksDir, name)}${mock ? "  (browser voice)" : ""}`);
  return name;
}

function fmt(sec: number): string {
  const mm = Math.floor(sec / 60);
  const ss = String(Math.floor(sec % 60)).padStart(2, "0");
  return `${mm}:${ss}`;
}

// CLI:  npm run track -- <clip> <persona> <langSlug>
// Cross-platform "was this file run directly?" check (Windows file:// URLs
// don't string-match process.argv[1], so compare resolved OS paths instead).
const runDirectly =
  !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (runDirectly) {
  const [clip, persona = "drury", langSlug = "en"] = process.argv.slice(2);
  if (!clip) {
    console.error("Usage: npm run track -- <clip.mp4> [drury|analyst|neutral] [en|ta|hi|es|pt]");
    process.exit(1);
  }
  buildTrack({ clipPath: clip, persona: persona as PersonaName, langSlug }).catch((e) => {
    console.error("Failed:", e.message);
    process.exit(1);
  });
}
