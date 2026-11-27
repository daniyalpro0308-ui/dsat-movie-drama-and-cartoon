# DSAT Movie and Drama 🎬

A Netflix-style streaming website for Pakistani dramas, telefilms, anime and cartoons. Everything is free, and every video plays inside the site.

**Live site:** https://daniyalpro0308-ui.github.io/dsat-movie-and-drama/

## What's inside

| Section | Content | Source |
|---|---|---|
| **Drama 1 / Drama 2** | 33 Pakistani dramas, 1,316 full episodes | HAR PAL GEO, HUM TV, ARY Digital (official channels) |
| **Movies** | 92 full telefilms | HAR PAL GEO, HUM TV, ARY Digital (official channels) |
| **Anime** | 17 anime, 640 full episodes, with seasons | Muse Asia (official) |
| **Cartoons** | 15 animated films | Blender Studio open movies |

## Features

- "Who's watching?" profiles, each with its own **My List** and **Continue Watching**
- Hero banner that rotates through featured titles, plus a **Top 10** row and scrollable category rows
- **Drama 2**: open any drama to see every episode on one page
- Full-screen player with episode list and **Next Episode** button
- Season picker for anime with more than one season
- Search across every title, genre and channel
- Works on mobile and desktop

## How it works

The site is plain HTML, CSS and JavaScript, with no build step and no server code. Videos are embedded from the official YouTube channels of their owners. DSAT does not host or download any video.

| File | Purpose |
|---|---|
| `index.html` | Page layout and player |
| `style.css`, `player.css` | Design |
| `app.js` | App logic: rows, search, profiles, player |
| `data.js` | Builds the library |
| `dramas.js`, `content.js` | Episode and video lists |
| `videos.js` | Optional extra video links |

## Run locally

Double-click **`Start DSAT.bat`**, or run `node server.js`, then open http://localhost:8080.

YouTube videos need the site to be served over http(s). If you open `index.html` directly as a file, the videos will not play.

---
Made with ❤ in Pakistan
