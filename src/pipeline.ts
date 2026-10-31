import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { AudioSpikeDetector } from "./engine/detector.js";
import { synthesize } from "./voice/speak.js";
import { getPersona, PersonaId } from "./commentary/personas.js";
import { langBySlug } from "./commentary/languages.js";
import { sportById } from "./commentary/sports.js";
import { extractBurst, extractPoster } from "./vision/frames.js";
import { narrateMoment } from "./vision/narrate.js";
import { geminiText } from "./llm/gemini.js";

// ─────────────────────────────────────────────────────────────────────────
// THE PIPELINE (vision-grounded)
//   clip -> DETECT moments (audio) -> SEE+NARRATE each (one vision call) ->
//   TTS -> MANIFEST the UI plays in sync, plus memory for the agent's Q&A.
// ─────────────────────────────────────────────────────────────────────────

export interface ManifestEvent {
  t: number;
  text: string;      // the commentary line
  saw: string;       // what the agent actually saw
  eventType: string;
  significance: number;
  onScreen?: string;
  audio: string | null;
}

export interface Manifest {
  clip: string | null;      // video filename served under clips/
  thumb: string | null;     // poster image served under thumbs/
  persona: PersonaId;
  personaName: string;
  accent: string;
  sport: string;
  sportName: string;
  langSlug: string;
  langName: string;
  bcp47: string;
  generatedAt: string;
  events: ManifestEvent[];
}

export type ProgressEvent =
  | { type: "start"; flagged: number; analyzing: number }
  | { type: "moment"; index: number; t: number; eventType: string; text: string; saw: string }
  | { type: "skip"; t: number; reason: string }
  | { type: "done"; name: string; kept: number; manifest: Manifest }
  | { type: "error"; message: string };

export interface PipelineOptions {
  clipPath: string;
  persona: PersonaId;
  langSlug: string;
  outDir?: string;
  mock?: boolean;
  minSignificance?: number;
  maxMoments?: number;
  sport?: string;
  energy?: string;
  onEvent?: (e: ProgressEvent) => void;
}

export function manifestName(clipPath: string | null, persona: string, langSlug: string): string {
  const clipSlug = clipPath
    ? basename(clipPath, extname(clipPath)).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)
    : "sample";
  return `manifest.${clipSlug}.${persona}.${langSlug}.json`;
}

