// =====================================================================
//  DSAT Movie and Drama — VIDEO LINKS
// ---------------------------------------------------------------------
//  SAB SE AASAAN TAREEQA (poori episodes):
//    Drama ki official YouTube PLAYLIST ki link daal do — bas ek line.
//    Website khud Episode 1 → playlist ki 1st video, Episode 2 → 2nd video
//    waghera chalayegi. Saari episodes website ke andar hi chalengi.
//
//    Playlist link kaise milegi:
//      YouTube pe channel kholo (Har Pal Geo, ARY Digital, HUM TV,
//      TRT Ertugrul by PTV) → "Playlists" → drama ki playlist kholo →
//      upar address bar se link copy karo (us mein "list=" hota hai).
//
//  Doosre tareeqe:
//    "Drama ka naam|season": playlist link   → sirf us season ki playlist
//    "Drama ka naam|season|episode": link    → ek single episode
//    "Movie ka naam": link                   → movie (.mp4 / .webm / YouTube)
//
//  Naam bilkul data.js jaisa likhna hai (spelling same).
//
//  YouTube video IDs ki list ho to episodes("Naam", season, [ids]) use karo
//  (pehli ID = Episode 1, doosri = Episode 2 ...) — neeche Humsafar dekho.
// =====================================================================

function episodes(title, season, ids) {
  const out = {};
  ids.forEach((id, i) => (out[`${title}|${season}|${i + 1}`] = "https://www.youtube.com/watch?v=" + id));
  return out;
}

const VIDEOS = {
  // (Dramas ki asli episodes ab dramas.js mein hain — HAR PAL GEO, HUM TV, ARY Digital)

  // "Tere Bin": "https://www.youtube.com/playlist?list=PLxxxxxxxxxxxxxxxx",
  // "Kabhi Main Kabhi Tum": "https://www.youtube.com/playlist?list=PLxxxxxxxxxxxxxxxx",
  // "Diriliş: Ertuğrul|1": "https://www.youtube.com/playlist?list=PLxxxxxxxxxxxxxxxx",
  // "Parizaad|1|5": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
  // "Inception": "https://example.com/videos/inception.mp4",
};
