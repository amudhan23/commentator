// Commentator demo server.
//   Static UI  +  APIs:
//     GET  /api/clips       list uploaded match clips
//     GET  /api/tracks      list generated commentary tracks
//     GET  /api/personas    list commentators (built-in + custom)
//     POST /api/personas    create a custom commentator
//     POST /api/upload      upload a match clip (raw body, x-filename header)
//     POST /api/process     generate a track, streaming progress (SSE)
//     POST /api/ask         ask the agent about a match
// Runs with no key (static UI + sample tracks). Add GEMINI_API_KEY to generate
// and to chat with the agent; add ELEVENLABS_API_KEY for broadcast-quality voice.

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { readFile, readdir, mkdir, writeFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize, basename } from "node:path";
import { MatchAgent, MemoryEntry } from "./src/agent/matchAgent.js";
import { listPersonas, saveCustomPersona } from "./src/commentary/personas.js";
import { LANGUAGES } from "./src/commentary/languages.js";
import { buildTrack } from "./src/pipeline.js";

// --- optional .env load (so zero-setup users don't need --env-file) --------
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const ROOT = join(process.cwd(), "public");
const CLIPS = join(ROOT, "clips");
const TRACKS = join(ROOT, "tracks");
const PORT = Number(process.env.PORT) || 5173;
const VIDEO_EXT = new Set([".mp4", ".webm", ".mov", ".mkv", ".m4v"]);
const TYPES: Record<string, string> = {
  ".html": "text/html", ".js": "text/javascript", ".json": "application/json",
  ".mp3": "audio/mpeg", ".css": "text/css", ".mp4": "video/mp4", ".webm": "video/webm",
  ".mov": "video/quicktime", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".png": "image/png", ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  try {
    const url = (req.url || "/").split("?")[0];

    if (url.startsWith("/api/")) return await api(req, res, url);

    // static
    let path = decodeURIComponent(url);
    if (path === "/") path = "/index.html";
    const file = join(ROOT, safe(path));
    const data = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  }
});

