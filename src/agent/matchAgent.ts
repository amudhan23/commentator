import { geminiText } from "../llm/gemini.js";
import type { PlayAnalysis } from "../vision/analyze.js";

// ─────────────────────────────────────────────────────────────────────────
// THE AGENT — not just a pipeline. It accumulates everything it has seen
// (a timed memory of real play analyses) and reasons over it: "what just
// happened?", "who's on top?", "what was the best chance?". An agent
// watching the match WITH you, not a one-shot summarizer.
// ─────────────────────────────────────────────────────────────────────────

export interface MemoryEntry {
  t: number;
  analysis: PlayAnalysis;
}

export class MatchAgent {
  private memory: MemoryEntry[] = [];

  remember(t: number, analysis: PlayAnalysis) {
    this.memory.push({ t, analysis });
    this.memory.sort((a, b) => a.t - b.t);
  }

  load(entries: MemoryEntry[]) {
    this.memory = [...entries].sort((a, b) => a.t - b.t);
  }

  snapshot(): MemoryEntry[] {
    return this.memory;
  }

  /** Answer a question grounded ONLY in what the agent has actually seen. */
  async ask(question: string, language = "English"): Promise<string> {
    if (this.memory.length === 0) return "I haven't seen anything in the match yet.";

    const timeline = this.memory
      .map((m) => `- ${fmt(m.t)} [${m.analysis.eventType}] ${m.analysis.description}${m.analysis.onScreen ? ` (on screen: ${m.analysis.onScreen})` : ""}`)
      .join("\n");

    const system = [
      "You are an AI co-watcher answering questions about a football match in progress.",
      "Answer ONLY from the observed timeline given. If the answer isn't in it, say you haven't seen that yet.",
      "Be concise and conversational — you're watching alongside the user.",
      `Answer in ${language}.`,
    ].join(" ");

    return geminiText(system, [`Observed timeline so far:\n${timeline}\n\nQuestion: ${question}`], 250);
  }
}

function fmt(sec: number): string {
  const mm = Math.floor(sec / 60);
  const ss = String(Math.floor(sec % 60)).padStart(2, "0");
  return `${mm}:${ss}`;
}
