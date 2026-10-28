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
  // Indian languages — the beachhead: a billion fans underserved by the broadcast.
  { slug: "hi", name: "Hindi", bcp47: "hi-IN" },
  { slug: "ta", name: "Tamil", bcp47: "ta-IN" },
  { slug: "te", name: "Telugu", bcp47: "te-IN" },
  { slug: "bn", name: "Bengali", bcp47: "bn-IN" },
  { slug: "mr", name: "Marathi", bcp47: "mr-IN" },
  { slug: "kn", name: "Kannada", bcp47: "kn-IN" },
  { slug: "ml", name: "Malayalam", bcp47: "ml-IN" },
  { slug: "gu", name: "Gujarati", bcp47: "gu-IN" },
  { slug: "pa", name: "Punjabi", bcp47: "pa-IN" },
  { slug: "ur", name: "Urdu", bcp47: "ur-PK" },
  // Global
  { slug: "es", name: "Spanish", bcp47: "es-ES" },
  { slug: "pt", name: "Portuguese", bcp47: "pt-BR" },
  { slug: "ar", name: "Arabic", bcp47: "ar-SA" },
  { slug: "fr", name: "French", bcp47: "fr-FR" },
];

export function langBySlug(slug: string): Lang {
  const l = LANGUAGES.find((x) => x.slug === slug);
  if (!l) throw new Error(`Unknown language "${slug}". Known: ${LANGUAGES.map((x) => x.slug).join(", ")}`);
  return l;
}
