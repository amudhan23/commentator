// Languages the demo can narrate in. `name` goes to the LLM, `bcp47` is what
// the browser's speech fallback needs, `slug` names the manifest file.
// Add rows freely — ElevenLabs' turbo model and Claude both handle many more.

export interface Lang {
  slug: string; // filename-safe id, e.g. "en", "ta"
  name: string; // what we tell the LLM, e.g. "English", "Tamil"
  bcp47: string; // for browser SpeechSynthesis, e.g. "en-US", "ta-IN"
}

export const LANGUAGES: Lang[] = [
  { slug: "en", name: "English", bcp47: "en-US" },
  { slug: "ta", name: "Tamil", bcp47: "ta-IN" },
  { slug: "hi", name: "Hindi", bcp47: "hi-IN" },
  { slug: "es", name: "Spanish", bcp47: "es-ES" },
  { slug: "pt", name: "Portuguese", bcp47: "pt-BR" },
];

export function langBySlug(slug: string): Lang {
  const l = LANGUAGES.find((x) => x.slug === slug);
  if (!l) throw new Error(`Unknown language "${slug}". Known: ${LANGUAGES.map((x) => x.slug).join(", ")}`);
  return l;
}
