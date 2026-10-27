import { geminiText, imagePart } from "../llm/gemini.js";
import { Frame } from "./frames.js";

// ─────────────────────────────────────────────────────────────────────────
// The agent's EYES. Send a burst of frames to Gemini and get back a real,
// structured read of what happened — not hype, facts. Everything downstream
// (commentary, Q&A) is grounded in this.
// ─────────────────────────────────────────────────────────────────────────

export interface PlayAnalysis {
  /** One factual sentence: what actually happened in these frames. */
  description: string;
  /** "goal" | "chance" | "save" | "foul" | "buildup" | "nothing" | ... */
  eventType: string;
  /** 0–1: how significant / demo-worthy this moment is. */
  significance: number;
  /** Anything readable on screen — scoreline, clock, team names. */
  onScreen?: string;
}

const SYSTEM = [
  "You are a football match analyst looking at a short burst of frames from a match, in time order.",
  "Report ONLY what you can actually see. Do not invent player names, scores, or events.",
  "If nothing notable is happening, say so and set eventType to \"nothing\".",
  "Respond as strict JSON only. No prose outside the JSON.",
].join(" ");

export async function analyzePlay(frames: Frame[]): Promise<PlayAnalysis> {
  if (frames.length === 0) {
    return { description: "No frames available.", eventType: "nothing", significance: 0 };
  }

  const prompt =
    "These frames are in time order. Describe what happens across them in one factual sentence, " +
    "classify the event, rate significance 0-1, and read any on-screen text. " +
    'Return JSON: {"description": string, "eventType": string, "significance": number, "onScreen": string}';

  const parts = [prompt, ...frames.map((f) => imagePart(f.b64))];
  const text = await geminiText(SYSTEM, parts, 300);
  return parseAnalysis(text);
}

/** Tolerant JSON parse — models sometimes wrap JSON in prose or fences. */
function parseAnalysis(text: string): PlayAnalysis {
  const match = text.match(/\{[\s\S]*\}/);
  try {
    const o = JSON.parse(match ? match[0] : text);
    return {
      description: String(o.description ?? "Unclear.").trim(),
      eventType: String(o.eventType ?? "nothing").trim(),
      significance: clamp01(Number(o.significance ?? 0)),
      onScreen: o.onScreen ? String(o.onScreen).trim() : undefined,
    };
  } catch {
    return { description: text.slice(0, 200), eventType: "unknown", significance: 0.5 };
  }
}

const clamp01 = (n: number) => (isNaN(n) ? 0 : Math.max(0, Math.min(1, n)));
