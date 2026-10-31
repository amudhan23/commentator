import { geminiText, imagePart } from "../llm/gemini.js";

// ─────────────────────────────────────────────────────────────────────────
// LIVE mode: the browser screen-captures a match the user is watching and
// sends a frame (or a couple) every few seconds. For each tick we ask the
// agent: is something notable happening RIGHT NOW? If so, call it — once,
// without repeating what it just said. This is the near-real-time companion;
// true low-latency production live is the roadmap moat.
// ─────────────────────────────────────────────────────────────────────────

export interface LiveResult {
  notable: boolean;
  eventType: string;
  commentary: string;
}

export async function callLive(
  framesB64: string[],
  opts: { style: string; language: string; sportAnalyst?: string; sportEvents?: string; recent?: string[] },
): Promise<LiveResult> {
  if (!framesB64.length) return { notable: false, eventType: "nothing", commentary: "" };

  const analyst = opts.sportAnalyst || "a football (soccer) commentator";
  const events = opts.sportEvents || "goal, chance, save, foul, penalty, or nothing";
  const recent = (opts.recent || []).slice(-4);

  const system =
    `You are ${analyst} calling a match live for a fan watching right now. You are shown the ` +
    "most recent frame(s) of their screen. Only speak when something genuinely notable is " +
    "happening — a real event, not idle play. Never invent names or scores. Never repeat what " +
    "you just said.";

  const prompt = [
    "Look at the current frame(s) of the live match.",
    recent.length ? `You have just said (do NOT repeat these): ${recent.map((r) => `"${r}"`).join("; ")}` : "",
    "Decide: is a notable moment happening right now?",
    `If yes: classify it (${events}) and write ONE short, live commentary line in ${opts.language}, in this style: ${opts.style}.`,
    opts.language !== "English" ? `The commentary must be in ${opts.language} only.` : "",
    "If nothing notable is happening, set notable=false and leave commentary empty.",
    'Return ONLY JSON: {"notable": boolean, "eventType": string, "commentary": string}',
  ].filter(Boolean).join("\n");

  const parts = [prompt, ...framesB64.slice(0, 3).map((b) => imagePart(b))];
  const text = await geminiText(system, parts, 600);
  return parse(text);
}

function parse(text: string): LiveResult {
  const m = text.match(/\{[\s\S]*\}/);
  try {
    const o = JSON.parse(m ? m[0] : text);
    return {
      notable: !!o.notable && !!String(o.commentary || "").trim(),
      eventType: String(o.eventType ?? "nothing").trim(),
      commentary: String(o.commentary ?? "").trim(),
    };
  } catch {
    return { notable: false, eventType: "nothing", commentary: "" };
  }
}
