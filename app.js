// =================== DSAT Movie and Drama ===================
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const LS = {
  get: (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};
const VIDEO_LINKS = typeof VIDEOS !== "undefined" ? VIDEOS : {};

// ---------- Profiles ----------
const PROFILES = [
  { name: "Main", emoji: "😎", color: "#e50914" },
  { name: "Family", emoji: "🙂", color: "#2b7fff" },
  { name: "Guest", emoji: "😀", color: "#f5a623" },
  { name: "Kids", emoji: "🧒", color: "#22c55e" },
];
let profile = sessionStorage.getItem("dsat_profile");
const pk = (k) => `dsat_${profile}_${k}`;
let myList = [], progress = {}, recent = {};
function loadProfileData() {
  myList = LS.get(pk("list"), []);
  progress = LS.get(pk("progress"), {});
  recent = LS.get(pk("recent"), {});
  const p = PROFILES.find((x) => x.name === profile) || PROFILES[0];
  const a = $("#avatarBtn"); a.textContent = p.emoji; a.style.background = p.color;
}
function showProfiles() {
  $("#profileList").innerHTML = PROFILES.map((p) =>
    `<button class="profile" data-profile="${p.name}"><div class="pic" style="background:${p.color}">${p.emoji}</div>${p.name}</button>`).join("");
  $("#profiles").classList.remove("hidden");
}

// ---------- View state ----------
let tab = "home", query = "", showId = null, heroTimer = null;
let posters = {}; // DSAT Originals use generated artwork (no TMDB lookup)
let tmdbKey = LS.get("dsat_tmdb", "");
const epInfo = {}; // tmdb episode names cache
const IMG = "https://image.tmdb.org/t/p/";

const keyOf = (it) => it.type + ":" + it.title + ":" + it.year;
const byId = (id) => ALL.find((x) => x.id === id);
const isSeries = (it) => it.type === "drama" || it.type === "anime";
const typeName = (it) => ({ movie: "MOVIE", drama: "DRAMA", anime: "ANIME", cartoon: "CARTOON" })[it.type];
const ytAt = (it, s, e) => it.yt && it.yt[(s || 1) - 1] && it.yt[(s || 1) - 1][(e || 1) - 1];
const sourceName = (it) => (it.type === "anime" ? "Muse Asia" : it.type === "cartoon" ? "Blender Studio" : it.cat.replace(/ Telefilms$/, ""));

// ---------- Artwork ----------
function hue(str) { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
function genBg(it, shift = 0) {
  const h = (hue(it.title) + shift) % 360;
  return `linear-gradient(160deg, hsl(${h},70%,42%) 0%, hsl(${(h + 40) % 360},65%,22%) 55%, hsl(${(h + 80) % 360},60%,10%) 100%)`;
}
function posterHTML(it) {
  if (it.yt) return `<div class="poster yt" style="background-image:url('https://i.ytimg.com/vi/${ytAt(it, 1, 1)[0]}/hqdefault.jpg')"><div class="p-title">${it.title}</div><div class="p-sub">${sourceName(it)} • ${it.len}</div></div>`;
  const p = posters[keyOf(it)];
  if (p && p.poster) return `<div class="poster real" style="background-image:url('${IMG}w342${p.poster}')"></div>`;
  return `<div class="poster gen" style="background:${genBg(it)}"><div class="p-title">${it.title}</div><div class="p-sub">${it.year} • ${it.genre.split(" • ")[0]}</div></div>`;
}
function backdropOf(it) {
  if (it.yt) return `url('https://i.ytimg.com/vi/${ytAt(it, 1, 1)[0]}/hqdefault.jpg')`;
  const p = posters[keyOf(it)];
  if (p && p.backdrop) return `url('${IMG}w1280${p.backdrop}')`;
  if (p && p.poster) return `url('${IMG}w780${p.poster}')`;
  return genBg(it);
}

// Upgrade a background to the HD (maxres) YouTube thumbnail when it exists
function hdBg(el, it) {
  const y = ytAt(it, 1, 1); if (!el || !y) return;
  el.dataset.hd = it.id;
  const im = new Image();
  im.onload = () => { if (im.naturalWidth > 200 && el.dataset.hd === it.id) el.style.backgroundImage = "url('" + im.src + "')"; };
  im.src = "https://i.ytimg.com/vi/" + y[0] + "/maxresdefault.jpg";
}

// ---------- Progress helpers ----------
const epKey = (it, s, e) => (isSeries(it) ? `${it.id}|${s}|${e}` : it.id);
function pct(key) { const p = progress[key]; return p && p.d ? Math.min(100, (p.t / p.d) * 100) : 0; }
function nextOf(it, s, e) {
  if (!isSeries(it)) return null;
  if (e < it.s[s - 1]) return { s, e: e + 1 };
  if (s < it.s.length) return { s: s + 1, e: 1 };
  return null;
}
function resumePoint(it) {
  const r = recent[it.id];
  if (!r) return isSeries(it) ? { s: 1, e: 1 } : {};
  if (isSeries(it) && pct(epKey(it, r.s, r.e)) > 95) return nextOf(it, r.s, r.e) || { s: r.s, e: r.e };
  return { s: r.s, e: r.e };
}
function playLabel(it) {
  const r = recent[it.id];
  if (!r) return isSeries(it) ? "Play S1:E1" : "Play";
  const rp = resumePoint(it);
  return isSeries(it) ? `Resume S${rp.s}:E${rp.e}` : (pct(it.id) > 95 ? "Play Again" : "Resume");
}
function continueList() {
  return Object.entries(recent)
    .map(([id, r]) => ({ it: byId(id), r }))
    .filter((x) => x.it && !( !isSeries(x.it) && pct(x.it.id) > 95))
    .sort((a, b) => b.r.ts - a.r.ts)
    .slice(0, 15);
}

// ---------- Cards & rows ----------
function card(it, o = {}) {
  let extra = "";
  if (o.cw) {
    const rp = resumePoint(it);
    const k = epKey(it, rp.s, rp.e);
    extra = `<div class="cw"><small>${isSeries(it) ? `S${rp.s}:E${rp.e}` : "Continue"}</small><div class="bar"><i style="width:${pct(k)}%"></i></div></div><div class="play-ico">▶</div>`;
  }
  return `<div class="card" data-id="${it.id}" data-act="${o.act || "info"}">
    ${posterHTML(it)}
    <span class="badge">${typeName(it)}</span>
    ${it.rating ? `<span class="badge r">★ ${it.rating}</span>` : `<span class="badge r">${sourceName(it)}</span>`}
    ${o.rank ? `<span class="rank">${o.rank}</span>` : ""}
    ${extra || `<div class="hover-info"><b>${it.title}</b><span>${it.year} • ${it.lang} • ${it.len}</span></div>`}
  </div>`;
}
function row(title, items, o = {}) {
  if (!items.length) return "";
  return `<div class="row"><h3>${title}<small>${items.length} titles</small></h3>
    <div class="row-wrap"><button class="arrow left">‹</button>
    <div class="scroller">${items.map((it, i) => card(it, { ...o, rank: o.ranked ? i + 1 : 0 })).join("")}</div>
    <button class="arrow right">›</button></div></div>`;
}
const grid = (items, o = {}) => `<div class="grid">${items.map((it) => card(it, o)).join("")}</div>`;
const cats = (list) => [...new Set(list.map((x) => x.cat))];
const topRated = (list, n) => [...list].sort((a, b) => (b.views || 0) - (a.views || 0) || (+b.year || 0) - (+a.year || 0)).slice(0, n);
function trending() {
  const dr = DRAMAS.filter((d) => d.year >= 2026), mv = topRated(MOVIES, 10), an = ANIME, ct = CARTOONS;
  const out = [], src = [dr, mv, an, dr, mv, an, dr, ct, mv, dr];
  const idx = new Map();
  for (const l of src) { const i = idx.get(l) || 0; if (l[i]) out.push(l[i]); idx.set(l, i + 1); }
  return out;
}
const newest = (list, n) => [...list].sort((a, b) => (+b.year || 0) - (+a.year || 0)).slice(0, n);

function sectionRows(list, label, o = {}) {
  let html = `<h2 class="section-title">${label}</h2>`;
  const t = list[0].type;
  if (t === "movie") html += row("🔥 Sab Se Zyada Dekhi Gayi", topRated(list, 15), o);
  if (t === "drama") html += row("🆕 Sab Se Naye Dramas", list.filter((x) => x.year >= 2026).slice(0, 15), o);
  if (t === "anime" && !o.short) html += row("🆕 New Releases", newest(list, 12), o);
  cats(list).forEach((c) => (html += row(c, list.filter((x) => x.cat === c), o)));
  return html;
}
function cwRow() {
  const cw = continueList();
  return cw.length ? row(`Continue Watching for ${profile}`, cw.map((x) => x.it), { cw: true, act: "resume" }) : "";
}

// ---------- Hero ----------
function setHero(pool) {
  clearInterval(heroTimer);
  const hero = $("#hero");
  if (!pool) { hero.style.display = "none"; return; }
  hero.style.display = "";
  const picks = pool === ALL ? trending() : pool[0].type === "drama" ? pool.filter((d) => d.year >= 2026).slice(0, 10) : topRated(pool, 10);
  let i = Math.floor(Math.random() * picks.length);
  const show = () => {
    const it = picks[i++ % picks.length];
    hero.style.backgroundImage = backdropOf(it);
    hdBg(hero, it);
    hero.innerHTML = `<div class="hero-content">
      <span class="hero-tag">FEATURED ${typeName(it)}</span>
      <h1>${it.title}</h1>
      <div class="meta">${it.rating ? `<span class="star">★ ${it.rating}</span>` : `<span class="star">${it.cat}</span>`}<span>${it.year}</span><span>${it.len}</span><span>${it.lang}</span><span>${it.genre}</span></div>
      <p>${it.desc}</p>
      <button class="btn primary" data-play="${it.id}">▶ ${playLabel(it)}</button>
      <button class="btn" data-info="${it.id}">ⓘ More Info</button>
    </div>`;
  };
  show();
  heroTimer = setInterval(show, 9000);
}

// ---------- Episodes ----------
function seasonSelect(it, s, where) {
  if (it.s.length === 1) return `<span class="note" style="padding:0">${it.s[0]} Episodes</span>`;
  return `<select class="season" data-season="${it.id}" data-where="${where}">
    ${it.s.map((n, i) => `<option value="${i + 1}" ${i + 1 === s ? "selected" : ""}>${(it.seasonNames && it.seasonNames[i]) || "Season " + (i + 1)} (${n} Ep)</option>`).join("")}</select>`;
}
function episodeItems(it, s, cur) {
  const info = epInfo[`${it.id}|${s}`] || [];
  let html = "";
  for (let e = 1; e <= it.s[s - 1]; e++) {
    const inf = info[e - 1] || {};
    const p = pct(epKey(it, s, e));
    const ytEp = ytAt(it, s, e);
    const thumb = ytEp ? `background-image:url('https://i.ytimg.com/vi/${ytEp[0]}/mqdefault.jpg')` : inf.still ? `background-image:url('${IMG}w300${inf.still}')` : `background:${genBg(it, e * 9)}`;
    const isCur = cur && cur.s === s && cur.e === e;
    html += `<div class="ep${isCur ? " current" : ""}" data-ep="${it.id}|${s}|${e}">
      <div class="ep-num">${e}</div>
      <div class="ep-thumb" style="${thumb}">${inf.still || ytEp ? "" : "E" + e}<span class="ep-play">▶</span>
        ${p ? `<div class="ep-prog"><i style="width:${p}%"></i></div>` : ""}</div>
      <div class="ep-txt"><div class="ep-top"><b>${(ytEp && ytEp[1]) || inf.name || "Episode " + e}</b><span>${inf.runtime || it.em}m</span></div>
        <p>${ytEp ? `${it.title} • ${(it.seasonNames && it.s.length > 1) ? it.seasonNames[s - 1] + " • " : ""}${ytEp[1]} — ${sourceName(it)} (official full episode)${e === 1 ? ". " + it.desc : ""}` : inf.overview || `${it.title} — Season ${s}, Episode ${e}. ${e === 1 ? it.desc : "Kahani aage barhti hai…"}`}</p></div>
    </div>`;
  }
  return html;
}
function episodesBlock(it, s, where, cur) {
  return `<div class="ep-head"><h2>Episodes</h2>${seasonSelect(it, s, where)}</div>
    <div class="ep-list" data-list="${it.id}" data-where="${where}">${episodeItems(it, s, cur)}</div>`;
}
function refreshEpisodes(it, s, where) {
  const list = $(`.ep-list[data-list="${it.id}"][data-where="${where}"]`);
  if (list) list.innerHTML = episodeItems(it, s, where === "player" ? { s: P.s, e: P.e } : null);
  loadSeasonInfo(it, s, where);
}

// ---------- Series page (Drama 2) ----------
function seriesPage(it) {
  const rp = resumePoint(it);
  const inList = myList.includes(it.id);
  return `<div class="series-page">
    <div class="sp-hero" style="background-image:${backdropOf(it)}"><div>
      <span class="hero-tag">DRAMA 2 • ALL EPISODES</span>
      <h1>${it.title}</h1>
      <div class="meta">${it.rating ? `<span class="star">★ ${it.rating}</span>` : `<span class="star">${it.cat}</span>`}<span>${it.year}</span><span>${it.len}</span><span>${it.lang}</span><span>${it.genre}</span></div>
      <p>${it.desc}</p>
      <button class="btn primary" data-play="${it.id}">▶ ${playLabel(it)}</button>
      <button class="btn" data-toggle="${it.id}">${inList ? "✓ My List" : "+ My List"}</button>
      <button class="btn" data-back>← Back</button>
    </div></div>
    ${episodesBlock(it, rp.s, "page")}
  </div>`;
}

// ---------- Render ----------
function render(keepScroll) {
  const main = $("#rows");
  $$(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab && !query));

  if (query) {
    const q = query.toLowerCase();
    const res = ALL.filter((x) => `${x.title} ${x.genre} ${x.lang} ${x.cat} ${x.year} ${x.type}`.toLowerCase().includes(q));
    setHero(null);
    main.innerHTML = `<div class="page-top"><h2 class="section-title">Results for "${query}"</h2>
      ${res.length ? grid(res) : `<div class="empty">Kuch nahi mila 😕 — koi aur naam try karo</div>`}</div>`;
  } else if (tab === "home") {
    setHero(ALL);
    main.innerHTML = cwRow() + row("🔥 Top 10 Today", trending(), { ranked: true })
      + sectionRows(DRAMAS, "Drama 1", { short: true })
      + sectionRows(MOVIES, "Movies", { short: true })
      + sectionRows(ANIME, "Anime", { short: true })
      + sectionRows(CARTOONS, "Cartoons", { short: true });
  } else if (tab === "movie") {
    setHero(MOVIES);
    main.innerHTML = sectionRows(MOVIES, "Movies") + `<h2 class="section-title">All Movies (${MOVIES.length})</h2>` + grid(MOVIES);
  } else if (tab === "cartoon") {
    setHero(CARTOONS);
    main.innerHTML = `<h2 class="section-title">Cartoons (${CARTOONS.length})</h2><p class="note">Blender Studio ki award-winning animated filmein — bilkul free aur legal.</p>` + grid(CARTOONS);
  } else if (tab === "anime") {
    setHero(ANIME);
    main.innerHTML = sectionRows(ANIME, "Anime") + `<h2 class="section-title">All Anime (${ANIME.length})</h2>` + grid(ANIME);
  } else if (tab === "drama1") {
    setHero(DRAMAS);
    main.innerHTML = sectionRows(DRAMAS, "Drama 1") + `<h2 class="section-title">All Dramas (${DRAMAS.length})</h2>` + grid(DRAMAS);
  } else if (tab === "drama2") {
    setHero(null);
    const it = showId && byId(showId);
    if (it) {
      main.innerHTML = seriesPage(it);
      hdBg($("#rows .series-page .sp-hero"), it);
      loadSeasonInfo(it, resumePoint(it).s, "page");
    } else {
      main.innerHTML = `<div class="page-top"><h2 class="section-title">Drama 2 — Episodes</h2>
        <p class="note">Kisi bhi drama pe click karo — us ki saari episodes yahin khul jayengi, jo dekhni ho dekho.</p>
        ${cats(DRAMAS).map((c) => `<h3 class="cat-title">${c}</h3>${grid(DRAMAS.filter((d) => d.cat === c), { act: "series" })}`).join("")}</div>`;
    }
  } else if (tab === "list") {
    setHero(null);
    const items = myList.map(byId).filter(Boolean);
    main.innerHTML = `<div class="page-top"><h2 class="section-title">My List</h2>
      ${items.length ? grid(items) : `<div class="empty">Aap ki list khaali hai. Kisi bhi movie, drama, anime ya cartoon pe "+ My List" dabao.</div>`}</div>`;
  }
  if (!keepScroll) window.scrollTo({ top: 0 });
}
function goTab(t, id) { tab = t; showId = id || null; query = ""; $("#search").value = ""; closeModals(); render(); }

// ---------- Details modal ----------
function openModal(id) {
  const it = byId(id);
  if (!it) return;
  const inList = myList.includes(id);
  const rp = resumePoint(it);
  const similar = ALL.filter((x) => x.id !== id && x.type === it.type && (x.cat === it.cat || x.genre.split(" • ")[0] === it.genre.split(" • ")[0])).slice(0, 8);
  $("#modalBody").innerHTML = `
    <div class="m-hero" style="background-image:${backdropOf(it)}">
      <div><h2>${it.title}</h2>
        <button class="btn primary" data-play="${it.id}">▶ ${playLabel(it)}</button>
        <button class="btn" data-toggle="${it.id}">${inList ? "✓ My List" : "+ My List"}</button>
        ${it.type === "drama" ? `<button class="btn red" data-series="${it.id}">📺 All Episodes (Drama 2)</button>` : ""}
      </div>
    </div>
    <div class="m-body">
      <div><div class="meta">${it.rating ? `<span class="star">★ ${it.rating}/10</span>` : `<span class="star">${it.cat}</span>`}<span>${it.year}</span><span>${it.len}</span><span>HD</span></div><p>${it.desc}</p></div>
      <div class="side"><div><b>Type:</b> ${typeName(it)}</div><div><b>Genre:</b> ${it.genre}</div>
        <div><b>Language:</b> ${it.lang}</div><div><b>Category:</b> ${it.cat}</div></div>
    </div>
    ${it.type === "anime" ? episodesBlock(it, rp.s, "modal") : ""}
    ${similar.length ? `<div class="similar"><h4>More Like This</h4>${grid(similar)}</div>` : ""}`;
  $("#modal").classList.remove("hidden");
  hdBg($("#modalBody .m-hero"), it);
  $("#modal .modal").scrollTop = 0;
  document.body.style.overflow = "hidden";
  if (it.type === "anime") loadSeasonInfo(it, rp.s, "modal");
}
function closeModals() {
  $$(".overlay").forEach((o) => o.classList.add("hidden"));
  if ($("#player").classList.contains("hidden")) document.body.style.overflow = "";
}
function toggleList(id, btn) {
  myList = myList.includes(id) ? myList.filter((x) => x !== id) : [...myList, id];
  LS.set(pk("list"), myList);
  if (btn) btn.textContent = myList.includes(id) ? "✓ My List" : "+ My List";
  if (tab === "list" && !query) render(true);
}

// =================== VIDEO PLAYER ===================
const player = $("#player"), vid = $("#vid"), yt = $("#yt");
const P = { it: null, s: 0, e: 0, hideT: null, nextT: null, saveT: 0 };
const ICON = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
  vol: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.6 3 2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4z"/></svg>',
};
const fmt = (t) => {
  t = Math.max(0, Math.floor(t || 0));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(s).padStart(2, "0");
};
const plId = (url) => { const m = String(url).match(/[?&]list=([\w-]+)/); return m && m[1]; };
function sourceFor(it, s, e) {
  const yv = ytAt(it, s, e);
  if (yv) { const u = "https://www.youtube.com/watch?v=" + yv[0]; return { src: u, demo: false, list: [u] }; }
  // 1) exact episode link  2) season playlist  3) whole-drama playlist  4) movie link
  const ep = isSeries(it) && VIDEO_LINKS[`${it.title}|${s}|${e}`];
  if (ep) return { src: ep, demo: false, list: [ep] };
  if (isSeries(it)) {
    const seasonPl = plId(VIDEO_LINKS[`${it.title}|${s}`]);
    if (seasonPl) return { src: "", pl: seasonPl, index: e - 1, demo: false, list: [] };
    const fullPl = plId(VIDEO_LINKS[it.title]);
    if (fullPl) {
      const before = it.s.slice(0, s - 1).reduce((a, b) => a + b, 0);
      return { src: "", pl: fullPl, index: before + e - 1, demo: false, list: [] };
    }
  } else if (VIDEO_LINKS[it.title]) {
    return { src: VIDEO_LINKS[it.title], demo: false, list: [VIDEO_LINKS[it.title]] };
  }
  const start = (hue(it.title) + (e || 0)) % DEMO_VIDEOS.length;
  const list = [...DEMO_VIDEOS.slice(start), ...DEMO_VIDEOS.slice(0, start), ...BACKUP_VIDEOS];
  return { src: list[0], demo: true, list };
}
// Try sources one by one; if one fails or hangs, move to the next automatically
function loadSource(i) {
  clearTimeout(P.loadT);
  $("#pErr").classList.add("hidden");
  if (i >= P.list.length) {
    $("#pSpin").classList.add("hidden");
    $("#pErr").innerHTML = ERR_HTML;
    $("#pErr").classList.remove("hidden");
    player.classList.remove("idle");
    return;
  }
  P.srcIdx = i;
  $("#pSpin").classList.remove("hidden");
  vid.src = P.list[i];
  vid.load();
  vid.play().catch(() => {});
  P.loadT = setTimeout(() => { if (vid.readyState < 1) loadSource(i + 1); }, 15000);
}
const ytId = (url) => { const m = String(url).match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([\w-]{11})/); return m && m[1]; };

