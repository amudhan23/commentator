// Probes a shortlist of flash models with YOUR key and reports which actually
// work (some are listed but blocked for new keys; some are just overloaded).
// Run:  npm run try   → then put a WORKS model in .env as GEMINI_MODEL=<id>

const CANDIDATES = [
  "gemini-flash-latest",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3-flash-preview",
];

async function probe(model: string, key: string): Promise<string> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Reply OK" }] }] }),
      },
    );
    if (res.ok) return "✅ WORKS";
    const body = await res.text();
    if (res.status === 404) return "⛔ not available to your key";
    if (res.status === 503) return "🟡 available but overloaded (retry will ride over it)";
    if (res.status === 429) return "🟡 rate-limited (slow down / wait)";
    return `❌ ${res.status} ${body.slice(0, 80)}`;
  } catch (e) {
    return `❌ ${e instanceof Error ? e.message.slice(0, 80) : e}`;
  }
}

async function main() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error("Set GEMINI_API_KEY in .env first.");
    process.exit(1);
  }
  console.log("\nProbing flash models with your key…\n");
  for (const m of CANDIDATES) {
    const status = await probe(m, key);
    console.log(`  ${m.padEnd(26)} ${status}`);
  }
  console.log(`\nPick a ✅ (or 🟡) one and set it in .env:  GEMINI_MODEL=<id>\n`);
}

main().catch((e) => {
  console.error("Failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
