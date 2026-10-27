# Recording the 60-second demo (for YC / Speedrun)

The application video should make someone *feel* the product in under a minute.
Show, don't explain. Here is a script that lands.

## Setup (once)

```bash
npm install
npm run serve        # opens http://localhost:5173
```

Have a **short match clip** ready (2–4 min, with a goal or two). Screen-record
the browser tab with audio (QuickTime on macOS, or OBS).

> The bundled sample tracks use your browser's built-in voice, so this works
> with **zero API keys**. For the real, broadcast-quality voice, add your
> ElevenLabs key and generate tracks (see README) — do that before the final
> take.

## The 60-second script

1. **0:00–0:08 — the hook, over a muted match.**
   "This is a live match, muted. I don't want their commentary. Watch."
   Pick your clip, let it play. Point out it's silent.

2. **0:08–0:24 — the core + the intelligence.** Let it reach a goal. The agent
   calls it, caption + voice, *in sync*. Then point at the "What the agent sees"
   card: "It didn't guess — it watched the frames and saw the striker finish low
   across the keeper, then called that." (This is the beat that kills "it's just
   canned text.")

3. **0:24–0:36 — the layer that sells it.** Switch **Language** to Tamil (or
   Hindi/Spanish). Same goal, now narrated in your language. "This match is only
   broadcast in English. Half the planet isn't served. This is."

4. **0:36–0:46 — it's an agent, not a player.** Type into Ask the agent:
   "What was the best chance?" It answers from what it actually watched.
   "You're watching the match *with* it."

5. **0:46–1:00 — the vision + moat line.**
   "Detection and real-time understanding run the core today; next is a
   marketplace where any creator's voice narrates any match, live. Real-time
   latency is the hard part — that's my background." Cut.

## What makes or breaks it

- **Sync.** The line must land *on* the moment. If the sample timestamps don't
  match your clip, edit `public/tracks/*.json` so the `t` values line up with
  the real goals in your clip. This is the single most important polish step.
- **Don't narrate the plumbing.** No "so I built a TypeScript pipeline…".
  Show the magic; say one sentence about the moat at the end.
- **End on the vision, not the tech.** Creators + languages = platform.
