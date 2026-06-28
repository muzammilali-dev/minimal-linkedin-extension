# Minimal LinkedIn

A Chrome extension (Manifest V3) that strips LinkedIn down to the parts worth
using. It does two things:

1. **Hides the distracting feed** while preserving messaging, notifications, and
   profile access.
2. **Adds a small persistent launcher bar** to the top of every LinkedIn page
   with one-click deep links to your Messages and the LinkedIn games.

> Forked from and built on top of
> [**linkedin-feed-blocker**](https://github.com/magdyksaleh/linkedin-feed-blocker)
> by **Magdy Saleh** (MIT License). The original feed-hiding behavior is
> preserved; this fork adds Manifest V3 support and the launcher bar.

## Features

- ✅ Hides LinkedIn feed posts, sponsored content, ads, and "People you may know"
- ✅ Persistent launcher bar on every page — survives LinkedIn's in-app (SPA) navigation
- ✅ One-click links to Messages, Queens, Tango, Pinpoint, Crossclimb, Zip, and Wend
- ✅ Highlights the button for the page you're currently on
- ✅ Manifest V3, runs entirely locally — no analytics, no network calls
- ✅ Only permission is `linkedin.com`
- ✅ Launcher rendered in a Shadow DOM, so LinkedIn's CSS can't break it (and vice versa)

## The launcher links

All game URLs were verified live before shipping. They live in a single
`CONFIG` object at the top of `content.js` — edit there if anything changes.

| Button     | URL |
|------------|-----|
| Messages   | https://www.linkedin.com/messaging/ |
| Queens     | https://www.linkedin.com/games/queens/ |
| Tango      | https://www.linkedin.com/games/tango/ |
| Pinpoint   | https://www.linkedin.com/games/pinpoint/ |
| Crossclimb | https://www.linkedin.com/games/crossclimb/ |
| Zip        | https://www.linkedin.com/games/zip/ |
| Wend       | https://www.linkedin.com/games/wend/ |

To add, remove, or rename a button, edit the `CONFIG.links` array at the top of
`content.js`. No other changes are needed.

## Installation (Load unpacked in Chrome)

1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Toggle **Developer mode** on (top-right).
4. Click **Load unpacked**.
5. Select this `minimal-linkedin` folder.
6. Open or refresh a LinkedIn tab — the launcher bar appears at the top and the
   feed is hidden.

> No icons are bundled, so Chrome shows a default puzzle-piece icon. That is
> expected and harmless. To add your own, drop in `icon16/48/128.png` and add an
> `"icons"` key to `manifest.json`.

## Manual test checklist

- [ ] On `/feed/`, the feed is hidden and the "Feed Blocked" message shows.
- [ ] The launcher bar is visible at the top of the LinkedIn home page.
- [ ] All seven buttons are present with the correct labels.
- [ ] Clicking each button navigates to the correct page.
- [ ] Navigate around LinkedIn by clicking in-app links — the launcher **stays
      put** and does not disappear (SPA navigation).
- [ ] The button matching the current page is highlighted.
- [ ] The DevTools console shows `Minimal LinkedIn: active` and **no errors**.

## How it works

- **Manifest V3** content script + stylesheet injected on `*://*.linkedin.com/*`
  at `document_start`. No background service worker, no remote code.
- **Feed hiding** (`styles.css` + the feed functions in `content.js`) is the
  original extension's approach: CSS hides known feed selectors immediately, and
  a MutationObserver + interval re-applies it as LinkedIn loads content
  dynamically.
- **Launcher** is injected as a Shadow DOM host appended to `<html>` — a sibling
  of LinkedIn's app root — so it is isolated from LinkedIn's CSS and untouched by
  LinkedIn's re-renders.
- **SPA resilience** comes from three layers: the structural placement above,
  a self-healing `ensureLauncher()` guard, and a History API hook
  (`pushState`/`replaceState`/`popstate`) that re-asserts the bar and feed
  hiding on client-side route changes.

## Privacy

Runs entirely in your browser. No data collected, no network requests, no
tracking. Only host permission is `*://*.linkedin.com/*`.

## When LinkedIn changes its DOM — where to look

LinkedIn updates its markup periodically. If something breaks:

- **A game/Messages link 404s or moved** → `CONFIG.links` at the top of
  `content.js`.
- **Top spacing is wrong / LinkedIn's nav is overlapped** → the `applyOffset()`
  rules in `content.js` (`html { padding-top }` and the single
  `.global-nav { top }` coupling).
- **The feed reappears** → the feed selectors in `styles.css` and the
  `feedSelectors` array in `content.js` (same maintenance surface as upstream).
- **The launcher disappears after navigating** → `ensureLauncher()` and the
  History API hook (`hookHistory()`) in `content.js`.

## Credits & License

- Original feed-blocking extension: **Magdy Saleh** —
  [linkedin-feed-blocker](https://github.com/magdyksaleh/linkedin-feed-blocker).
- Launcher feature and Manifest V3 migration: this fork.

Released under the **MIT License** (see `LICENSE`), preserving the original
copyright © 2025 Magdy Saleh.