export async function buildTrack(opts: PipelineOptions): Promise<{ name: string; manifest: Manifest }> {
  const emit = opts.onEvent ?? (() => {});
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Set GEMINI_API_KEY in .env (free key at aistudio.google.com).");
  }

  // Preflight so a bad key/model fails loudly before any heavy work.
  try {
    await geminiText("Reply with the single word OK.", ["ping"], 64);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Gemini preflight failed — usually the model name or the key. Full error:\n${msg}`);
  }

  const outDir = opts.outDir ?? "public";
  const persona = await getPersona(opts.persona);
  const lang = langBySlug(opts.langSlug);
  const sport = sportById(opts.sport || "football");
  const mock = opts.mock || !process.env.ELEVENLABS_API_KEY;
  const minSig = opts.minSignificance ?? 0.25;

  // 1. DETECT candidates from audio, keep the strongest N.
  const detector = new AudioSpikeDetector({ thresholdRatio: 1.7 });
  const all = await detector.detectFromFile(opts.clipPath);
  const max = opts.maxMoments ?? (Number(process.env.MAX_MOMENTS) || 8);
  const candidates = [...all]
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, max)
    .sort((a, b) => a.tSeconds - b.tSeconds);
  emit({ type: "start", flagged: all.length, analyzing: candidates.length });
  console.log(`Audio flagged ${all.length}; analyzing the top ${candidates.length}…`);

  const audioDir = join(outDir, "audio");
  await mkdir(audioDir, { recursive: true });
  const clipFile = basename(opts.clipPath);

  const events: ManifestEvent[] = [];
  let i = 0;
  for (const c of candidates) {
    try {
      const frames = await extractBurst(opts.clipPath, c.tSeconds, { count: 5 });
      const m = await narrateMoment(frames, { style: persona.style, language: lang.name, sportAnalyst: sport.analyst, sportEvents: sport.events, energy: opts.energy });

      if (m.significance < minSig || m.eventType === "nothing") {
        emit({ type: "skip", t: c.tSeconds, reason: m.eventType });
        console.log(`  [${fmt(c.tSeconds)}] skipped (${m.eventType})`);
        continue;
      }

      i++;
      let audio: string | null = null;
      if (!mock) {
        try {
          const file = `${manifestKey(clipFile, persona.id, lang.slug)}-${i}.mp3`;
          await synthesize(m.commentary, join(audioDir, file), persona.voiceId);
          audio = `audio/${file}`;
        } catch (ve) {
          // Voice is a layer, not the point — if TTS fails (bad voice id, quota),
          // keep the moment and let the browser voice speak it instead of losing it.
          console.log(`    (voice skipped: ${ve instanceof Error ? ve.message.slice(0, 120) : ve})`);
        }
      }

      const ev: ManifestEvent = {
        t: c.tSeconds,
        text: m.commentary,
        saw: m.description,
        eventType: m.eventType,
        significance: m.significance,
        onScreen: m.onScreen,
        audio,
      };
      events.push(ev);
      emit({ type: "moment", index: i, t: c.tSeconds, eventType: m.eventType, text: m.commentary, saw: m.description });
      console.log(`  [${fmt(c.tSeconds)}] ${m.eventType}: ${m.commentary}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      emit({ type: "skip", t: c.tSeconds, reason: "error" });
      console.log(`  [${fmt(c.tSeconds)}] skipped (error: ${msg})`);
    }
  }

  // Poster thumbnail for the gallery — a frame from the biggest moment.
  let thumb: string | null = null;
  try {
    const posterT = events.length
      ? [...events].sort((a, b) => b.significance - a.significance)[0].t
      : (candidates[0]?.tSeconds ?? 0);
    const thumbsDir = join(outDir, "thumbs");
    await mkdir(thumbsDir, { recursive: true });
    const thumbFile = `${manifestKey(clipFile, persona.id, lang.slug)}.jpg`;
    await extractPoster(opts.clipPath, posterT, join(thumbsDir, thumbFile));
    thumb = `thumbs/${thumbFile}`;
  } catch { /* thumbnail is best-effort */ }

  const manifest: Manifest = {
    clip: clipFile,
    thumb,
    persona: persona.id,
    personaName: persona.name,
    accent: persona.accent,
    sport: sport.id,
    sportName: sport.name,
    langSlug: lang.slug,
    langName: lang.name,
    bcp47: lang.bcp47,
    generatedAt: new Date().toISOString(),
    events,
  };

  const tracksDir = join(outDir, "tracks");
  await mkdir(tracksDir, { recursive: true });
  const name = manifestName(opts.clipPath, persona.id, lang.slug);
  await writeFile(join(tracksDir, name), JSON.stringify(manifest, null, 2));
  emit({ type: "done", name, kept: events.length, manifest });
  console.log(`\nKept ${events.length} moment(s). Wrote ${join(tracksDir, name)}${mock ? "  (browser voice)" : ""}`);
  return { name, manifest };
}

function manifestKey(clipFile: string, persona: string, langSlug: string): string {
  const clipSlug = basename(clipFile, extname(clipFile)).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  return `${clipSlug}.${persona}.${langSlug}`;
}

function fmt(sec: number): string {
  const mm = Math.floor(sec / 60);
  const ss = String(Math.floor(sec % 60)).padStart(2, "0");
  return `${mm}:${ss}`;
}

// CLI:  npm run track -- <clip> <persona> <langSlug>
const runDirectly =
  !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (runDirectly) {
  const [clip, persona = "drury", langSlug = "en", sport = "football"] = process.argv.slice(2);
  if (!clip) {
    console.error("Usage: npm run track -- <clip.mp4> [persona] [lang] [cricket|football|auto]");
    process.exit(1);
  }
  buildTrack({ clipPath: clip, persona, langSlug, sport }).catch((e) => {
    console.error("Failed:", e.message);
    process.exit(1);
  });
}
