# a16z Speedrun (SR008) — application draft

> Deadline: **Nov 1, 11:59 PM PT.** Apply on the official site: **speedrun.a16z.com**
> (do NOT use the link in the email — it pointed to the wrong domain).
>
> Speedrun is **5 short questions**, read by two human partners (~5–10 min each).
> They fund AI / gaming / streaming / creative / next-gen entertainment. We fit:
> **AI + live sports streaming + entertainment.** Answers are short — tighten, don't pad.
> [brackets] = confirm or fill with something TRUE.

---

## 1. What are you building?

Commentator is AI commentary for live sport. You point it at a match; an AI agent
*watches the footage* — the real play, not a data feed — finds the moments that
matter, and calls them live in the language, style, and voice you choose. A fan who
only gets Hindi or English commentary can watch their cricket in Tamil; a fan who
finds the broadcast dull can get tactical analysis instead of hype. We start with
Indian-language cricket — the biggest fan base that today has to watch in a language
that isn't theirs — and open it to any sport and any creator's voice from there.

*(Lead with the product and the wedge. Don't say "we are building a platform that…")*

## 2. Who is it for?

Tamil-, Telugu-, and Bengali-speaking cricket fans who watch the IPL and
international cricket on their phones, and today get commentary only in Hindi or
English. It's the largest underserved-language audience in sport: of the IPL's 390M
digital viewers, the regional-language segment is both huge and the fastest-growing
(Kannada +30%, Telugu +23% YoY), yet only a handful of languages get a human feed.

*(Name a narrow, specific segment — not "sports fans," not "creators.")*

## 3. Why now?

Three dated shifts converged in 2025–26: (1) multimodal models can finally *watch*
live video cheaply enough to narrate it in real time — impossible 18 months ago;
(2) cricket went digital-first — **63% of IPL 2025 viewing was streaming** (390M
viewers), which unbundles it from the single TV feed; (3) regional-language demand is
surging — **regional watch-time share up 33% YoY** — but it's capped by the cost of
human commentary (160+ commentators across just 12 languages). Demand is proven and
growing; supply is the bottleneck; the thing that removes it just became buildable.

*(A dated shift with a number. Not "AI is changing everything.")*

## 4. Why you?

[Confirm in your voice:] I grew up watching cricket in India in languages that
weren't my first, I'm multilingual, and I can build the hard part: real-time video
understanding and low-latency delivery is systems work — my background ([3.5 yrs
production engineering at IBM], MSCS from NYU Courant, payments infra at Sahara AI,
**3x hackathon winner**). I've shipped the entire working product — agent, pipeline,
and app — myself. Live: [your-deploy-url] · code: github.com/amudhan23/commentator

*(One or two sentences on founder-market fit + proof you out-build. You're solo —
Speedrun accepts that when you have the building capability, and shipping the whole
thing yourself is exactly that signal. If you find a cofounder, add them.)*

## 5. What is working?  ← THE ONE THAT NEEDS A NUMBER TODAY

[This is the make-or-break answer. Qualitative = "no traction" to them. Fill with
HARD numbers you can get in the next few hours — see the plan below. Example of the
shape, replace with real figures:]

> Working product, live at [url]. I put it in front of [N] cricket fans in
> [a Tamil cricket WhatsApp/Discord group] this week: they watched [X] matches called
> in Tamil, [Z] said they'd use it over the default feed, and [k]% came back for a
> second. I've generated commentary across [Y] languages grounded in real match video.

Minimum viable version if you get nothing else: "Product is live and working end to
end; the agent watches real match footage and calls it in [N] languages — try it at
[url]." A working link they can click beats any adjective.

---

## The 24-hour plan (do in this order)

1. **Deploy it** (≈20 min) — follow DEPLOY.md → Render. You need a live URL for Q4
   and Q5. A clickable working product is the single strongest thing in this app.
2. **Enable Gemini billing** (2 min) — so the live site actually generates for
   visitors (free tier's 20/day will run out instantly with real users).
3. **Get real usage** (the rest of the day) — post the link in 2–3 Tamil/Telugu
   cricket communities (Reddit r/Cricket, fan WhatsApp/Discord, X). Ask people to
   watch a match in their language and tell you if they'd use it. **Write down the
   numbers**: visitors, matches generated, languages used, "would use it" replies.
   Even 20 real fans and a handful of "yes I'd use this" is a real Q5 answer.
4. **Fill the brackets**, tighten every answer to a few sentences, proofread.
5. **Apply at speedrun.a16z.com** before 11:59 PM PT Nov 1. Confirm the deadline and
   eligibility there (SF relocation for the 12-week cohort; work authorization).

## Fit check (so you don't get screened on thesis)

Speedrun funds AI / gaming / streaming / creative / entertainment. Commentator is
AI + live-sports streaming + a creator angle (bring-your-own-commentator). State that
framing — don't let it read as "B2B SaaS," which is a poor fit for them.
