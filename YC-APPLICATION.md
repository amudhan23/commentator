# YC Application — Commentator (draft)

> Built from YC's actual 2026 evaluation rubric (Dalton Caldwell's five axes:
> professionalism, clarity of thought, ability to execute, self-awareness,
> trustworthiness). Rules applied throughout: name a **specific segment**, not a
> technology; **bottom-up** market math; name the **real hard problem**; **don't
> hedge** across directions; bios = **shipped artifacts with links**; be honest.
>
> Everything in [brackets] is for you to confirm or fill with a true answer.
> Don't fabricate — the "trustworthiness" axis is real and partners check.

---

## The wedge (read this first)

YC rewards a narrow segment over a broad category. So we don't lead with "AI
commentary for sport." We lead with the fans the broadcast ignores:

**The billion+ sports fans who never get commentary in their own language.**

A cricket match streams with English or Hindi commentary; a Tamil, Telugu,
Bengali, or Marathi speaker gets neither. A La Liga match airs in Spanish and
English; a fan in Lagos or Jakarta gets neither in theirs. The product is
sport-agnostic, but the **beachhead is Indian-language cricket & football**:
the largest, most underserved, most monetizable fan base on earth, and one the
founder is from and speaks the languages of.

This also lands us squarely inside YC's current Request for Startups,
**"AI-Powered Consumer Products for 1 Billion People."**

---

## Company

- **Name:** Commentator
- **URL:** https://github.com/amudhan23/commentator  (live demo: [your-deploy-url])

### Describe what your company does in 50 characters or less.
Primary (recommended):
> **AI sports commentary in your own language** (41)

Alternatives (pick the one that's truest to where you'll start):
> AI cricket & football commentary for India (43)
> Live AI match commentary in any language (40)

Avoid: "AI-powered real-time commentary platform" — that's a technology, not a segment.

---

## What is your company going to make?

Commentator turns any match into commentary you actually want. You point it at a
stream or a clip; an AI agent *watches the footage* — the real play, not a data
feed — finds the moments that matter, and calls them live in the language, style,
and voice you choose. A fan who only gets English commentary can watch in Tamil.
A fan who finds the broadcast dull can get tactical analysis instead of hype. A
fan watching muted can have it unmute the real feed the instant a goal breaks.
You can also ask it about the match as you watch.

We start with Indian-language cricket and football — the biggest fan base that
today has to watch in a language that isn't theirs — and open it up to any sport
and any creator's voice from there.

---

## Why did you pick this idea? Do you have domain expertise?

[Confirm/sharpen in your voice:] I grew up watching cricket and football in India
in languages that weren't my first, and I watch muted-with-a-second-screen like
most of my generation — the commentary almost never fits. I'm also the person who
can build it: [3.5 years] shipping production systems at IBM, an MSCS from NYU
Courant, EVM/payments infra at Sahara AI, and a 3x hackathon track record of
shipping working products in 48 hours. The hard part of this is real-time video
understanding and low-latency delivery — systems work, which is my background.

**Shipped artifacts (with links):**
- Commentator — this product: https://github.com/amudhan23/commentator
- IntentGuard — intent-validation layer for AI agents (Rust, on-chain audit): [repo link]
- AccessMint — full marketplace solo in a weekend at ETHGlobal NYC: https://github.com/amudhan23/accessMint
- payload-guard / req-guard — Rust security tooling: https://github.com/amudhan23/payload-guard
- Patent (India No. 372004); publications (Springer DESRIST 2022, IEEE COMSNETS 2021)

---

## What's new about what you're making? What do you understand that others don't?

Two things.

1. **Everyone in sports AI is B2B.** SportAI, Owl, Reely, Sports Visio, WSC Sports —
   they sell highlight/analysis tools to broadcasters and leagues. Nobody has built
   the consumer, fan-facing product: *your* commentary, on *your* screen. That gap
   is the opportunity.
2. **The commentary should be grounded in what actually happened, not a data feed.**
   Our agent watches the frames and says "he cuts inside and finishes low across the
   keeper," because it saw it — not generic hype triggered by a goal event. That's
   what makes it feel like a real commentator, and it's the harder thing to build.

The unlock is now: multimodal models can finally watch live video cheaply, and the
cost is per-match-per-language (generated once, served to everyone), not per-viewer —
so a global, multilingual consumer product is suddenly economic.

---

## Who are your competitors? What do you understand that they don't?

- **Broadcasters' own feeds / regional-language TV:** expensive to produce, so only
  the biggest languages get covered, and only for the biggest matches. We cover any
  language for any match at near-zero marginal cost.
- **B2B sports-AI vendors (SportAI, Owl, Reely, WSC Sports):** they serve the league,
  not the fan; they do highlights/analytics, not live personalized commentary.
- **The foundation-model labs:** they'll make video understanding a commodity — which
  helps us. Our moat is the consumer product, the real-time/low-latency delivery, and
  the creator-voice supply we build, not the model.

What they don't see: the underserved-language fan is a *consumer* market of a billion
people, not a broadcaster feature.

---

## How do you make money? How much per customer? (bottom-up)

Model: freemium consumer subscription + a creator revenue-share later.

