import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

// ─────────────────────────────────────────────────────────────────────────
// Lightweight social/traction store: views + reactions per track. Backed by
// data/stats.json (gitignored). Not a real DB — fine for a demo and for the
// "what is working" numbers. Swap for a KV/DB when traffic warrants.
// ─────────────────────────────────────────────────────────────────────────

const FILE = join("data", "stats.json");
type Stat = { views: number; likes: number };
type Store = Record<string, Stat>;

let cache: Store | null = null;

async function load(): Promise<Store> {
  if (cache) return cache;
  if (!existsSync(FILE)) return (cache = {});
  try {
    cache = JSON.parse(await readFile(FILE, "utf8")) as Store;
  } catch {
    cache = {};
  }
  return cache;
}

async function save(s: Store): Promise<void> {
  await mkdir("data", { recursive: true });
  await writeFile(FILE, JSON.stringify(s));
}

export async function getStat(file: string): Promise<Stat> {
  const s = await load();
  return s[file] ?? { views: 0, likes: 0 };
}

export async function allStats(): Promise<Store> {
  return { ...(await load()) };
}

export async function bump(file: string, field: "views" | "likes", by = 1): Promise<Stat> {
  const s = await load();
  s[file] = s[file] ?? { views: 0, likes: 0 };
  s[file][field] = Math.max(0, s[file][field] + by);
  await save(s);
  return s[file];
}
