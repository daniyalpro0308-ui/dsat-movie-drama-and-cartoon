// DSAT Movie and Drama — builds the library from dramas.js + content.js
// Every title plays an official, free, full video (YouTube embeds from the owners' channels).
// yt = [ season1: [[videoId, label], ...], season2: [...] ]

const fmtMins = (m) => (m ? (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`) : "Full Movie");

// ===== MOVIES — full telefilms =====
const MOVIES = REAL_MOVIES.map((m) => ({
  title: m.title, year: m.year || "", cat: m.ch + " Telefilms",
  genre: "Telefilm" + (m.eid ? " • Eid Special" : ""), rating: null, lang: "Urdu",
  len: fmtMins(m.mins), views: m.views,
  desc: (m.cast ? "Starring " + m.cast + ". " : "") + m.ch + " ki official poori telefilm (" + fmtMins(m.mins) + ").",
  yt: [[[m.id, "Full Movie"]]],
}));

// ===== CARTOONS — Blender open movies =====
const CARTOONS = REAL_CARTOONS.map((c) => ({
  title: c.title, year: c.year, cat: "Blender Open Movies", genre: c.genre, rating: null, lang: "English",
  len: c.len, desc: c.desc + " (Blender Studio — free open movie)",
  yt: [[[c.id, "Full Film"]]],
}));

// ===== DRAMAS — official full episodes =====
const DRAMAS = REAL_DRAMAS.map((x) => ({
  title: x.title, year: x.year, cat: x.ch, genre: x.genre, rating: null, lang: "Urdu",
  len: x.eps.length + " Episodes",
  desc: (x.cast ? "Starring " + x.cast + ". " : "") + x.ch + " ka official drama — " + x.eps.length + " poori episodes.",
  s: [x.eps.length], yt: [x.eps], em: 40,
}));

// ===== ANIME — Muse Asia official =====
const ANIME = REAL_ANIME.map((a) => {
  const total = a.seasons.reduce((n, s) => n + s.eps.length, 0);
  return {
    title: a.title, year: a.year, cat: a.seasons.length > 1 ? "Multi-Season Anime" : "New Season Anime",
    genre: a.genre, rating: null, lang: /Dub/.test(a.title) ? "English Dub" : "Japanese • Eng Sub",
    len: a.seasons.length > 1 ? `${a.seasons.length} Seasons • ${total} Ep` : `${total} Episodes`,
    desc: a.desc, s: a.seasons.map((s) => s.eps.length), seasonNames: a.seasons.map((s) => s.name),
    yt: a.seasons.map((s) => s.eps), em: 24,
  };
});

MOVIES.forEach((m, i) => { m.type = "movie"; m.id = "m" + i; });
CARTOONS.forEach((c, i) => { c.type = "cartoon"; c.id = "c" + i; });
DRAMAS.forEach((d, i) => { d.type = "drama"; d.id = "d" + i; });
ANIME.forEach((a, i) => { a.type = "anime"; a.id = "a" + i; });
const ALL = [...MOVIES, ...DRAMAS, ...ANIME, ...CARTOONS];

// Fallback only (not used by any title now)
const DEMO_VIDEOS = [
  "https://upload.wikimedia.org/wikipedia/commons/transcoded/f/f1/Sintel_movie_4K.webm/Sintel_movie_4K.webm.720p.vp9.webm",
];
const BACKUP_VIDEOS = [];
