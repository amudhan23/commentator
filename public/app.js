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
  condense: false,
  windows: [],
};

// ---------- boot ----------
async function boot() {
  wireNav();
  wireWatch();
  wireStudio();
  wireLive();
  wireCommentators();
  heroAnim();
  $("shareBtn").onclick = shareCurrent;
  $("sheetClose").onclick = closeShareSheet;
  $("shareSheet").onclick = (e) => { if (e.target.id === "shareSheet") closeShareSheet(); };
  $("shCopy").onclick = () => copy($("shLink").value, () => toast("Link copied"));
  wireWaitlist();
  await refreshAll();
  // deep link: /?t=<trackfile>[&m=<momentIndex>] opens that match (at that moment)
  const params = new URLSearchParams(location.search);
  const t = params.get("t");
  if (t && state.tracks.some((x) => x.file === t)) {
    const m = params.get("m");
    state.pendingMoment = m !== null ? Number(m) : null;
    go("watch"); loadTrackByFile(t);
    // Arrived from a shared link — invite them to make their own (close the loop).
    const cta = $("watchCta"); if (cta) cta.hidden = false;
  }
}

async function refreshAll() {
  const [pj, tj, cj, vj] = await Promise.all([
    api("/api/personas"),
    api("/api/tracks"),
    api("/api/clips"),
    api("/api/voices").catch(() => ({ voices: [] })),
  ]);
  state.personas = pj.personas || [];
  state.languages = pj.languages || [];
  state.sports = pj.sports || [];
  state.tracks = tj.tracks || [];
  state.clips = cj.clips || [];
  state.voices = vj.voices || [];
  state.canGenerate = !!pj.canGenerate;
  paintVoices();
  paintSelects();
  paintTrackList();
  paintClipList();
  paintPersonaCards();
  paintGallery();
  paintFeatured();
  paintDashRecent();
  // status pill (top bar + sidebar)
  const statusText = state.canGenerate
    ? `Generate ready · ${state.tracks.length} track${state.tracks.length === 1 ? "" : "s"}`
    : `Add a Gemini key to generate`;
  $("genDot").className = "dot" + (state.canGenerate ? "" : " off");
  $("statusText").textContent = statusText;
  if ($("sbDot")) $("sbDot").className = "dot" + (state.canGenerate ? "" : " off");
  if ($("sbStatus")) $("sbStatus").textContent = state.canGenerate ? "Generate ready" : "No Gemini key";
  if (!state.canGenerate) $("studioHint").textContent = "Add GEMINI_API_KEY to your .env to generate commentary. Until then you can browse and watch sample tracks.";
}

// ---------- nav ----------
function wireNav() {
  document.querySelectorAll("nav button, .sb-nav button").forEach((b) => {
    b.onclick = () => go(b.dataset.view);
  });
  document.querySelectorAll("[data-go]").forEach((b) => { b.onclick = () => go(b.dataset.go); });
}

function go(view) {
  // site mode = marketing landing; app mode = sidebar shell
  document.body.classList.toggle("app", view !== "home");
  document.querySelectorAll("nav button, .sb-nav button").forEach((x) => x.classList.toggle("active", x.dataset.view === view));
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  $("view-" + view).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
window.__go = go;

// hero caption animation — the product's magic, told in one loop.
// Auto-cycles languages; clicking a chip pins that language (interactive demo).
function heroAnim() {
  const say = $("heroSay"), flag = $("heroFlag");
  if (!say) return;
  const LINES = {
    en: { flag: "ENGLISH", text: "Oh, it's there! Low into the corner — and the ground ERUPTS!" },
    ta: { flag: "தமிழ்", text: "அடேயப்பா! என்ன ஒரு கோல்! மைதானமே அதிர்கிறது!" },
    hi: { flag: "हिन्दी", text: "क्या गोल है! कोने में — और पूरा स्टेडियम गूँज उठा!" },
    te: { flag: "తెలుగు", text: "ఏమి గోల్! మూలలోకి — స్టేడియం దద్దరిల్లింది!" },
    es: { flag: "ESPAÑOL", text: "¡GOOOL! ¡Al ángulo, imposible para el arquero!" },
  };
  const order = ["en", "ta", "hi", "te", "es"];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let i = 0, pinned = null, token = 0;

  function render(code) {
    const l = LINES[code]; if (!l) return;
    flag.textContent = l.flag;
    document.querySelectorAll("#heroLangs button").forEach((x) => x.classList.toggle("on", x.dataset.lang === code));
    const myToken = ++token;
    if (reduce) { say.textContent = l.text; return; }
    let c = 0; say.textContent = "";
    (function type() {
      if (myToken !== token) return; // superseded by a newer render
      say.textContent = l.text.slice(0, c++);
      if (c <= l.text.length) setTimeout(type, 26);
    })();
  }
  function loop() {
    if (pinned) return; // paused while a chip is pinned
    render(order[i % order.length]); i++;
    setTimeout(loop, 2600);
  }
  // chips
  document.querySelectorAll("#heroLangs button").forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll("#heroLangs button").forEach((x) => x.classList.toggle("on", x === b));
      pinned = b.dataset.lang;
      render(pinned);
    };
  });
  render(order[0]); i = 1;
  if (!reduce) setTimeout(loop, 2600);
}

