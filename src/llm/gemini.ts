import { GoogleGenerativeAI, type Part } from "@google/generative-ai";

// ─────────────────────────────────────────────────────────────────────────
// One small wrapper around Gemini for the whole app (vision, commentary, Q&A).
// Gemini Flash is fast, cheap, strong at multimodal — and has a free tier,
// so the demo runs on a free Google AI Studio key: aistudio.google.com.
// Swap the model with GEMINI_MODEL in .env if you like.
// ─────────────────────────────────────────────────────────────────────────

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

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
  const result = await model.generateContent(parts);
  return result.response.text().trim();
}

/** Wrap a base64 JPEG as a Gemini image part. */
export function imagePart(b64: string, mimeType = "image/jpeg"): Part {
  return { inlineData: { data: b64, mimeType } };
}
