// Lists the Gemini models your key can use for generateContent, so you never
// have to guess a model name. Run:  npm run models

async function main() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error("Set GEMINI_API_KEY in .env first.");
    process.exit(1);
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=200`,
  );
  if (!res.ok) {
    console.error(`ListModels failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const data = (await res.json()) as {
    models?: Array<{ name: string; displayName?: string; supportedGenerationMethods?: string[] }>;
  };

  const usable = (data.models ?? []).filter((m) =>
    (m.supportedGenerationMethods ?? []).includes("generateContent"),
  );

  console.log(`\nModels your key can use for generateContent (${usable.length}):\n`);
  for (const m of usable) {
    const id = m.name.replace(/^models\//, "");
    console.log(`  ${id}${m.displayName ? `   — ${m.displayName}` : ""}`);
  }
  console.log(`\nPut one in .env as:  GEMINI_MODEL=<id>   (a "flash" one is cheapest/fastest)\n`);
}

main().catch((e) => {
  console.error("Failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
