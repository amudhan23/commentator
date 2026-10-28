// ─────────────────────────────────────────────────────────────────────────
// Commentator — full app. Watch / Studio / Commentators.
// Vanilla JS, no framework. Talks to the server APIs; falls back to the
// browser's built-in voice when there's no studio-generated audio.
// ─────────────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);
const api = (p, opts) => fetch(p, opts).then((r) => r.json());

const state = {
  personas: [],
  languages: [],
  tracks: [],
  clips: [],
  manifest: null,
  manifestFile: "",
  fired: new Set(),
  unmuteUntil: 0,
};

// ---------- boot ----------
async function boot() {
  wireNav();
  wireWatch();
  wireStudio();
  wireCommentators();
  await refreshAll();
}

async function refreshAll() {
  const [pj, tj, cj] = await Promise.all([
    api("/api/personas"),
    api("/api/tracks"),
    api("/api/clips"),
  ]);
  state.personas = pj.personas || [];
  state.languages = pj.languages || [];
  state.tracks = tj.tracks || [];
  state.clips = cj.clips || [];
  state.canGenerate = !!pj.canGenerate;
  paintSelects();
  paintTrackList();
  paintClipList();
  paintPersonaCards();
  // status pill
  $("genDot").className = "dot" + (state.canGenerate ? "" : " off");
  $("statusText").textContent = state.canGenerate
    ? `Generate ready · ${state.tracks.length} track${state.tracks.length === 1 ? "" : "s"}`
    : `Add a Gemini key to generate`;
  if (!state.canGenerate) $("studioHint").textContent = "Add GEMINI_API_KEY to your .env to generate commentary. Until then you can browse and watch sample tracks.";
}

// ---------- nav ----------
function wireNav() {
  document.querySelectorAll("nav button").forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll("nav button").forEach((x) => x.classList.toggle("active", x === b));
      document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
      $("view-" + b.dataset.view).classList.add("active");
    };
  });
}

function go(view) {
  document.querySelectorAll("nav button").forEach((x) => x.classList.toggle("active", x.dataset.view === view));
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  $("view-" + view).classList.add("active");
}

// ---------- selects ----------
function paintSelects() {
  const personaOpts = state.personas.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
  const langOpts = state.languages.map((l) => `<option value="${l.slug}">${esc(l.name)}</option>`).join("");
  $("personaPick").innerHTML = personaOpts;
  $("langPick").innerHTML = langOpts;
  $("studioPersona").innerHTML = personaOpts;
  $("studioLang").innerHTML = langOpts;
}

function paintClipList() {
  const opts = ['<option value="">— upload one —</option>']
    .concat(state.clips.map((c) => `<option value="${esc(c.name)}">${esc(c.name)} (${mb(c.size)})</option>`));
  $("clipPick").innerHTML = opts.join("");
}

function paintTrackList() {
  if (!state.tracks.length) {
    $("trackPick").innerHTML = '<option value="">— no tracks yet —</option>';
    return;
  }
  $("trackPick").innerHTML = ['<option value="">— pick a track —</option>']
    .concat(state.tracks.map((t) =>
      `<option value="${esc(t.file)}">${esc(t.clip || "sample")} · ${esc(t.personaName)} · ${esc(t.langName)} · ${t.moments} moments</option>`))
    .join("");
}

// ---------- WATCH ----------
function wireWatch() {
  $("trackPick").onchange = () => loadTrackByFile($("trackPick").value);
  $("personaPick").onchange = () => switchVariant();
  $("langPick").onchange = () => switchVariant();
  $("localFile").onchange = () => {
    const f = $("localFile").files?.[0];
    if (!f) return;
    setVideo(URL.createObjectURL(f));
  };
  $("video").addEventListener("timeupdate", onTime);
  $("video").addEventListener("seeked", () => (state.fired = new Set()));
  $("unmute").onchange = () => { if (!$("unmute").checked) { $("video").muted = true; $("mode").classList.remove("on", "broadcast"); } };
  $("send").onclick = () => ask($("q").value);
  $("q").addEventListener("keydown", (e) => { if (e.key === "Enter") ask($("q").value); });
  const sug = ["What just happened?", "What was the best chance?", "Who's on top?", "Summarize the match"];
  $("suggest").innerHTML = "";
  sug.forEach((s) => { const b = document.createElement("button"); b.textContent = s; b.onclick = () => ask(s); $("suggest").appendChild(b); });
}

async function loadTrackByFile(file) {
  if (!file) return;
  const m = await fetch(`tracks/${file}`, { cache: "no-store" }).then((r) => r.json());
  state.manifest = m;
  state.manifestFile = file;
  state.fired = new Set();
  $("trackPick").value = file;
  if (state.personas.some((p) => p.id === m.persona)) $("personaPick").value = m.persona;
  $("langPick").value = m.langSlug;
  renderMoments();
  // video
  if (m.clip) {
    setVideo(`clips/${m.clip}`);
    $("watchStatus").textContent = `${m.events.length} moments · ${m.personaName} · ${m.langName}`;
  } else {
    // old sample track with no clip — ask for a local file
    showEmpty("This is a sample track. Load a match video to play it against.", true);
    $("watchStatus").textContent = `Sample · ${m.personaName || m.persona} · ${m.langName || m.langSlug}`;
  }
}

