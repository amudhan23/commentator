// Demo server: serves the UI and exposes POST /api/ask so you can talk to the
// match agent live. Run:  npm run serve   → http://localhost:5173
//
// Works with no key (static UI + sample tracks). Add GEMINI_API_KEY to
// enable the "ask the agent" box.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { MatchAgent, MemoryEntry } from "./src/agent/matchAgent.js";

// --- optional .env load (so zero-setup users don't need --env-file) --------
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const ROOT = join(process.cwd(), "public");
const PORT = Number(process.env.PORT) || 5173;
const TYPES: Record<string, string> = {
  ".html": "text/html", ".js": "text/javascript", ".json": "application/json",
  ".mp3": "audio/mpeg", ".css": "text/css", ".mp4": "video/mp4",
};

createServer(async (req, res) => {
  // --- API: ask the agent -------------------------------------------------
  if (req.method === "POST" && req.url === "/api/ask") {
    try {
      const body = await readBody(req);
      const { manifest, question, language } = JSON.parse(body || "{}");

      if (!process.env.GEMINI_API_KEY) {
        return json(res, 200, {
          answer: "Ask-the-agent needs a GEMINI_API_KEY in your .env (free at aistudio.google.com). The rest of the demo runs without one — add a key to chat with the agent about the match.",
        });
      }

      const file = join(ROOT, "tracks", safe(manifest || ""));
      const data = JSON.parse(await readFile(file, "utf8"));
      const memory: MemoryEntry[] = (data.events || []).map((e: any) => ({
        t: e.t,
        analysis: {
          description: e.saw ?? e.text,
          eventType: e.eventType ?? "unknown",
          significance: e.significance ?? 0.5,
          onScreen: e.onScreen,
        },
      }));

      const agent = new MatchAgent();
      agent.load(memory);
      const answer = await agent.ask(String(question || ""), language || "English");
      return json(res, 200, { answer });
    } catch (e: any) {
      return json(res, 500, { error: e.message });
    }
  }

  // --- static files -------------------------------------------------------
  try {
    let path = decodeURIComponent((req.url || "/").split("?")[0]);
    if (path === "/") path = "/index.html";
    const file = join(ROOT, safe(path));
    const data = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  }
}).listen(PORT, () => {
  const keyed = process.env.GEMINI_API_KEY ? "agent Q&A ON" : "agent Q&A off (no key)";
  console.log(`\n▶  Demo at http://localhost:${PORT}   (${keyed})\n`);
});

function safe(p: string): string {
  return normalize(p).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
}
function readBody(req: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => resolve(b));
  });
}
function json(res: import("node:http").ServerResponse, code: number, obj: unknown) {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
}