Bottom-up, conservative, India beachhead (real numbers, IPL 2025):
- The IPL alone drew **620M unique viewers**; **390M watched digitally** (63% of all
  viewing, growing ~14% YoY). Regional-language demand is surging — IPL 2026 YoY reach:
  **Kannada +30%, Telugu +23%, Tamil +12%**, and regional feeds' share of digital
  watch-time up **33%**. The pull is real and accelerating.
- Today that demand is met by **160+ human commentators across 12 languages** — hand-
  produced, so only the biggest matches and languages get covered. That cost structure
  is exactly what we remove.
- Bottom-up revenue: of the ~390M digital viewers, capture a small early slice —
  **1M paying fans** — at **$2–3/month** (priced for the market) = **$24–36M ARR** from
  the beachhead alone, before any other sport, country, or the creator marketplace.
- Cost to serve is per-match-per-language (pennies per match, amortized across all
  viewers of that variant), so gross margins are high.

(This is the bottom-up frame — users × price — not a top-down "1% of a $X TAM" claim.
We'll replace it with real numbers from the first cohort of fans.)

---

## How far along are you? / traction

[Be honest and specific.] Working product: an AI agent that watches a real match,
calls it in multiple languages and styles, with a live web app (Studio to generate,
Watch to view, Explore to share, create-your-own commentators). Deploying this week
at [url]. [Before you submit: put it in front of 5–20 real fans — e.g., a cricket
WhatsApp/Discord group — and report what they did. YC's own advice: ship a small
version to a handful of real users first. Even "20 fans watched a match in Tamil,
N came back" beats a polished deck.]

---

## Team

- Solo founder today. [Honest + forward-looking:] I'm actively looking for a
  cofounder — ideally someone on growth/distribution into the cricket fan base — and
  I've shipped the whole product myself so far, which is the signal that I can move
  without waiting. [If you have anyone helping, name them and the real arrangement.]
- Equity: [state the true split / that you're 100% if solo.]

> YC slightly prefers teams; don't hide that you're solo. The counter is your
> shipping record and a clear cofounder plan.

---

## Please tell us about the time you most successfully hacked some (non-computer) system to your advantage.

[This must be a TRUE story — do not use anything invented. Structure it as:
constraint → what you did → outcome. A good one is concrete and a little cheeky.
Examples of the *shape* (replace with your real story): how you navigated a
bureaucratic process faster than everyone, got access/ء a resource you weren't
"supposed" to, turned a rule to your advantage. One paragraph.]

---

## Why now?

Three things just converged. (1) Multimodal models can finally *watch* live video with
low enough latency and cost to narrate it in real time — impossible 18 months ago.
(2) Sport has gone digital-first (63% of IPL 2025 viewing was streaming), which unbundles
it from the single TV feed. (3) Regional-language demand is exploding (regional IPL
watch-time share +33% YoY) but it's capped by the cost of human commentary — 160+
commentators across just 12 languages. The demand is proven and growing; the supply is
the bottleneck; and the thing that removes the bottleneck — an agent that understands the
match — just became buildable.

---

## The 1-minute video (script)

> YC rules: 1 minute, you on camera talking to it, **no screen-share, no demo,
> no music, no script read off-screen.** Record once.

- **0:00–0:15** — "I'm Amudhan. I built [IntentGuard / AccessMint — one shipped
  thing], and I'm a 3x hackathon winner out of NYU Courant and 3.5 years at IBM."
- **0:15–0:40** — "Commentator is AI commentary for the billion sports fans who never
  get it in their language. The agent watches the actual match and calls it live — in
  Tamil, in Hindi, in your style, your voice. Everyone in sports AI sells to
  broadcasters; nobody built it for the fan."
- **0:40–0:55** — "I put it in front of [N real fans] this week — [one real thing they
  did]. The hard part is real-time video and latency, which is my background."
- **0:55–1:00** — "We're [you + looking for a cofounder], and we're raising/joining
  YC to get this in front of millions of fans."

(Keep the actual demo for the application's demo-video field / link, not this video.)

---

## Pre-submit checklist (from YC's rubric)

- [ ] 50-char description names a **segment**, no jargon, no "next-gen / platform."
- [ ] Every bio line has a **link to something shipped**.
- [ ] Market math is **bottom-up** (users × price), not top-down.
- [ ] One wedge, no hedging across sports/features.
- [ ] Put it in front of **5–20 real fans** and write down what they did.
- [ ] Deploy the demo; paste the live URL.
- [ ] 1-min video: all on camera, under 90s, no demo/screencast.
- [ ] Proofread. Working links. (Professionalism axis.)

---

## Market evidence (sources for the figures above)

- IPL 2025: 620M unique viewers, 390M digital (63%), +14% digital YoY —
  cricmind.ai/news/ipl-broadcast-rights-viewership-numbers-2025
- Regional-language IPL growth (Kannada +30%, Telugu +23%, Tamil +12%; regional
  watch-time share +33%; 160+ commentators across 12 languages) —
  ardorcomm-media.com (JioStar regional-language IPL viewing)
- YC RFS "AI-Powered Consumer Products for 1 Billion People" — ycombinator.com/rfs
- Sports-AI comparables (all B2B): SportAI ($1.8M seed), Owl AI ($11M), Reely, WSC Sports.
