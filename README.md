# Commentator — AI sports commentary in your language

**A billion sports fans never get commentary in their language.** Commentator is
an AI agent that *watches* any match — cricket or football — and calls it live in
the language, style, and voice you choose. Mute the broadcast you were given; hear
the one you actually want.

> Live demo: _[add your deploy URL]_ · Try it: upload a clip in the Studio, or
> watch a called match in Explore.

**What it does**
- 👁️ **Grounded commentary** — the agent watches the real frames, so it says
  "finishes low across the keeper," not generic hype.
- 🌍 **Any language** — Hindi, Tamil, Telugu, Bengali, and more (the wedge).
- 🎙️ **Any style or voice** — epic, tactical, hype, or bring your own commentator.
- 🔇 **Never miss a goal** — watch muted, it unmutes the real feed on the big moments.
- 💬 **Ask the agent** — a co-watcher that answers from what it actually watched.
- ✂️ **Clip & share** — export any called moment as a short video to post.

Cricket-first (India is the biggest underserved-language fan base), sport-agnostic
by design. See `YC-APPLICATION.md` / `SPEEDRUN-APPLICATION.md` for the thesis and
`DEPLOY.md` to put it online.

## How it actually works (the important part)

The agent doesn't just detect loudness — **it watches the play and narrates
what really happened.** The pipeline:

1. **Detect** candidate moments from the audio (cheap, fast). `src/engine/`
2. **See** — pull the frames around each spike and send them to a vision model,
   which reports what actually happened on the pitch. `src/vision/`
3. **Narrate** that real play, in your style and language. `src/commentary/`
4. **Voice** it with ElevenLabs. `src/voice/`
5. The agent **remembers** everything it saw, so you can ask it questions. `src/agent/`

The vision step is what makes the commentary real ("he drives in and finishes
low across the keeper") instead of generic hype ("what a moment!").

The **detection engine stays isolated** in `src/engine/` behind one interface
(`MomentDetector`). When latency becomes the thing you're fighting, you replace
*just that module* with a Rust service — same interface, no rewrite. That's your
moat and your migration path.

```
src/
  engine/        ← audio moment detection (the moat; future: a Rust service)
  vision/        ← frames.ts (ffmpeg) + narrate.ts (watch + call, one vision pass)
  llm/           ← gemini.ts (one wrapper: model, retries, rate-limit backoff)
  commentary/    ← personas (built-in + custom commentators) + languages
  agent/         ← match memory + ask-the-agent Q&A
  voice/         ← ElevenLabs text→speech (per-commentator voice) + playback
  scripts/       ← day-1 scripts + model helpers (models / try)
  pipeline.ts    ← clip → synced, grounded commentary track (+ progress events)
serve.ts         ← app server: static UI + clips/tracks/personas/upload/process/ask
public/          ← the web app (Watch / Studio / Commentators)
data/            ← custom commentators (created in the UI; gitignored)
```

## Setup (10 minutes)

1. **Install prerequisites**
   - [Node.js](https://nodejs.org) 20.6+ (needs `--env-file`)
   - (ffmpeg is bundled via `ffmpeg-static` on install — no system install needed)
2. **Install deps:** `npm install`
3. **Keys:** `cp .env.example .env`, then paste your **free** Gemini key
   (get one at [aistudio.google.com](https://aistudio.google.com) → "Get API key").
   ElevenLabs is optional — without it the demo uses the free browser voice.
4. **Run it:** `npm run serve` → open http://localhost:5173 → **Studio** →
   upload a short clip (a 2–4 min clip with a goal or two is perfect) → Generate.

> Free-tier note: Gemini's free tier allows ~20 requests/day per model, and each
> moment is one call. Keep "Moments" low while testing, or enable billing (a few
> dollars) to lift the daily cap.

## Day 1 — three scripts, three concepts (one afternoon)

Run them in order. Each one proving it works removes one unknown.

```bash
npm run llm      # 1. an LLM writes a commentary line → printed
npm run voice    # 2. ElevenLabs says a line out loud  → you HEAR it
npm run detect -- ./src/clips/match.mp4   # 3. find the loud moments → timestamps
```

After `npm run detect`, check the printed timestamps against your clip — the
goals should line up with the spikes. If it misses them, lower `thresholdRatio`
in `src/scripts/03-detect-spike.ts` (try 1.4). If it fires too often, raise it.

## The demo — end to end (CLI)

```bash
npm run demo -- ./src/clips/match.mp4 drury
```

Detects each moment, writes a line in the chosen persona, and speaks it in the
terminal. Good for a quick check.

## The app — what you actually run and record

```bash
npm run serve      # http://localhost:5173
```

Three sections:

- **Studio** — upload a match clip, pick the **sport** (cricket, football, or
  auto-detect), a commentator and a language (incl. Hindi, Tamil, Telugu,
  Bengali, Marathi, Kannada, Malayalam and more), hit Generate. The agent
  watches it and writes the commentary, with **live progress** streaming in as
  each moment is called. Needs a Gemini key.
- **Watch** — pick a generated track and watch the match called your way.
  Captions + voice fire in sync, you can **switch commentator or language**,
  **unmute the real broadcast** on the big moments, see **what the agent
  watched** per moment, and **ask the agent** questions about the match.
- **Commentators** — your roster of voices (built-in + custom). **Create your
  own commentator** (a style + an ElevenLabs voice) — the bring-your-own-
  commentator marketplace seed.

**Zero-key mode:** without any keys, Watch still works on the bundled sample
tracks using your browser's built-in voice — good for a first look. Generating
new commentary and asking the agent need a (free) Gemini key.

### CLI (optional)

You can also generate a track from the terminal:

```bash
npm run track -- <clip.mp4> <commentator> <lang>   # e.g. ... drury ta
npm run models                                      # list models your key can use
npm run try                                         # probe which models actually work
```

See **DEMO.md** for the 60-second recording script.

## Where to go next (the real work)

- **Week 2 — real-time + sync.** Process the clip as a stream instead of all at
  once, and interleave detection → speak with playback so lines land *on* the
  moment, not after. This timing is the hard part and the thing judges feel.
- **The auto-unmute variant.** Instead of generating a line, just unmute the
  real broadcast audio for ~10s around each moment. Sometimes more magic, less
  work. Try both; demo whichever lands harder.
- **Better context.** Feed a couple of video frames to a vision model, or OCR
  the scoreboard, so the commentary knows *what* happened, not just *that*
  something did. Add this behind the same `Moment` type.
- **Harden the core in Rust.** When latency is the bottleneck, reimplement
  `MomentDetector` as a Rust (Tokio) service. Nothing above `engine/` changes.

## A note on the "persona" feature

`drury` is an *epic play-by-play style*, not an impersonation of a real,
named commentator. Keep styles generic (epic / tactical / hype) — it keeps you
clear of likeness and voice-rights issues as you grow.