async function api(req: IncomingMessage, res: ServerResponse, url: string) {
  // ---- GET /api/health (for uptime checks / platforms) ----
  if (req.method === "GET" && url === "/api/health") {
    return json(res, 200, { ok: true, generate: !!process.env.GEMINI_API_KEY, time: new Date().toISOString() });
  }

  // ---- GET /api/clips ----
  if (req.method === "GET" && url === "/api/clips") {
    await mkdir(CLIPS, { recursive: true });
    const files = (await readdir(CLIPS)).filter((f) => VIDEO_EXT.has(extname(f).toLowerCase()));
    const clips = await Promise.all(files.map(async (f) => ({ name: f, size: (await stat(join(CLIPS, f))).size })));
    return json(res, 200, { clips });
  }

  // ---- GET /api/tracks ----
  if (req.method === "GET" && url === "/api/tracks") {
    await mkdir(TRACKS, { recursive: true });
    const files = (await readdir(TRACKS)).filter((f) => f.endsWith(".json"));
    const tracks = [];
    for (const f of files) {
      try {
        const m = JSON.parse(await readFile(join(TRACKS, f), "utf8"));
        tracks.push({
          file: f, clip: m.clip ?? null, thumb: m.thumb ?? null, persona: m.persona,
          personaName: m.personaName ?? m.persona, accent: m.accent ?? "#ffb020",
          langSlug: m.langSlug, langName: m.langName ?? m.langSlug,
          moments: (m.events || []).length, generatedAt: m.generatedAt ?? null,
        });
      } catch { /* skip malformed */ }
    }
    tracks.sort((a, b) => String(b.generatedAt).localeCompare(String(a.generatedAt)));
    return json(res, 200, { tracks });
  }

  // ---- GET /api/personas ----
  if (req.method === "GET" && url === "/api/personas") {
    return json(res, 200, {
      personas: await listPersonas(),
      languages: LANGUAGES,
      canGenerate: !!process.env.GEMINI_API_KEY,
      studioVoice: !!process.env.ELEVENLABS_API_KEY,
    });
  }

  // ---- POST /api/personas ----
  if (req.method === "POST" && url === "/api/personas") {
    try {
      const body = JSON.parse(await readBody(req) || "{}");
      const p = await saveCustomPersona(body);
      return json(res, 200, { persona: p });
    } catch (e) {
      return json(res, 400, { error: e instanceof Error ? e.message : String(e) });
    }
  }

  // ---- POST /api/upload (raw body) ----
  if (req.method === "POST" && url === "/api/upload") {
    const name = safeName(String(req.headers["x-filename"] || "clip.mp4"));
    if (!VIDEO_EXT.has(extname(name).toLowerCase())) return json(res, 400, { error: "Not a video file." });
    await mkdir(CLIPS, { recursive: true });
    const buf = await readRawBody(req);
    await writeFile(join(CLIPS, name), buf);
    return json(res, 200, { name, size: buf.length });
  }

  // ---- POST /api/process (SSE progress) ----
  if (req.method === "POST" && url === "/api/process") {
    const body = JSON.parse(await readBody(req) || "{}");
    const clip = safeName(String(body.clip || ""));
    const clipPath = join(CLIPS, clip);
    if (!clip || !existsSync(clipPath)) return json(res, 400, { error: "Clip not found. Upload it first." });
    if (!process.env.GEMINI_API_KEY) return json(res, 400, { error: "Set GEMINI_API_KEY in .env to generate commentary." });

    res.writeHead(200, {
      "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive",
    });
    const send = (e: unknown) => res.write(`data: ${JSON.stringify(e)}\n\n`);
    try {
      await buildTrack({
        clipPath,
        persona: String(body.persona || "drury"),
        langSlug: String(body.langSlug || "en"),
        outDir: ROOT,
        maxMoments: body.maxMoments ? Number(body.maxMoments) : undefined,
        onEvent: send,
      });
    } catch (e) {
      send({ type: "error", message: e instanceof Error ? e.message : String(e) });
    }
    return res.end();
  }

  // ---- POST /api/waitlist ----
  if (req.method === "POST" && url === "/api/waitlist") {
    try {
      const { email } = JSON.parse(await readBody(req) || "{}");
      const e = String(email || "").trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return json(res, 400, { error: "Enter a valid email." });
      await mkdir("data", { recursive: true });
      await writeFile(join("data", "waitlist.jsonl"), JSON.stringify({ email: e, at: new Date().toISOString() }) + "\n", { flag: "a" });
      return json(res, 200, { ok: true });
    } catch (e) {
      return json(res, 500, { error: e instanceof Error ? e.message : String(e) });
    }
  }

  // ---- POST /api/ask ----
  if (req.method === "POST" && url === "/api/ask") {
    try {
      const { manifest, question, language } = JSON.parse(await readBody(req) || "{}");
      if (!process.env.GEMINI_API_KEY) {
        return json(res, 200, { answer: "Ask-the-agent needs a GEMINI_API_KEY in your .env (free at aistudio.google.com)." });
      }
      const data = JSON.parse(await readFile(join(TRACKS, safeName(String(manifest || ""))), "utf8"));
      const memory: MemoryEntry[] = (data.events || []).map((e: Record<string, unknown>) => ({
        t: e.t as number,
        analysis: {
          description: (e.saw as string) ?? (e.text as string),
          eventType: (e.eventType as string) ?? "unknown",
          significance: (e.significance as number) ?? 0.5,
          onScreen: e.onScreen as string | undefined,
        },
      }));
      const agent = new MatchAgent();
      agent.load(memory);
      return json(res, 200, { answer: await agent.ask(String(question || ""), language || "English") });
    } catch (e) {
      return json(res, 500, { error: e instanceof Error ? e.message : String(e) });
    }
  }

  return json(res, 404, { error: "unknown endpoint" });
}

const HOST = process.env.HOST || "0.0.0.0";
server.listen(PORT, HOST, () => {
  const g = process.env.GEMINI_API_KEY ? "generate ON" : "generate off (no GEMINI key)";
  const v = process.env.ELEVENLABS_API_KEY ? "studio voice" : "browser voice";
  console.log(`\n▶  Commentator listening on ${HOST}:${PORT}   (${g}, ${v})\n`);
});

// ---- helpers ----
function safe(p: string): string { return normalize(p).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, ""); }
function safeName(n: string): string { return basename(n).replace(/[^a-zA-Z0-9._-]/g, "_"); }
function json(res: ServerResponse, code: number, obj: unknown) {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
}
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => resolve(b)); });
}
function readRawBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
