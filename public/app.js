// ─────────────────────────────────────────────────────────────────────────
// Player + agent UI.
//   - plays a muted clip, fires grounded commentary in sync (voice + caption)
//   - shows every moment: what the agent SAW and how it CALLED it
//   - "ask the agent" talks to /api/ask (live, when a key is set)
// Works with zero keys: sample tracks + the browser's built-in voice.
// ─────────────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);
const el = {
  file: $("file"), video: $("video"), empty: $("empty"),
  persona: $("persona"), lang: $("lang"), unmute: $("unmute"),
  third: $("third"), thirdSay: $("thirdSay"), thirdFlag: $("thirdFlag"),
  mode: $("mode"), modeText: $("modeText"),
  moments: $("moments"), status: $("status"),
  q: $("q"), send: $("send"), qa: $("qa"), suggest: $("suggest"),
};

let manifest = null;
let manifestName = "";
let fired = new Set();
let unmuteUntil = 0;

const PERSONA_LABEL = { drury: "Epic", analyst: "Analyst", neutral: "Call" };

// ---- load the track matching the current style + language -----------------
async function loadManifest() {
  manifestName = `manifest.${el.persona.value}.${el.lang.value}.json`;
  try {
    const res = await fetch(`tracks/${manifestName}`, { cache: "no-store" });
    if (!res.ok) throw 0;
    manifest = await res.json();
    fired = new Set();
    renderMoments();
    el.status.textContent = `${manifest.events.length} moments · ${el.persona.selectedOptions[0].text} · ${el.lang.selectedOptions[0].text}`;
  } catch {
    manifest = null;
    el.moments.innerHTML = `<p style="color:var(--muted);font-size:14px">No track for this combination yet. Generate one:<br><code>npm run track -- &lt;clip&gt; ${el.persona.value} ${el.lang.value}</code></p>`;
    el.status.textContent = "";
  }
}

function renderMoments() {
  el.moments.innerHTML = "";
  if (!manifest) return;
  manifest.events.forEach((e, i) => {
    const kind = (e.eventType || "").toLowerCase();
    const card = document.createElement("div");
    card.className = "moment";
    card.id = `m-${i}`;
    card.innerHTML = `
      <div class="head">
        <span class="time">${fmt(e.t)}</span>
        <span class="chip ${kind}">${e.eventType || "moment"}</span>
      </div>
      ${e.saw ? `<p class="saw"><b>Saw:</b> ${esc(e.saw)}</p>` : ""}
      <p class="said">${esc(e.text)}</p>`;
    card.onclick = () => { if (el.video.src) { el.video.currentTime = Math.max(0, e.t - 2); el.video.play().catch(()=>{}); } };
    el.moments.appendChild(card);
  });
}

// ---- sync: fire commentary as the clip plays ------------------------------
function onTime() {
  if (!manifest) return;
  const now = el.video.currentTime;

  if (el.unmute.checked && now > unmuteUntil && el.video.muted === false) {
    el.video.muted = true;
    el.mode.classList.remove("on", "broadcast");
  }

  manifest.events.forEach((e, i) => {
    if (fired.has(i) || now < e.t) return;
    if (now - e.t > 1.5) { fired.add(i); return; }
    fired.add(i);
    trigger(e, i);
  });
}

function trigger(e, i) {
  document.querySelectorAll(".moment.active").forEach((n) => n.classList.remove("active"));
  $(`m-${i}`)?.classList.add("active");
  $(`m-${i}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });

  if (el.unmute.checked) {
    el.video.muted = false;
    unmuteUntil = el.video.currentTime + 8;
    el.mode.className = "mode on broadcast";
    el.modeText.textContent = "Real broadcast";
    showThird("Big moment", `Unmuting the broadcast — ${e.eventType || "watch this"}`);
    return;
  }
  el.thirdFlag.textContent = PERSONA_LABEL[el.persona.value] || "Live";
  showThird(null, e.text);
  speak(e);
}

// ---- voice: real mp3 if present, else browser speech ----------------------
let current = null;
function speak(e) {
  if (e.audio) {
    current?.pause();
    current = new Audio(e.audio);
    current.play().catch(() => {});
    flashMode("AI commentary");
    return;
  }
  try {
    const u = new SpeechSynthesisUtterance(e.text);
    u.lang = manifest.bcp47 || "en-US";
    u.rate = 1.05;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    flashMode("AI commentary");
  } catch {}
}
function flashMode(label) {
  el.mode.className = "mode on";
  el.modeText.textContent = label;
  clearTimeout(flashMode._t);
  flashMode._t = setTimeout(() => el.mode.classList.remove("on"), 4000);
}

let thirdTimer = null;
function showThird(flag, text) {
  if (flag) el.thirdFlag.textContent = flag;
  el.thirdSay.textContent = text;
  el.third.classList.add("show");
  clearTimeout(thirdTimer);
  thirdTimer = setTimeout(() => el.third.classList.remove("show"), 5000);
}

// ---- ask the agent --------------------------------------------------------
async function ask(question) {
  if (!question.trim()) return;
  const turn = document.createElement("div");
  turn.className = "turn";
  turn.innerHTML = `<p class="q">${esc(question)}</p><p class="a think">thinking…</p>`;
  el.qa.prepend(turn);
  el.q.value = ""; el.send.disabled = true;

  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ manifest: manifestName, question, language: el.lang.selectedOptions[0].text }),
    });
    const data = await res.json();
    turn.querySelector(".a").className = "a";
    turn.querySelector(".a").textContent = data.answer || data.error || "No answer.";
  } catch {
    turn.querySelector(".a").className = "a";
    turn.querySelector(".a").textContent = "Couldn't reach the agent. Is the server running?";
  } finally {
    el.send.disabled = false;
  }
}

const SUGGESTIONS = ["What just happened?", "What was the best chance?", "Who's on top?", "Summarize the match so far"];
el.suggest.innerHTML = "";
SUGGESTIONS.forEach((s) => {
  const b = document.createElement("button");
  b.textContent = s; b.onclick = () => ask(s);
  el.suggest.appendChild(b);
});

// ---- wiring ---------------------------------------------------------------
el.file.addEventListener("change", () => {
  const f = el.file.files?.[0];
  if (!f) return;
  el.video.src = URL.createObjectURL(f);
  el.video.muted = true; el.video.controls = true; el.video.style.display = "block";
  el.empty.style.display = "none";
  fired = new Set();
  el.video.play().catch(() => {});
});
el.video.addEventListener("timeupdate", onTime);
el.video.addEventListener("seeked", () => { fired = new Set(); });
el.persona.addEventListener("change", loadManifest);
el.lang.addEventListener("change", loadManifest);
el.unmute.addEventListener("change", () => {
  if (!el.unmute.checked) { el.video.muted = true; el.mode.classList.remove("on", "broadcast"); }
});
el.send.addEventListener("click", () => ask(el.q.value));
el.q.addEventListener("keydown", (e) => { if (e.key === "Enter") ask(el.q.value); });

function fmt(s) { const m = Math.floor(s/60), ss = String(Math.floor(s%60)).padStart(2,"0"); return `${m}:${ss}`; }
function esc(s) { const d = document.createElement("div"); d.textContent = s ?? ""; return d.innerHTML; }

loadManifest();
