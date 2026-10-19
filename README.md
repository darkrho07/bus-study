# 🚌 Bus Study

**A night-bus Pomodoro room.** Study all night on NH 48 with a real Pomodoro timer, a tiny
task list, soft rain on the window, four illustrated scenes, and **1,043 nostalgic Hindi
songs** that actually play.

Built by cloning the behaviour and craft of **[busdriver.wtf](https://busdriver.wtf/)** and
re-shaping it into a study product in the spirit of **[studywithcat.online](https://studywithcat.online/)**.

---

## Run it

No build step, no dependencies, no backend.

```bash
cd bus-study
python3 -m http.server 3000        # → http://localhost:3000
```

Or open `index.html` directly. Everything except the YouTube radio works offline
(the songs need an internet connection because they stream from YouTube).

---

## What's inside

### The study product (from the reference: studywithcat.online)
| Feature | Behaviour |
|---|---|
| **Pomodoro timer** | Focus / Short break / Long break, 1–180 min each, saved in `localStorage` |
| **Round cycle** | Long break offered automatically after 4 focus rounds |
| **Focus mode** | Full-screen countdown (`F`), shows the current task and the song playing |
| **Little intentions** | Task list with subjects, deadlines-free, tick-off, delete, persisted |
| **Study buddy "Chhotu"** | SVG cat on the dashboard; pet, play (dancing-cat video), rename, 3 poses |
| **Set the mood** | Synthesised Rainfall, Bus hum and Brown noise + volume slider (Web Audio, no files) |
| **Scenery** | 4 illustrated backdrops: NH 48 night, Monsoon ghat, Sunrise fields, City flyover |
| **Your own music** | Pick any audio file from the device (loops locally, never uploaded) |
| **Logbook** | Focus minutes, rounds, days aboard, last-7-days chart, printable boarding pass |
| **Quiet UX** | Everything stored in the browser, no accounts, no ads, no streak guilt |

### The clone (from busdriver.wtf)
| Feature | Behaviour |
|---|---|
| **Night-bus scene** | Original AI-illustrated NH 48 art + the original moving-road video, rain canvas, drifting clouds, film grain |
| **Hindi display type** | बस स्टडी in Anek Devanagari 800 with the same optical sizing/shadow treatment |
| **"Horn ok pleaseeee"** | The horn button, with a **synthesised two-tone bus horn** and shake/ripple animation (`H`) |
| **Glass dashboard** | Same dark-amber glass language, clock, route line, floating type |
| **Song queue** | The original 8 bus routes and all 934 extracted YouTube tracks (226 + 54 + 157 + 44 + 228 + 61 + 54 + 110, deduped) |
| **Real YouTube radio** | Hidden IFrame Player API engine: play/pause, next/previous, seek bar, shuffle, mute, autoplay-through, error skip |
| **Queue sheet** | Route tabs, artwork, numbered rows, now-playing highlight, instant selection |
| **Keyboard layer** | `Space` play/pause · `←/→` seek · `N/P` track · `Q` queue · `S` timer · `F` focus · `H` horn · `L` logbook · `Esc` |
| **Boarding pass** | Printable "bus ticket" of your study stats (print dialog, ticket typography) |
| **Route pages** | `/playlist.html?route=…` — hero for each route, searchable track list, "now boarding" card |

---

## File map

```
bus-study/
├── index.html                # the study desk (timer · tasks · mood · routes · FAQ)
├── playlist.html             # per-route song pages (?route=<slug>)
├── manifest.webmanifest      # installable PWA metadata
├── css/style.css             # design system, scene layers, desk, dock, overlays, responsive
├── js/
│   ├── data.js               # 8 routes · 1,043 tracks (yt id, title, artist) — generated
│   └── app.js                # timer, tasks, buddy, audio engine, YouTube radio, state
├── assets/
│   ├── road.jpg / road.mp4 / road-wide.mp4 / clouds.webp   # original bus scene
│   ├── dancing-cat.webm                                    # buddy animation
│   ├── scenes/{monsoon,sunrise,city}.jpg                   # new matching backdrops
│   ├── fonts/{geist-latin,geist-ext,anek-devanagari}.woff2 # self-hosted
│   └── icon-192.png / icon-512.png
├── robots.txt · sitemap.xml
└── README.md · ANALYSIS.md
```

---

## How the radio works

`js/app.js` loads the official YouTube IFrame Player API, creates one hidden player in
`#ytPlayer`, and drives it through a small `Radio` controller:

* `loadVideoById` on every track change, `playVideo` / `pauseVideo` for transport.
* A 500 ms poll paints the dock's seek bar; clicking the bar seeks.
* `onStateChange → ENDED` advances the queue; `onError` skips broken/region-blocked uploads
  (with an error-loop guard after 4 consecutive failures).
* The player stays hidden until you tap the video button, then it appears as a floating
  picture-in-picture style panel.

Notes: YouTube may show ads, some uploads are region-locked, and iOS requires a tap before
audio starts. The timer, ambience and horn never depend on YouTube.

---

## Tested

* Playback, next/prev, seek, mute, shuffle, queue selection, autoplay-through ✅
* Timer countdown, pause/resume, reset, mode switching, 4-round long break, stats ✅
* Tasks add/tick/delete/persist, buddy rename & pose persist, scenes and sounds persist ✅
* Route pages, route switching, search, back-navigation, keyboard shortcuts ✅
* Responsive at 1440×900, 1280×720, 1024×768, 834×1112, 390×844, 360×640 ✅
* No console errors; valid HTML nesting; reduced-motion respected ✅

---

## Credits

* Scene art, bus illustration, moving road and the original song curation: **busdriver.wtf**
* Study-space UX reference: **studywithcat.online**
* Songs stream from their original YouTube uploads; all rights stay with their owners.
* The three extra backdrops (monsoon / sunrise / city) were generated to match the original art direction.

*One chapter at a time. Keep the window open.*