// ---------- selects ----------
function paintSelects() {
  const personaOpts = state.personas.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
  const langOpts = state.languages.map((l) => `<option value="${l.slug}">${esc(l.name)}</option>`).join("");
  $("personaPick").innerHTML = personaOpts;
  $("langPick").innerHTML = langOpts;
  $("studioPersona").innerHTML = personaOpts;
  $("studioLang").innerHTML = langOpts;
  const sportSel = $("studioSport");
  if (sportSel) sportSel.innerHTML = state.sports.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("");
  paintLiveSelects();
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
  $("condense").onchange = toggleCondense;
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
  if (state.condense) computeWindows();
  // video
  if (m.clip) {
    setVideo(`clips/${m.clip}`);
    recordView(file);
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
  v.onloadeddata = () => {
    if (state.pendingMoment != null && state.manifest?.events?.[state.pendingMoment]) {
      v.currentTime = Math.max(0, state.manifest.events[state.pendingMoment].t - 3);
      state.pendingMoment = null;
    } else if (state.condense && state.windows.length) {
      v.currentTime = state.windows[0].start;
    }
    v.play().catch(() => {});
  };
}

function showEmpty(msg, localPick) {
  $("video").classList.add("hidden");
  $("empty").classList.remove("hidden");
  $("emptyMsg").textContent = msg;
  $("localPickWrap").style.display = localPick ? "inline-flex" : "none";
}

// ---------- condense ("just the moments") ----------
// Build play windows around the significant moments; skip the rest.
function computeWindows() {
  const evs = (state.manifest?.events || []).slice().sort((a, b) => a.t - b.t);
  if (!evs.length) { state.windows = []; return; }
  let keep = evs.filter((e) => (e.significance ?? 0.6) >= 0.5);
  if (keep.length < 2) keep = evs; // too few? keep them all
  const PRE = 4, POST = 7;
  const raw = keep.map((e) => ({ start: Math.max(0, e.t - PRE), end: e.t + POST }));
  const merged = [];
  for (const w of raw) {
    const last = merged[merged.length - 1];
    if (last && w.start <= last.end + 1) last.end = Math.max(last.end, w.end);
    else merged.push({ ...w });
  }
  state.windows = merged;
}
function toggleCondense() {
  state.condense = $("condense").checked;
  const v = $("video");
  if (state.condense) {
    computeWindows();
    if (!state.windows.length) { $("watchStatus").textContent = "No moments to condense yet."; return; }
    const total = Math.round(state.windows.reduce((s, w) => s + (w.end - w.start), 0));
    const mins = total >= 60 ? `${Math.round(total / 60)} min` : `${total}s`;
    $("watchStatus").textContent = `Condensed — ${state.windows.length} key moments, about ${mins}.`;
    if (v.src) { state.fired = new Set(); v.currentTime = state.windows[0].start; v.play().catch(() => {}); }
  } else if (state.manifest) {
    $("watchStatus").textContent = `${state.manifest.events.length} moments · ${state.manifest.personaName} · ${state.manifest.langName}`;
  }
}

function renderMoments() {
  const box = $("moments");
  box.innerHTML = "";
  (state.manifest?.events || []).forEach((e, i) => {
    const kind = (e.eventType || "").toLowerCase();
    const d = document.createElement("div");
    d.className = "moment"; d.id = `m-${i}`;
    d.innerHTML = `<div class="head"><span class="time mono-num">${fmt(e.t)}</span><span class="chip ${kind}">${esc(e.eventType || "moment")}</span>
        <span class="macts">
          <button class="micro" data-mshare="${i}" title="Share this moment">Share</button>
          <button class="micro" data-mclip="${i}" title="Make a shareable clip">Clip</button>
        </span>
      </div>
      ${e.saw ? `<p class="saw"><b>Saw:</b> ${esc(e.saw)}</p>` : ""}
      <p class="said">${esc(e.text)}</p>`;
    d.onclick = (ev) => { if (ev.target.closest(".micro")) return; const v = $("video"); if (v.src) { v.currentTime = Math.max(0, e.t - 2); v.play().catch(() => {}); } };
    box.appendChild(d);
  });
  box.querySelectorAll("[data-mshare]").forEach((b) => b.onclick = (ev) => { ev.stopPropagation(); shareMoment(+b.dataset.mshare); });
  box.querySelectorAll("[data-mclip]").forEach((b) => b.onclick = (ev) => { ev.stopPropagation(); makeMomentClip(+b.dataset.mclip, b); });
}

function shareMoment(i) {
  if (!state.manifestFile) return;
  const url = `${location.origin}/?t=${encodeURIComponent(state.manifestFile)}&m=${i}`;
  const m = trackMeta(state.manifestFile);
  const lang = m?.langName ? ` in ${m.langName}` : "";
  openShareSheet(url, `🔥 Watch this moment called${lang} by AI — try your own free at`);
}

async function makeMomentClip(i, btn) {
  const label = btn.textContent;
  btn.textContent = "…"; btn.disabled = true;
  try {
    const j = await api("/api/clip", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ file: state.manifestFile, index: i }) });
    if (j.url) { const a = document.createElement("a"); a.href = j.url; a.download = ""; a.target = "_blank"; document.body.appendChild(a); a.click(); a.remove(); toast("Clip ready — downloading"); }
    else toast(j.error || "Clip failed");
  } catch { toast("Clip failed"); }
  finally { btn.textContent = label; btn.disabled = false; }
}