function switchVariant() {
  const m = state.manifest;
  if (!m || !m.clip) return;
  const want = state.tracks.find((t) => t.clip === m.clip && t.persona === $("personaPick").value && t.langSlug === $("langPick").value);
  if (want) { loadTrackByFile(want.file); }
  else { $("watchStatus").textContent = `No "${$("personaPick").selectedOptions[0].text} · ${$("langPick").selectedOptions[0].text}" track for this clip yet — generate it in the Studio.`; }
}

function setVideo(src) {
  const v = $("video");
  v.src = src; v.muted = true; v.controls = true; v.classList.remove("hidden");
  $("empty").classList.add("hidden");
  state.fired = new Set();
  v.play().catch(() => {});
}

function showEmpty(msg, localPick) {
  $("video").classList.add("hidden");
  $("empty").classList.remove("hidden");
  $("emptyMsg").textContent = msg;
  $("localPickWrap").style.display = localPick ? "inline-flex" : "none";
}

function renderMoments() {
  const box = $("moments");
  box.innerHTML = "";
  (state.manifest?.events || []).forEach((e, i) => {
    const kind = (e.eventType || "").toLowerCase();
    const d = document.createElement("div");
    d.className = "moment"; d.id = `m-${i}`;
    d.innerHTML = `<div class="head"><span class="time mono-num">${fmt(e.t)}</span><span class="chip ${kind}">${esc(e.eventType || "moment")}</span></div>
      ${e.saw ? `<p class="saw"><b>Saw:</b> ${esc(e.saw)}</p>` : ""}
      <p class="said">${esc(e.text)}</p>`;
    d.onclick = () => { const v = $("video"); if (v.src) { v.currentTime = Math.max(0, e.t - 2); v.play().catch(() => {}); } };
    box.appendChild(d);
  });
}

function onTime() {
  const m = state.manifest; if (!m) return;
  const now = $("video").currentTime;
  if ($("unmute").checked && now > state.unmuteUntil && $("video").muted === false) {
    $("video").muted = true; $("mode").classList.remove("on", "broadcast");
  }
  m.events.forEach((e, i) => {
    if (state.fired.has(i) || now < e.t) return;
    if (now - e.t > 1.5) { state.fired.add(i); return; }
    state.fired.add(i); trigger(e, i);
  });
}

let flashT, thirdT, curAudio;
function trigger(e, i) {
  document.querySelectorAll(".moment.active").forEach((n) => n.classList.remove("active"));
  const node = $(`m-${i}`); node?.classList.add("active"); node?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  if ($("unmute").checked) {
    $("video").muted = false; state.unmuteUntil = $("video").currentTime + 8;
    $("mode").className = "mode on broadcast"; $("modeText").textContent = "Real broadcast";
    showThird("Big moment", `Unmuting broadcast — ${e.eventType || "watch this"}`); return;
  }
  $("thirdFlag").textContent = (state.manifest.personaName || "Live");
  showThird(null, e.text); speak(e);
}
function speak(e) {
  if (e.audio) { curAudio?.pause(); curAudio = new Audio(e.audio); curAudio.play().catch(() => {}); flashMode("AI commentary"); return; }
  try { const u = new SpeechSynthesisUtterance(e.text); u.lang = state.manifest.bcp47 || "en-US"; u.rate = 1.05; speechSynthesis.cancel(); speechSynthesis.speak(u); flashMode("AI commentary"); } catch {}
}
function flashMode(label) { $("mode").className = "mode on"; $("modeText").textContent = label; clearTimeout(flashT); flashT = setTimeout(() => $("mode").classList.remove("on"), 4000); }
function showThird(flag, text) { if (flag) $("thirdFlag").textContent = flag; $("thirdSay").textContent = text; $("third").classList.add("show"); clearTimeout(thirdT); thirdT = setTimeout(() => $("third").classList.remove("show"), 5000); }

