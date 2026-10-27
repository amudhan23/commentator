import { geminiText, imagePart } from "../llm/gemini.js";
import { Frame } from "./frames.js";
import { PERSONAS, PersonaName } from "../commentary/personas.js";
import type { PlayAnalysis } from "./analyze.js";

// ─────────────────────────────────────────────────────────────────────────
// ONE call per moment: the agent watches the frames, works out what really
// happened, AND writes the commentary — together. Half the API calls of doing
// vision + commentary separately (which matters a lot on the free tier's daily
// quota), and a generous token budget so "thinking" models don't truncate.
// ─────────────────────────────────────────────────────────────────────────

export interface NarratedMoment extends PlayAnalysis {
  /** The commentary line, in the chosen persona + language. */
  commentary: string;
}

export async function narrateMoment(
  frames: Frame[],
  opts: { persona: PersonaName; language: string },
): Promise<NarratedMoment> {
  if (frames.length === 0) {
    return { description: "No frames.", eventType: "nothing", significance: 0, commentary: "" };
  }

  const system =
    "You are a football match analyst and play-by-play commentator. You look at a short " +
    "burst of frames in time order, work out what actually happened (facts only — never " +
    "invent player names or scores), then deliver a commentary line about that real moment.";

  const prompt = [
    "The frames are in time order. Do all of this:",
    "1) Describe what actually happens across them, one factual sentence.",
    "2) Classify eventType: goal, chance, save, foul, buildup, celebration, or nothing.",
    "3) Rate significance 0 to 1 (how big a moment it is).",
    "4) Read any on-screen text (scoreline, clock, names).",
    `5) Write a commentary line in ${opts.language}, in THIS style: ${PERSONAS[opts.persona]}`,
    "   Stay true to what actually happened; do not invent details.",
    opts.language !== "English"
      ? `   The commentary field must be in ${opts.language} only (no translation/transliteration).`
      : "",
    'Return ONLY JSON: {"description": string, "eventType": string, "significance": number, "onScreen": string, "commentary": string}',
  ].filter(Boolean).join("\n");

  const parts = [prompt, ...frames.map((f) => imagePart(f.b64))];
  const text = await geminiText(system, parts, 2048); // generous: room for thinking + JSON
  return parse(text);
}

function parse(text: string): NarratedMoment {
  const m = text.match(/\{[\s\S]*\}/);
  try {
    const o = JSON.parse(m ? m[0] : text);
    return {
      description: String(o.description ?? "Unclear.").trim(),
      eventType: String(o.eventType ?? "unknown").trim(),
      significance: clamp01(Number(o.significance ?? 0.5)),
      onScreen: o.onScreen ? String(o.onScreen).trim() : undefined,
      commentary: String(o.commentary ?? "").trim(),
    };
  } catch {
    // Couldn't parse — keep whatever text came back as the commentary so the
    // run still yields something, and flag it for review.
    return { description: text.slice(0, 200), eventType: "unknown", significance: 0.5, commentary: text.slice(0, 200) };
  }
}

const clamp01 = (n: number) => (isNaN(n) ? 0 : Math.max(0, Math.min(1, n)));