function onTime() {
  const m = state.manifest; if (!m) return;
  const v = $("video");
  const now = v.currentTime;
  // Condense: skip the dead time between key-moment windows.
  if (state.condense && state.windows.length) {
    const inWin = state.windows.some((w) => now >= w.start - 0.3 && now <= w.end);
    if (!inWin) {
      const next = state.windows.find((w) => w.start > now + 0.1);
      if (next) { v.currentTime = next.start; return; }
      if (now < state.windows[state.windows.length - 1].end) { /* still in last window */ }
      else { v.pause(); showThird("Done", "That's the match — the moments that mattered."); return; }
    }
  }
  if ($("unmute").checked && now > state.unmuteUntil && v.muted === false) {
    v.muted = true; $("mode").classList.remove("on", "broadcast");
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
  const body = { clip, persona: $("studioPersona").value, langSlug: $("studioLang").value, sport: $("studioSport").value, energy: $("studioEnergy").value, maxMoments: Number($("studioMax").value) };
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

// ---------- LIVE ----------
const live = { stream: null, timer: null, busy: false, recent: [], lastSpoke: 0 };
function wireLive() {
  $("liveStart").onclick = startLive;
  $("liveStop").onclick = stopLive;
}
function paintLiveSelects() {
  $("liveSport").innerHTML = state.sports.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("");
  $("livePersona").innerHTML = state.personas.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
  $("liveLang").innerHTML = state.languages.map((l) => `<option value="${l.slug}">${esc(l.name)}</option>`).join("");
}
async function startLive() {
  if (!state.canGenerate) { $("liveStatus").textContent = "Live needs a Gemini key on the server (the deploy's key). Add one to use it."; return; }
  // If the user pasted a match link, open it in their own tab first (their
  // playback — we never fetch it server-side), then they share that tab.
  const url = ($("liveUrl")?.value || "").trim();
  if (url) {
    try { window.open(/^https?:\/\//i.test(url) ? url : "https://" + url, "_blank", "noopener"); } catch {}
    $("liveStatus").textContent = "Opened your match in a new tab. In the share dialog, pick that tab.";
    await new Promise((r) => setTimeout(r, 600));
  }
  try {
    live.stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: false, preferCurrentTab: false });
  } catch { $("liveStatus").textContent = "Screen share was cancelled or blocked."; return; }
  const v = $("liveVideo");
  v.srcObject = live.stream; v.classList.remove("hidden"); $("liveEmpty").classList.add("hidden");
  v.play().catch(() => {});
  $("liveBadge").classList.add("on");
  $("liveStart").classList.add("hidden"); $("liveStop").classList.remove("hidden");
  $("liveStatus").textContent = "Live — the agent is watching. Commentary lands a few seconds behind the action.";
  live.recent = [];
  live.stream.getVideoTracks()[0].addEventListener("ended", stopLive); // user hit browser "stop sharing"
  live.lastSig = null; live.lastCall = 0;
  live.timer = setInterval(liveTick, 3000); // poll fast; scene-detect skips static frames
  setTimeout(liveTick, 1200);
}
function stopLive() {
  if (live.timer) clearInterval(live.timer);
  live.timer = null;
  try { live.audio?.pause(); } catch {}
  try { speechSynthesis.cancel(); } catch {}
  live.stream?.getTracks().forEach((t) => t.stop());
  live.stream = null;
  $("liveVideo").classList.add("hidden"); $("liveEmpty").classList.remove("hidden");
  $("liveBadge").classList.remove("on"); $("liveThird").classList.remove("show");
  $("liveStart").classList.remove("hidden"); $("liveStop").classList.add("hidden");
  $("liveStatus").textContent = "Stopped.";
}
const liveCanvas = document.createElement("canvas");
function grabFrame() {
  const v = $("liveVideo");
  if (!v.videoWidth) return null;
  const w = 640, h = Math.round((v.videoHeight / v.videoWidth) * 640) || 360;
  liveCanvas.width = w; liveCanvas.height = h;
  liveCanvas.getContext("2d").drawImage(v, 0, 0, w, h);
  return liveCanvas.toDataURL("image/jpeg", 0.6);
}
// Cheap scene signature: tiny grayscale thumbnail, used to skip the vision
// call when the screen barely changed (paused, a static graphic, a timeout).
const sigCanvas = document.createElement("canvas"); sigCanvas.width = 32; sigCanvas.height = 18;
function sceneSig() {
  const v = $("liveVideo");
  if (!v.videoWidth) return null;
  const c = sigCanvas.getContext("2d", { willReadFrequently: true });
  c.drawImage(v, 0, 0, 32, 18);
  const d = c.getImageData(0, 0, 32, 18).data;
  const g = new Uint8Array(32 * 18);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) g[j] = (d[i] * 3 + d[i + 1] * 6 + d[i + 2]) / 10;
  return g;
}
function sigDiff(a, b) {
  if (!a || !b) return 999;
  let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length; // mean per-pixel brightness change, 0..255
}
async function liveTick() {
  if (live.busy || !live.stream) return;
  // Skip the vision call if the scene is nearly static — unless it's been a
  // while (heartbeat), so we don't poll a frozen screen but still re-check.
  const sig = sceneSig();
  const changed = sigDiff(sig, live.lastSig) > 6;           // ~scene/action change
  const stale = Date.now() - (live.lastCall || 0) > 11000;   // heartbeat
  if (!changed && !stale) return;
  live.lastSig = sig; live.lastCall = Date.now();
  const f1 = grabFrame(); if (!f1) return;
  await new Promise((r) => setTimeout(r, 250));
  const f2 = grabFrame();
  live.busy = true;
  try {
    const r = await api("/api/live", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ frames: [f1, f2].filter(Boolean), sport: $("liveSport").value, persona: $("livePersona").value, langSlug: $("liveLang").value, recent: live.recent }) });
    if (r.notable && r.commentary && Date.now() - live.lastSpoke > 3500) {
      live.lastSpoke = Date.now();
      live.recent.push(r.commentary); if (live.recent.length > 5) live.recent.shift();
      livePlay(r.audio, r.commentary, r.bcp47);
      liveShowThird(r.eventType, r.commentary);
      liveLog(r.eventType, r.commentary);
    }
  } catch { /* ignore a dropped tick */ }
  finally { live.busy = false; }
}
let liveThirdT;
function liveShowThird(type, text) {
  $("liveFlag").textContent = (type && type !== "nothing") ? String(type).toUpperCase() : "LIVE";
  $("liveSay").textContent = text;
  $("liveThird").classList.add("show");
  clearTimeout(liveThirdT); liveThirdT = setTimeout(() => $("liveThird").classList.remove("show"), 6000);
}
// Prefer the real ElevenLabs voice (served as a data URL); fall back to the
// browser voice if the server couldn't synthesize (no key, or a hiccup).
function livePlay(audio, text, bcp47) {
  if (audio) {
    try {
      live.audio?.pause();
      live.audio = new Audio(audio);
      live.audio.play().catch(() => liveSpeak(text, bcp47));
      return;
    } catch {}
  }
  liveSpeak(text, bcp47);
}
function liveSpeak(text, bcp47) {
  try { const u = new SpeechSynthesisUtterance(text); u.lang = bcp47 || "en-US"; u.rate = 1.07; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch {}
}
function liveLog(type, text) {
  const d = document.createElement("div");
  d.className = "moment";
  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  d.innerHTML = `<div class="head"><span class="time mono-num">${now}</span><span class="chip ${String(type).toLowerCase()}">${esc(type || "moment")}</span></div><p class="said">${esc(text)}</p>`;
  $("liveLog").prepend(d);
}

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
// ---------- waitlist ----------
function wireWaitlist() {
  const form = $("waitForm"); if (!form) return;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = $("waitEmail").value.trim();
    const j = await api("/api/waitlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    if (j.ok) { $("waitMsg").textContent = "You're on the list — we'll be in touch."; form.reset(); toast("Thanks — you're on the list"); }
    else { $("waitMsg").textContent = j.error || "Something went wrong."; }
  };
}

// ---------- EXPLORE gallery ----------
const PLAY_SVG = '<svg viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="12" r="11" fill="rgba(8,11,16,.65)"/><path d="M10 8l6 4-6 4z" fill="#fff"/></svg>';
function paintGallery() {
  const box = $("gallery");
  const shown = state.tracks.filter((t) => t.clip); // real generated matches
  const sum = $("exploreSummary");
  if (!shown.length) {
    if (sum) sum.textContent = "";
    box.innerHTML = `<div class="gempty">No matches called yet. <b>Open the Studio</b>, upload a clip, and be the first.</div>`;
    return;
  }
  if (sum) {
    const views = shown.reduce((a, t) => a + (t.views || 0), 0);
    const likes = shown.reduce((a, t) => a + (t.likes || 0), 0);
    const langs = new Set(shown.map((t) => t.langSlug)).size;
    sum.textContent = `${shown.length} matches · ${langs} languages · ${views.toLocaleString()} views · ${likes.toLocaleString()} likes`;
  }
  box.innerHTML = shown.map(trackCard).join("");
  wireCards(box);
}

const HEART = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-10-9.3C.3 8.4 2 5 5.2 5c2 0 3.3 1.1 4.1 2.3C10.1 6.1 11.4 5 13.4 5 16.6 5 18.3 8.4 16.6 11.7 14 16.4 12 21 12 21z"/></svg>';
const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
function trackCard(t) {
  const bg = t.thumb ? `style="background-image:url('${esc(t.thumb)}')"` : "";
  const liked = likedSet().has(t.file);
  return `<div class="gcard">
    <div class="thumb" ${bg}>
      <div class="pz">${PLAY_SVG}</div>
      <span class="tag" style="color:${esc(t.accent)}">${esc(t.personaName)} · ${esc(t.langName)}</span>
    </div>
    <div class="body">
      <p class="nm">${esc(prettyClip(t.clip))}</p>
      <p class="mt">${t.sportName ? esc(t.sportName) + " · " : ""}${t.moments} moments · ${esc(t.personaName)}</p>
    </div>
    <div class="stats">
      <span class="n">${EYE} ${t.views || 0}</span>
      <button class="like ${liked ? "on" : ""}" data-like="${esc(t.file)}">${HEART} <span>${t.likes || 0}</span></button>
    </div>
    <div class="acts">
      <button class="btn" data-watch="${esc(t.file)}">Watch</button>
      <button class="btn ghost" data-share="${esc(t.file)}">Share</button>
    </div>
  </div>`;
}
function wireCards(box) {
  box.querySelectorAll("[data-watch]").forEach((b) => b.onclick = () => { go("watch"); loadTrackByFile(b.dataset.watch); });
  box.querySelectorAll("[data-share]").forEach((b) => b.onclick = () => shareTrack(b.dataset.share));
  box.querySelectorAll("[data-like]").forEach((b) => b.onclick = () => likeTrack(b.dataset.like, b));
}

function paintDashRecent() {
  const box = $("dashRecent"); if (!box) return;
  const shown = state.tracks.filter((t) => t.clip).slice(0, 3);
  if (!shown.length) { box.innerHTML = `<div class="gempty">No matches yet — <b>Call a match</b> above to make your first.</div>`; return; }
  box.innerHTML = shown.map(trackCard).join("");
  wireCards(box);
}

function paintFeatured() {
  const box = $("featured"); if (!box) return;
  const shown = state.tracks.filter((t) => t.clip)
    .sort((a, b) => (b.views + b.likes * 3) - (a.views + a.likes * 3)).slice(0, 3);
  if (!shown.length) { $("featuredBlock").style.display = "none"; return; }
  $("featuredBlock").style.display = "block";
  box.innerHTML = shown.map(trackCard).join("");
  wireCards(box);
}

// per-browser liked set (prevents double-like from the same browser)
function likedSet() { try { return new Set(JSON.parse(localStorage.getItem("liked") || "[]")); } catch { return new Set(); } }
function saveLiked(s) { try { localStorage.setItem("liked", JSON.stringify([...s])); } catch {} }
async function likeTrack(file, btn) {
  const set = likedSet();
  if (set.has(file)) return; // already liked from this browser
  set.add(file); saveLiked(set);
  btn.classList.add("on");
  const span = btn.querySelector("span"); if (span) span.textContent = String((+span.textContent || 0) + 1);
  try { await api("/api/track/like", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ file }) }); } catch {}
}
let viewedThisSession = new Set();
function recordView(file) {
  if (viewedThisSession.has(file)) return;
  viewedThisSession.add(file);
  fetch("/api/track/view", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ file }) }).catch(() => {});
}
function prettyClip(name) { return String(name || "").replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); }

