# match-commentator

Live AI commentary over a muted match. Detect the big moments in a stream, then
either drop in AI commentary (Peter-Drury-epic, analytical, neutral) or unmute
the real broadcast.

This is the starter scaffold. It gets you from "I've never built AI" to "I have
a thing that detects goals and talks" — fast.

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
  engine/        ← detection (the moat; future: a Rust service)
  vision/        ← frames.ts (ffmpeg) + analyze.ts (the agent's eyes)
  commentary/    ← grounded narration: persona + language (a LAYER)
  agent/         ← match memory + ask-the-agent Q&A
  voice/         ← ElevenLabs text→speech + playback (a LAYER)
  scripts/       ← the three day-1 "kill the fear" scripts
  pipeline.ts    ← clip → synced, grounded commentary track
serve.ts         ← the demo server + /api/ask
public/          ← the web UI
```

## Setup (10 minutes)

1. **Install prerequisites**
   - [Node.js](https://nodejs.org) 20.6+ (needs `--env-file`)
   - ffmpeg: `brew install ffmpeg` (macOS) or your package manager
2. **Install deps:** `npm install`
3. **Keys:** `cp .env.example .env`, then paste your **free** Gemini key
   (get one at [aistudio.google.com](https://aistudio.google.com) → "Get API key").
   ElevenLabs is optional — without it the demo uses the free browser voice.
4. **A clip:** drop a short muted-or-not match clip at `src/clips/match.mp4`
   (a 2–3 min clip with a goal or two is perfect for testing).

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

## The real demo — the web UI

This is what you record for YC/Speedrun. It plays a muted clip and fires
commentary in sync, with live **style** and **language** switching and an
**auto-unmute** mode.

```bash
npm run serve      # http://localhost:5173
```

Open it, pick a match clip, press play. **It works with zero API keys** — the
bundled sample tracks use your browser's built-in voice. Switch language to
Tamil/Spanish and watch the same moment get re-narrated.

### Generating real tracks (broadcast-quality voice)

With your keys in `.env`, build a synced track for a specific clip, style, and
language. It detects the moments, writes the lines, synthesizes ElevenLabs
audio, and drops a manifest the UI picks up automatically:

```bash
npm run track -- ./src/clips/match.mp4 drury ta     # epic, Tamil
npm run track -- ./src/clips/match.mp4 analyst en    # analyst, English
```

Then `npm run serve` and switch to that style/language in the UI.

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
