import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

// ─────────────────────────────────────────────────────────────────────────
// Personas = a commentator: a voice + a style. Built-ins ship in code; users
// create their own (the "bring your own commentator" marketplace seed), stored
// in data/personas.json. Everything downstream looks a persona up by id.
//
// `style` is the instruction the model follows. `voiceId` is the ElevenLabs
// voice used to speak it. `accent` tints the UI.
// ─────────────────────────────────────────────────────────────────────────

export type PersonaId = string;

export interface Persona {
  id: PersonaId;
  name: string;      // display name
  tagline: string;   // one line
  style: string;     // the commentary instruction / system prompt
  voiceId: string;   // ElevenLabs voice id
  accent: string;    // UI color
  builtIn: boolean;
}

// Current ElevenLabs default-library voice ids (present on new accounts).
// Run `npm run voices` to see yours; override per-commentator in the UI.
const V = {
  adam: "pNInz6obpgDQGcFmaJgB",      // Adam — dominant, firm (epic)
  daniel: "onwK4e9ZLuTAKqWW03F9",    // Daniel — steady British broadcaster (analyst)
  charlie: "IKne3meq5aSn9XLyUdCD",   // Charlie — deep, confident, energetic (hype)
  river: "SAz9YHcvj6GT2YYXdXww",     // River — relaxed, neutral, informative (neutral)
};

export const BUILT_IN: Persona[] = [
  {
    id: "drury",
    name: "Epic",
    tagline: "Soaring, poetic, goosebumps play-by-play",
    style:
      "An epic, poetic football play-by-play commentator. Big emotion, soaring imagery, " +
      "short punchy lines that build to a crescendo. React to the moment. One or two sentences, no preamble.",
    voiceId: V.adam,
    accent: "#ffb020",
    builtIn: true,
  },
  {
    id: "analyst",
    name: "Analyst",
    tagline: "Calm, tactical, explains why it mattered",
    style:
      "A sharp, calm football analyst. Explain what just happened and why it matters tactically, " +
      "in plain language. One or two sentences, no hype, no preamble.",
    voiceId: V.daniel,
    accent: "#49a7ff",
    builtIn: true,
  },
  {
    id: "hype",
    name: "Hype",
    tagline: "Pure adrenaline, street-energy reactions",
    style:
      "A high-energy hype commentator. Explosive, modern, fan-in-the-stands energy. Short, loud, " +
      "exclamatory reactions to the moment. One or two sentences, no preamble.",
    voiceId: V.charlie,
    accent: "#ff4777",
    builtIn: true,
  },
  {
    id: "neutral",
    name: "Neutral",
    tagline: "Just the facts, cleanly called",
    style:
      "A concise football commentator. State what happened clearly in one sentence. " +
      "No embellishment, no preamble.",
    voiceId: V.river,
    accent: "#8d9bac",
    builtIn: true,
  },
];

const DATA_DIR = "data";
const CUSTOM_FILE = join(DATA_DIR, "personas.json");

async function loadCustom(): Promise<Persona[]> {
  if (!existsSync(CUSTOM_FILE)) return [];
  try {
    const raw = await readFile(CUSTOM_FILE, "utf8");
    const arr = JSON.parse(raw) as Persona[];
    return Array.isArray(arr) ? arr.map((p) => ({ ...p, builtIn: false })) : [];
  } catch {
    return [];
  }
}

/** All personas: built-ins first, then user-created. */
export async function listPersonas(): Promise<Persona[]> {
  const custom = await loadCustom();
  return [...BUILT_IN, ...custom];
}

/** Look up a persona by id (built-in or custom). Throws if unknown. */
export async function getPersona(id: PersonaId): Promise<Persona> {
  const all = await listPersonas();
  const p = all.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown commentator "${id}". Known: ${all.map((x) => x.id).join(", ")}`);
  return p;
}

/** Create or update a custom persona. Returns the saved persona. */
export async function saveCustomPersona(input: {
  id?: string;
  name: string;
  tagline?: string;
  style: string;
  voiceId?: string;
  accent?: string;
}): Promise<Persona> {
  if (!input.name?.trim() || !input.style?.trim()) {
    throw new Error("A commentator needs a name and a style.");
  }
  const id = (input.id || slug(input.name)).trim();
  if (BUILT_IN.some((b) => b.id === id)) throw new Error(`"${id}" is a built-in name; pick another.`);

  const persona: Persona = {
    id,
    name: input.name.trim(),
    tagline: (input.tagline || "Custom commentator").trim(),
    style: input.style.trim(),
    voiceId: input.voiceId?.trim() || V.antoni,
    accent: input.accent || "#9b6bff",
    builtIn: false,
  };

  const custom = await loadCustom();
  const next = [...custom.filter((p) => p.id !== id), persona];
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CUSTOM_FILE, JSON.stringify(next, null, 2));
  return persona;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "custom";
}