function shareCurrent() { if (state.manifestFile) shareTrack(state.manifestFile); else toast("Load a match first"); }
function trackMeta(file) { return (state.tracks || []).find((t) => t.file === file); }
function shareTrack(file) {
  const url = `${location.origin}/?t=${encodeURIComponent(file)}`;
  const m = trackMeta(file);
  const lang = m?.langName ? ` in ${m.langName}` : "";
  openShareSheet(url, `🏟️ Watch this match called${lang} by AI — try your own free at`);
}
function openShareSheet(url, text) {
  const u = encodeURIComponent(url), full = encodeURIComponent(text + " " + url), t = encodeURIComponent(text);
  $("shWhatsapp").href = `https://wa.me/?text=${full}`;
  $("shX").href = `https://twitter.com/intent/tweet?text=${t}&url=${u}`;
  $("shReddit").href = `https://www.reddit.com/submit?url=${u}&title=${encodeURIComponent("Match called by AI in your language — " + url)}`;
  $("shTelegram").href = `https://t.me/share/url?url=${u}&text=${t}`;
  $("shLink").value = url;
  $("shareSheet").hidden = false;
}
function closeShareSheet() { $("shareSheet").hidden = true; }
function copy(text, cb) { navigator.clipboard?.writeText(text).then(cb).catch(() => { prompt("Copy this link:", text); }); }
let toastT;
function toast(msg) { const t = $("toast"); t.textContent = msg; t.style.opacity = "1"; t.style.transform = "translateX(-50%) translateY(0)"; clearTimeout(toastT); toastT = setTimeout(() => { t.style.opacity = "0"; t.style.transform = "translateX(-50%) translateY(20px)"; }, 2200); }

function paintVoices() {
  const sel = $("cVoice"); if (!sel) return;
  if (state.voices.length) {
    sel.innerHTML = '<option value="">Default voice</option>' +
      state.voices.map((v) => `<option value="${esc(v.id)}">${esc(v.name)}</option>`).join("");
    $("voiceNote").textContent = `${state.voices.length} voices from your ElevenLabs library.`;
  } else {
    sel.innerHTML = '<option value="">Default voice</option>';
    $("voiceNote").textContent = "Add an ELEVENLABS_API_KEY to pick a voice; a default is used until then.";
  }
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
