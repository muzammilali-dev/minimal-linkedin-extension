# Minimal LinkedIn

A tiny Chrome extension (Manifest V3) that hides LinkedIn's distracting **home
feed** while leaving everything useful in place:

- ✅ The **center feed is hidden** on the home page (`/feed/`)
- ✅ The **left profile rail** stays (your profile, pages, etc.)
- ✅ The **right rail** stays — including **"Today's puzzles"** (Queens, Tango,
  Pinpoint, Crossclimb, Zip, Wend, Patches, Mini Sudoku)
- ✅ The **top navigation** stays — Messaging, Notifications, Search, profile
- ✅ Every other page works normally (profiles, messaging, games, jobs)
- ✅ Manifest V3, runs entirely locally — no analytics, no network calls
- ✅ Only permission is `linkedin.com`

So you keep one-click access to **messages** (top nav) and the **games**
(right-hand "Today's puzzles"), but the endless scroll is gone.

> Forked from and built on top of
> [**linkedin-feed-blocker**](https://github.com/magdyksaleh/linkedin-feed-blocker)
> by **Magdy Saleh** (MIT License).

## How it works (and why it's robust)

LinkedIn obfuscates all of its CSS class names (e.g. `_5fb01c27`), so anything
keyed to classes breaks constantly. This extension keys off **semantic HTML tags
instead**, which LinkedIn does not rename:

- The home page is a 3-column row inside `<main>`.
- The **left and right rails are `<aside>`** elements.
- The **center feed is a `<section>`**.

So the rule is simply: *hide the `<section>` that sits alongside `<aside>`
rails; keep the asides.* It's implemented as a `:has()` CSS rule
(`main :has(> aside) > section`) injected only on the feed page, plus a
JavaScript backup that re-applies on LinkedIn's single-page-app navigation. The
CSS is injected at `document_start` so the feed never flashes before hiding.

Nothing is applied on non-feed pages, so profiles, messaging, and games are
untouched.

## Installation (Load unpacked)

1. Download or clone this repository:
   `git clone https://github.com/muzammilali-dev/minimal-linkedin-extension.git`
2. Open Chrome → `chrome://extensions/`.
3. Toggle **Developer mode** on (top-right).
4. Click **Load unpacked** and select the folder.
5. Open or refresh a LinkedIn tab — the home feed is gone; everything else stays.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | MV3 manifest; injects the content script on `*.linkedin.com`. |
| `content.js` | All the logic: identify + hide the feed `<section>`, handle SPA nav. |
| `styles.css` | Intentionally empty (a comment) — hiding is done from `content.js`. |
| `icon16/48/128.png` | Extension icons. |

## When LinkedIn changes its DOM — where to look

- **Feed reappears** → `content.js`: the `FEED_HIDE_CSS` rule and the
  `hideFeed()` function. Both rely on the feed being a `<section>` beside
  `<aside>` rails inside `<main>`. If LinkedIn changes those tags, adjust here.
- **A side rail disappears** → the rails are expected to be `<aside>`; if one
  becomes a `<section>`, the rule would hide it. Tighten `hideFeed()` in that case.

## Privacy

Runs entirely in your browser. No data collected, no network requests, no
tracking. Only host permission is `*://*.linkedin.com/*`.

## Credits & License

- Original feed-blocking extension: **Magdy Saleh** —
  [linkedin-feed-blocker](https://github.com/magdyksaleh/linkedin-feed-blocker).
- Released under the **MIT License** (see `LICENSE`), preserving the original
  copyright © 2025 Magdy Saleh.