function openPlayer(it, s, e) {
  if (isSeries(it) && !s) ({ s, e } = resumePoint(it));
  P.it = it; P.s = s; P.e = e;
  clearInterval(P.nextT);
  $("#modal").classList.add("hidden");
  $("#pNextBox").classList.add("hidden");
  $("#pEpPanel").classList.add("hidden");
  const { src, list, pl, index } = sourceFor(it, s, e);
  P.list = list;
  $("#pErr").classList.add("hidden");
  $("#pTitle").innerHTML = isSeries(it) ? `<b>${it.title}</b><span>S${s}:E${e} • ${(epInfo[`${it.id}|${s}`] || [])[e - 1]?.name || "Episode " + e}</span>` : `<b>${it.title}</b>`;
  $("#pNext").classList.toggle("hidden", !nextOf(it, s, e));
  $("#pEps").classList.toggle("hidden", !isSeries(it));
  $("#pYtNext").classList.toggle("hidden", !nextOf(it, s, e));
  $("#pYtEps").classList.toggle("hidden", !isSeries(it));
  $("#pYtTitle").textContent = isSeries(it) ? `${it.title} — S${s}:E${e}` : it.title;
  player.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  clearInterval(heroTimer);
  markRecent();
  const id = ytId(src);
  if ((id || pl) && location.protocol === "file:") {
    vid.pause(); vid.removeAttribute("src"); vid.load();
    player.classList.remove("yt-mode");
    yt.src = "about:blank";
    $("#pErr").innerHTML = `<h3>Website ko "Start DSAT.bat" se kholo</h3>
      <p>YouTube wali episodes tab chalti hain jab website http://localhost:8080 pe khuli ho.<br>
      Folder mein <b>Start DSAT.bat</b> pe double-click karo.</p>`;
    $("#pErr").classList.remove("hidden");
  } else if (id || pl) {
    vid.pause(); vid.removeAttribute("src"); vid.load();
    player.classList.add("yt-mode");
    yt.src = pl
      ? `https://www.youtube-nocookie.com/embed/videoseries?list=${pl}&index=${index}&autoplay=1&rel=0&playsinline=1`
      : `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  } else {
    player.classList.remove("yt-mode");
    yt.src = "about:blank";
    vid.playbackRate = 1; $("#pSpeedTxt").textContent = "1x";
    loadSource(0);
  }
  showControls();
}
function markRecent() {
  recent[P.it.id] = { s: P.s, e: P.e, ts: Date.now() };
  LS.set(pk("recent"), recent);
}
function saveProgress() {
  if (!P.it || !vid.duration) return;
  progress[epKey(P.it, P.s, P.e)] = { t: vid.currentTime, d: vid.duration };
  LS.set(pk("progress"), progress);
  markRecent();
}
function closePlayer() {
  saveProgress();
  clearInterval(P.nextT);
  clearTimeout(P.loadT);
  vid.pause(); vid.removeAttribute("src"); vid.load();
  yt.src = "about:blank";
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  player.classList.add("hidden");
  document.body.style.overflow = $("#modal").classList.contains("hidden") ? "" : "hidden";
  render(true);
}
function togglePlay() { if (vid.paused) vid.play(); else vid.pause(); flash(vid.paused ? ICON.pause : ICON.play); }
function flash(svg) { const f = $("#pFlash"); f.innerHTML = svg; f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); }
function skip(sec) { vid.currentTime = Math.min(Math.max(0, vid.currentTime + sec), vid.duration || 0); showControls(); }
function setVol(v) { vid.volume = Math.min(1, Math.max(0, v)); vid.muted = vid.volume === 0; LS.set("dsat_vol", vid.volume); updVol(); }
function updVol() { $("#pMute").innerHTML = vid.muted || vid.volume === 0 ? ICON.mute : ICON.vol; $("#pVol").value = vid.muted ? 0 : vid.volume; }
function toggleFs() { if (document.fullscreenElement) document.exitFullscreen(); else player.requestFullscreen?.().catch(() => {}); }
function showControls() {
  player.classList.remove("idle");
  clearTimeout(P.hideT);
  P.hideT = setTimeout(() => {
    if (!vid.paused && $("#pEpPanel").classList.contains("hidden")) player.classList.add("idle");
  }, 3000);
}
function playNext() {
  const n = nextOf(P.it, P.s, P.e);
  if (n) openPlayer(P.it, n.s, n.e);
}
function nextCountdown() {
  const n = nextOf(P.it, P.s, P.e);
  if (!n) return closePlayer();
  let c = 8;
  $("#pNextTitle").textContent = `S${n.s}:E${n.e} • ${(epInfo[`${P.it.id}|${n.s}`] || [])[n.e - 1]?.name || "Episode " + n.e}`;
  $("#pNextCount").textContent = c;
  $("#pNextBox").classList.remove("hidden");
  player.classList.remove("idle");
  clearInterval(P.nextT);
  P.nextT = setInterval(() => {
    $("#pNextCount").textContent = --c;
    if (c <= 0) { clearInterval(P.nextT); playNext(); }
  }, 1000);
}
function openEpPanel() {
  const panel = $("#pEpPanel");
  if (!panel.classList.contains("hidden")) return panel.classList.add("hidden");
  panel.innerHTML = episodesBlock(P.it, P.s, "player", { s: P.s, e: P.e });
  panel.classList.remove("hidden");
  loadSeasonInfo(P.it, P.s, "player");
  const cur = panel.querySelector(".ep.current");
  if (cur) cur.scrollIntoView({ block: "center" });
}

// video events
vid.addEventListener("loadedmetadata", () => {
  const p = progress[epKey(P.it, P.s, P.e)];
  if (p && p.t > 5 && p.t < vid.duration * 0.95) vid.currentTime = p.t;
});
vid.addEventListener("timeupdate", () => {
  const d = vid.duration || 0;
  $("#pPlayed").style.width = (d ? (vid.currentTime / d) * 100 : 0) + "%";
  $("#pTime").textContent = fmt(d - vid.currentTime);
  if (Date.now() - P.saveT > 4000) { P.saveT = Date.now(); saveProgress(); }
  if (isSeries(P.it) && d && d - vid.currentTime < 12 && $("#pNextBox").classList.contains("hidden") && nextOf(P.it, P.s, P.e) && !P.nextT_shown) {
    P.nextT_shown = true; nextCountdown();
  }
});
vid.addEventListener("loadstart", () => { P.nextT_shown = false; });
vid.addEventListener("progress", () => {
  if (vid.buffered.length && vid.duration) $("#pBuf").style.width = (vid.buffered.end(vid.buffered.length - 1) / vid.duration) * 100 + "%";
});
vid.addEventListener("play", () => { $("#pPlay").innerHTML = ICON.pause; showControls(); });
vid.addEventListener("pause", () => { $("#pPlay").innerHTML = ICON.play; player.classList.remove("idle"); saveProgress(); });
vid.addEventListener("waiting", () => $("#pSpin").classList.remove("hidden"));
vid.addEventListener("playing", () => { clearTimeout(P.loadT); $("#pSpin").classList.add("hidden"); });
vid.addEventListener("canplay", () => { clearTimeout(P.loadT); $("#pSpin").classList.add("hidden"); });
vid.addEventListener("error", () => {
  if (player.classList.contains("hidden") || player.classList.contains("yt-mode") || !vid.getAttribute("src")) return;
  loadSource((P.srcIdx || 0) + 1);
});
const ERR_HTML = $("#pErr").innerHTML;
player.addEventListener("click", (e) => { if (e.target.closest("#pRetry")) loadSource(0); });
vid.addEventListener("ended", () => {
  progress[epKey(P.it, P.s, P.e)] = { t: vid.duration, d: vid.duration };
  LS.set(pk("progress"), progress);
  if (isSeries(P.it) && nextOf(P.it, P.s, P.e)) { if ($("#pNextBox").classList.contains("hidden")) nextCountdown(); }
  else closePlayer();
});
vid.addEventListener("click", togglePlay);
vid.addEventListener("dblclick", toggleFs);

// controls
$("#pPlay").onclick = togglePlay;
$("#pRew").onclick = () => skip(-10);
$("#pFwd").onclick = () => skip(10);
$("#pBack").onclick = closePlayer;
$("#pNext").onclick = playNext;
$("#pEps").onclick = openEpPanel;
$("#pYtEps").onclick = openEpPanel;
$("#pYtNext").onclick = playNext;
$("#pFs").onclick = toggleFs;
$("#pMute").onclick = () => { vid.muted = !vid.muted; if (!vid.muted && vid.volume === 0) vid.volume = 0.5; updVol(); };
$("#pVol").oninput = (e) => setVol(+e.target.value);
$("#pSpeed").onclick = () => {
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
  vid.playbackRate = speeds[(speeds.indexOf(vid.playbackRate) + 1) % speeds.length];
  $("#pSpeedTxt").textContent = vid.playbackRate + "x";
};
$("#pNextNow").onclick = () => { clearInterval(P.nextT); playNext(); };
$("#pNextCancel").onclick = () => { clearInterval(P.nextT); $("#pNextBox").classList.add("hidden"); };
player.addEventListener("mousemove", showControls);
player.addEventListener("touchstart", showControls, { passive: true });

// seek bar
const bar = $("#pBar");
let dragging = false;
const barPos = (ev) => { const r = bar.getBoundingClientRect(); return Math.min(Math.max(ev.clientX - r.left, 0), r.width) / r.width; };
bar.addEventListener("pointerdown", (ev) => { dragging = true; bar.setPointerCapture(ev.pointerId); vid.currentTime = barPos(ev) * (vid.duration || 0); });
bar.addEventListener("pointermove", (ev) => {
  const f = barPos(ev);
  const h = $("#pHover"); h.textContent = fmt(f * (vid.duration || 0)); h.style.left = f * 100 + "%";
  if (dragging) vid.currentTime = f * (vid.duration || 0);
});
bar.addEventListener("pointerup", () => (dragging = false));

// =================== GLOBAL EVENTS ===================
document.addEventListener("click", (e) => {
  const t = e.target;
  let el;
  if ((el = t.closest("[data-profile]"))) {
    profile = el.dataset.profile; sessionStorage.setItem("dsat_profile", profile);
    loadProfileData(); $("#profiles").classList.add("hidden"); goTab("home"); return;
  }
  if ((el = t.closest("[data-ep]"))) { const [id, s, ep] = el.dataset.ep.split("|"); return openPlayer(byId(id), +s, +ep); }
  if (t.closest("#player")) return;
  if ((el = t.closest("[data-play]"))) return openPlayer(byId(el.dataset.play));
  if ((el = t.closest("[data-series]"))) return goTab("drama2", el.dataset.series);
  if ((el = t.closest("[data-info]"))) return openModal(el.dataset.info);
  if ((el = t.closest("[data-toggle]"))) return toggleList(el.dataset.toggle, el);
  if (t.closest("[data-back]")) return goTab("drama2");
  if (t.closest("[data-home]")) return goTab("home");
  if ((el = t.closest(".card"))) {
    const it = byId(el.dataset.id);
    if (el.dataset.act === "resume") return openPlayer(it);
    if (el.dataset.act === "series") return goTab("drama2", it.id);
    return openModal(it.id);
  }
  if ((el = t.closest(".arrow"))) {
    const sc = el.parentElement.querySelector(".scroller");
    sc.scrollBy({ left: (el.classList.contains("left") ? -1 : 1) * sc.clientWidth * 0.85 });
    return;
  }
  if ((el = t.closest(".tabs button"))) return goTab(el.dataset.tab);
  if (t.closest("#avatarBtn")) return showProfiles();
  if (t.closest("[data-close]") || t.classList.contains("overlay")) closeModals();
});
document.addEventListener("change", (e) => {
  const sel = e.target.closest("select[data-season]");
  if (sel) refreshEpisodes(byId(sel.dataset.season), +sel.value, sel.dataset.where);
});
document.addEventListener("keydown", (e) => {
  if (!player.classList.contains("hidden")) {
    if (player.classList.contains("yt-mode")) { if (e.key === "Escape") closePlayer(); return; }
    const k = e.key.toLowerCase();
    if (k === " " || k === "k") { e.preventDefault(); togglePlay(); }
    else if (k === "arrowleft") skip(-10);
    else if (k === "arrowright") skip(10);
    else if (k === "arrowup") { e.preventDefault(); setVol(vid.volume + 0.1); }
    else if (k === "arrowdown") { e.preventDefault(); setVol(vid.volume - 0.1); }
    else if (k === "f") toggleFs();
    else if (k === "m") $("#pMute").click();
    else if (k === "n") playNext();
    else if (k === "escape" && !document.fullscreenElement) closePlayer();
    showControls();
    return;
  }
  if (e.key === "Escape") closeModals();
});
let searchT;
$("#search").addEventListener("input", (e) => {
  clearTimeout(searchT);
  searchT = setTimeout(() => { query = e.target.value.trim(); render(); }, 250);
});
window.addEventListener("scroll", () => $("#nav").classList.toggle("solid", window.scrollY > 60));
window.addEventListener("beforeunload", saveProgress);

// settings
$("#settingsBtn").onclick = () => { $("#tmdbKey").value = tmdbKey; $("#settings").classList.remove("hidden"); };
$("#saveKey").onclick = () => { tmdbKey = $("#tmdbKey").value.trim(); LS.set("dsat_tmdb", tmdbKey); closeModals(); loadPosters(); };
$("#clearKey").onclick = () => { tmdbKey = ""; posters = {}; LS.set("dsat_tmdb", ""); LS.set("dsat_posters2", {}); closeModals(); render(); };

// =================== TMDB (optional real posters) ===================
async function fetchPoster(it) {
  const kind = it.type === "movie" ? "movie" : "tv";
  const base = `https://api.themoviedb.org/3/search/${kind}?api_key=${encodeURIComponent(tmdbKey)}&query=${encodeURIComponent(it.title)}`;
  let res = await fetch(`${base}&${kind === "movie" ? "year" : "first_air_date_year"}=${it.year}`);
  if (res.status === 401) throw new Error("bad key");
  let data = await res.json();
  if (!data.results?.length) data = await (await fetch(base)).json();
  const r = data.results?.[0];
  return r ? { poster: r.poster_path, backdrop: r.backdrop_path, tmdb: r.id } : { poster: null };
}
async function loadPosters() {
  if (!tmdbKey) return;
  const todo = ALL.filter((it) => !(keyOf(it) in posters));
  try {
    for (let i = 0; i < todo.length; i += 6) {
      const batch = todo.slice(i, i + 6);
      const out = await Promise.all(batch.map((it) => fetchPoster(it).catch((err) => { if (err.message === "bad key") throw err; return null; })));
      batch.forEach((it, j) => { if (out[j]) posters[keyOf(it)] = out[j]; });
      LS.set("dsat_posters2", posters);
    }
  } catch { alert("TMDB key sahi nahi hai. Settings (⚙) mein dobara check karo."); }
  if (player.classList.contains("hidden")) render(true);
}
async function loadSeasonInfo(it, s, where) {
  const p = posters[keyOf(it)];
  const k = `${it.id}|${s}`;
  if (!tmdbKey || !p || !p.tmdb || epInfo[k]) return;
  try {
    const d = await (await fetch(`https://api.themoviedb.org/3/tv/${p.tmdb}/season/${s}?api_key=${encodeURIComponent(tmdbKey)}`)).json();
    if (!d.episodes) return;
    epInfo[k] = d.episodes.map((x) => ({ name: x.name, overview: x.overview, still: x.still_path, runtime: x.runtime }));
    const list = $(`.ep-list[data-list="${it.id}"][data-where="${where}"]`);
    const sel = $(`select[data-season="${it.id}"][data-where="${where}"]`);
    if (list && (!sel || +sel.value === s)) list.innerHTML = episodeItems(it, s, where === "player" ? { s: P.s, e: P.e } : null);
  } catch {}
}

// =================== START ===================
vid.volume = LS.get("dsat_vol", 1);
$("#pPlay").innerHTML = ICON.play;
updVol();
if (profile) { loadProfileData(); render(); }
else { profile = PROFILES[0].name; loadProfileData(); render(); setTimeout(showProfiles, 1900); }
setTimeout(() => $("#intro").remove(), 2600);
