import { geminiText } from "../llm/gemini.js";
import type { PlayAnalysis } from "../vision/analyze.js";

// ─────────────────────────────────────────────────────────────────────────
// Commentary generation. The main pipeline uses narrateMoment (vision +
// commentary in one call); these helpers remain for the day-1 script and for
// generating a line from an existing analysis. `style` is the persona's
// instruction text (resolved by the caller from the persona registry).
// ─────────────────────────────────────────────────────────────────────────

export interface MomentContext {
  tSeconds: number;
  intensity: number;
  note?: string;
}

export interface GenerateOptions {
  style?: string;
  /** Language name to narrate in: "English", "Tamil", "Hindi", "Spanish"… */
  language?: string;
}

const DEFAULT_STYLE =
  "A concise football commentator. State what happened clearly in one or two sentences, no preamble.";

export async function generateCommentary(
  ctx: MomentContext,
  opts: GenerateOptions = {},
): Promise<string> {
  const style = opts.style ?? DEFAULT_STYLE;
  const language = opts.language ?? "English";
  const minute = Math.floor(ctx.tSeconds / 60);

  const prompt = [
    `A big moment just fired at roughly minute ${minute} of the match.`,
    `Excitement intensity: ${ctx.intensity} (higher = bigger).`,
    ctx.note ? `Context: ${ctx.note}` : `No extra context — react to the surge of excitement itself.`,
    `Write the commentary line in ${language}.`,
    language !== "English" ? `Output ONLY the ${language} text, no translation or transliteration, no quotes.` : ``,
  ].filter(Boolean).join(" ");

  return geminiText(style, [prompt], 1024);
}

/** Narrate an already-computed vision analysis in a given style and language. */
export async function generateGroundedCommentary(
  analysis: PlayAnalysis,
  opts: GenerateOptions = {},
): Promise<string> {
  const style = opts.style ?? DEFAULT_STYLE;
  const language = opts.language ?? "English";

  const prompt = [
    `Here is exactly what just happened on the pitch (from live video): "${analysis.description}".`,
    analysis.onScreen ? `On screen: ${analysis.onScreen}.` : ``,
    `Event type: ${analysis.eventType}.`,
    `Commentate THIS specific moment — stay true to what happened, do not invent extra details.`,
    `Write it in ${language}.`,
    language !== "English" ? `Output ONLY the ${language} text, no translation or transliteration, no quotes.` : ``,
  ].filter(Boolean).join(" ");

  return geminiText(style, [prompt], 1024);
}
