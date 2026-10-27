import { geminiText } from "../llm/gemini.js";
import { PERSONAS, PersonaName } from "./personas.js";
import type { PlayAnalysis } from "../vision/analyze.js";

// ─────────────────────────────────────────────────────────────────────────
// Turn a moment into a line of commentary, in the chosen persona + language.
// Prefer generateGroundedCommentary() — it narrates what the agent actually
// SAW. The plain generateCommentary() is kept for the day-1 script.
// ─────────────────────────────────────────────────────────────────────────

export interface MomentContext {
  tSeconds: number;
  intensity: number;
  note?: string;
}

export interface GenerateOptions {
  persona?: PersonaName;
  /** Language name to narrate in: "English", "Tamil", "Hindi", "Spanish"… */
  language?: string;
}

export async function generateCommentary(
  ctx: MomentContext,
  opts: GenerateOptions = {},
): Promise<string> {
  const persona = opts.persona ?? "drury";
  const language = opts.language ?? "English";
  const minute = Math.floor(ctx.tSeconds / 60);

  const prompt = [
    `A big moment just fired at roughly minute ${minute} of the match.`,
    `Excitement intensity: ${ctx.intensity} (higher = bigger).`,
    ctx.note ? `Context: ${ctx.note}` : `No extra context — react to the surge of excitement itself.`,
    `Write the commentary line in ${language}.`,
    language !== "English" ? `Output ONLY the ${language} text, no translation or transliteration, no quotes.` : ``,
  ].filter(Boolean).join(" ");

  return geminiText(PERSONAS[persona], [prompt], 160);
}

/**
 * GROUNDED commentary — narrate what the agent actually SAW (a PlayAnalysis
 * from the vision step), in the chosen persona and language.
 */
export async function generateGroundedCommentary(
  analysis: PlayAnalysis,
  opts: GenerateOptions = {},
): Promise<string> {
  const persona = opts.persona ?? "drury";
  const language = opts.language ?? "English";

  const prompt = [
    `Here is exactly what just happened on the pitch (from live video): "${analysis.description}".`,
    analysis.onScreen ? `On screen: ${analysis.onScreen}.` : ``,
    `Event type: ${analysis.eventType}.`,
    `Commentate THIS specific moment — stay true to what happened, do not invent extra details.`,
    `Write it in ${language}.`,
    language !== "English" ? `Output ONLY the ${language} text, no translation or transliteration, no quotes.` : ``,
  ].filter(Boolean).join(" ");

  return geminiText(PERSONAS[persona], [prompt], 160);
}