async function ask(question) {
  if (!question.trim() || !state.manifestFile) { if (!state.manifestFile) $("watchStatus").textContent = "Load a track first."; return; }
  const turn = document.createElement("div"); turn.className = "turn";
  turn.innerHTML = `<p class="q">${esc(question)}</p><p class="a think">thinking…</p>`;
  $("qa").prepend(turn); $("q").value = ""; $("send").disabled = true;
  try {
    const data = await api("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ manifest: state.manifestFile, question, language: state.manifest?.langName || "English" }) });
    const a = turn.querySelector(".a"); a.className = "a"; a.textContent = data.answer || data.error || "No answer.";
  } catch { const a = turn.querySelector(".a"); a.className = "a"; a.textContent = "Couldn't reach the agent."; }
  finally { $("send").disabled = false; }
}

// ---------- STUDIO ----------
function wireStudio() {
  $("uploadFile").onchange = uploadClip;
  $("generate").onclick = generate;
  $("watchResult").onclick = () => { go("watch"); if (studioResult) loadTrackByFile(studioResult); };
}

async function uploadClip() {
  const f = $("uploadFile").files?.[0]; if (!f) return;
  $("studioHint").textContent = `Uploading ${f.name}…`;
  try {
    const r = await fetch("/api/upload", { method: "POST", headers: { "x-filename": f.name }, body: f });
    const j = await r.json();
    if (j.error) { $("studioHint").textContent = j.error; return; }
    await refreshAll();
    $("clipPick").value = j.name;
    $("studioHint").textContent = `Uploaded ${j.name} (${mb(j.size)}). Pick a commentator and generate.`;
  } catch { $("studioHint").textContent = "Upload failed."; }
}

let studioResult = "";
async function generate() {
  const clip = $("clipPick").value;
  if (!clip) { $("studioHint").textContent = "Upload or pick a clip first."; return; }
  const body = { clip, persona: $("studioPersona").value, langSlug: $("studioLang").value, maxMoments: Number($("studioMax").value) };
  studioResult = ""; $("watchResult").classList.add("hidden");
  $("generate").disabled = true;
  $("progress").classList.add("on");
  $("feed").innerHTML = ""; $("progBar").style.width = "0"; $("progCount").textContent = "";
  $("progTitle").textContent = "Watching the match…";

  let total = 0, seen = 0;
  try {
    const res = await fetch("/api/process", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || `HTTP ${res.status}`); }
    const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
        if (!chunk.startsWith("data: ")) continue;
        const e = JSON.parse(chunk.slice(6));
        if (e.type === "start") { total = e.analyzing; $("progTitle").textContent = `Analyzing ${e.analyzing} moments (of ${e.flagged} flagged)…`; }
        else if (e.type === "moment") { seen++; addFeed(e.t, `${e.eventType}: ${e.text}`, false); bar(seen, total); }
        else if (e.type === "skip") { seen++; addFeed(e.t, `skipped (${e.reason})`, true); bar(seen, total); }
        else if (e.type === "done") { studioResult = e.name; $("progTitle").textContent = `Done — ${e.kept} moments called.`; $("progBar").style.width = "100%"; $("watchResult").classList.remove("hidden"); await refreshAll(); }
        else if (e.type === "error") { $("progTitle").textContent = "Error"; addFeed(0, e.message, true); }
      }
    }
  } catch (err) { $("progTitle").textContent = "Failed"; addFeed(0, String(err.message || err), true); }
  finally { $("generate").disabled = false; }
}
function addFeed(t, text, skip) { const d = document.createElement("div"); d.className = "line" + (skip ? " skip" : ""); d.innerHTML = `<span class="t mono-num">${t ? fmt(t) : ""}</span><span>${esc(text)}</span>`; $("feed").appendChild(d); $("feed").scrollTop = $("feed").scrollHeight; }
function bar(seen, total) { $("progCount").textContent = `${seen}/${total}`; $("progBar").style.width = `${Math.round((seen / Math.max(1, total)) * 100)}%`; }

// ---------- COMMENTATORS ----------
function wireCommentators() {
  $("createForm").onsubmit = async (ev) => {
    ev.preventDefault();
    const body = { name: $("cName").value, tagline: $("cTag").value, style: $("cStyle").value, voiceId: $("cVoice").value, accent: $("cAccent").value };
    if (!body.name.trim() || !body.style.trim()) { $("createMsg").textContent = "Name and style are required."; return; }
    const j = await api("/api/personas", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (j.error) { $("createMsg").textContent = j.error; return; }
    $("createMsg").textContent = `Created “${j.persona.name}”.`;
    $("createForm").reset();
    await refreshAll();
  };
}
function paintPersonaCards() {
  $("personaCards").innerHTML = state.personas.map((p) => `
    <div class="card" style="border-top-color:${esc(p.accent || "#ffb020")}">
      <p class="nm">${esc(p.name)}</p>
      <p class="tg">${esc(p.tagline || "")}</p>
      <div class="meta"><span class="badge">${p.builtIn ? "built-in" : "custom"}</span><span class="badge">voice set</span></div>
    </div>`).join("");
}

// ---------- utils ----------
function fmt(s) { const m = Math.floor(s / 60), ss = String(Math.floor(s % 60)).padStart(2, "0"); return `${m}:${ss}`; }
function mb(b) { return `${(b / 1048576).toFixed(0)} MB`; }
function esc(s) { const d = document.createElement("div"); d.textContent = s ?? ""; return d.innerHTML; }

boot();
