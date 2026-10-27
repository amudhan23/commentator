import { GoogleGenerativeAI, type Part } from "@google/generative-ai";

// ─────────────────────────────────────────────────────────────────────────
// One small wrapper around Gemini for the whole app (vision, commentary, Q&A).
// Gemini Flash is fast, cheap, strong at multimodal — and has a free tier,
// so the demo runs on a free Google AI Studio key: aistudio.google.com.
// Swap the model with GEMINI_MODEL in .env if you like.
// ─────────────────────────────────────────────────────────────────────────

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

function client(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Set GEMINI_API_KEY in .env (free key at aistudio.google.com).");
  return new GoogleGenerativeAI(key);
}

/** Generate text from a system instruction + a list of parts (text and/or images). */
export async function geminiText(
  system: string,
  parts: Array<string | Part>,
  maxOutputTokens = 200,
): Promise<string> {
  const model = client().getGenerativeModel({
    model: MODEL,
    systemInstruction: system,
    generationConfig: { maxOutputTokens, temperature: 0.9 },
  });
  return withRetry(async () => {
    const result = await model.generateContent(parts);
    return result.response.text().trim();
  });
}

/**
 * Retry on rate-limit (429 / RESOURCE_EXHAUSTED) with exponential backoff.
 * The free tier allows a limited number of requests per minute, so a run that
 * makes many vision calls will brush the limit — this rides over it instead of
 * crashing. Non-rate-limit errors throw immediately.
 */
async function withRetry<T>(fn: () => Promise<T>, tries = 5): Promise<T> {
  let delayMs = 3000;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const rateLimited = /429|quota|rate.?limit|RESOURCE_EXHAUSTED/i.test(msg);
      if (!rateLimited || i === tries - 1) throw e;
      console.log(`  (rate limited — waiting ${delayMs / 1000}s, retry ${i + 1}/${tries - 1})`);
      await new Promise((r) => setTimeout(r, delayMs));
      delayMs = Math.min(delayMs * 2, 60_000);
    }
  }
  throw new Error("unreachable");
}

/** Wrap a base64 JPEG as a Gemini image part. */
export function imagePart(b64: string, mimeType = "image/jpeg"): Part {
  return { inlineData: { data: b64, mimeType } };
}
