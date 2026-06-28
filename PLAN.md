# PLAN — "Minimal LinkedIn"

Fork/extension of [magdyksaleh/linkedin-feed-blocker](https://github.com/magdyksaleh/linkedin-feed-blocker)
(MIT, © 2025 Magdy Saleh). Goal: (1) keep the feed hidden, (2) add a small
persistent launcher bar on every LinkedIn page that deep-links to Messages and
the LinkedIn games.

---

## 1. Phase 1 recap (what exists today)

- **Manifest V2.** Single content script (`content.js`) + content stylesheet
  (`styles.css`) injected on `*://*.linkedin.com/*` at `document_start`.
- Feed hidden via class/attribute CSS selectors + a JS re-applier driven by a
  MutationObserver and a 2s `setInterval`.
- Only permission is the linkedin.com host match. No background, no network.
- Manifest references icon PNGs that are **not in the repo**.

---

## 2. Required Manifest V3 migration (prerequisite, not optional)

| Change | From (MV2) | To (MV3) |
|---|---|---|
| `manifest_version` | `2` | `3` |
| Host scope | `permissions: ["*://*.linkedin.com/*"]` | `host_permissions: ["*://*.linkedin.com/*"]` |
| Icons | references missing PNGs | **remove the `icons` key** (no assets in repo; avoids "Could not load icon" load error). Can re-add later if we ship icons. |
| `content_scripts` | unchanged | unchanged (same shape in MV3) |

Result: loads cleanly via Load unpacked in current Chrome with zero warnings.
No background service worker needed — everything stays in the content script.

---

## 3. Launcher design

### 3a. Where it lives — **injected fixed bar, NOT the hidden-feed area**

Reject "reuse the hidden feed region": that region only exists on `/feed/`, and
its container is exactly the brittle `.scaffold-finite-scroll` element we hide.
The launcher must appear on **every** LinkedIn page, so it has to be
self-owned, not parasitic on LinkedIn's DOM.

**Decision:** inject a single host element as a **direct child of
`document.documentElement` (`<html>`)** — a *sibling* of LinkedIn's React root,
never inside it. Because LinkedIn's SPA only re-renders inside its own mount
node, our element is structurally outside the blast radius of route changes and
re-renders. This is the key to SPA persistence (see 3c).

The bar is `position: fixed; top: 0; left: 0; right: 0;` height ~40px,
`z-index: 2147483646` (just below max) so it sits above LinkedIn's own chrome.

### 3b. Style isolation — **Shadow DOM**

The host element gets `attachShadow({ mode: 'open' })`. All launcher markup and
CSS live inside the shadow root. Consequences:

- LinkedIn's global CSS cannot reach in and restyle/hide our buttons.
- Our CSS cannot leak out and affect LinkedIn.
- We still namespace internal classes (e.g. `.mlb-*`, "minimal-linkedin-bar")
  as defense-in-depth and for readability.

**Layout collision with LinkedIn's own fixed top nav:** LinkedIn's global nav is
`position: fixed; top: 0`, so our bar would overlap it. To avoid fighting
LinkedIn's classes, we push the *page* down instead of moving LinkedIn's nav:

- Inject one tiny **light-DOM** style rule (outside the shadow) that sets
  `html { padding-top: 40px !important; }` (or set it on `documentElement.style`
  directly). LinkedIn's fixed nav is positioned relative to the viewport, so to
  keep it visible we also offset it. **Single coupling point:** one defensive
  rule `.global-nav { top: 40px !important; }`. `.global-nav` is the most stable
  LinkedIn nav class. If LinkedIn renames it, only the ~40px nav overlap
  regresses (cosmetic) — the launcher itself keeps working. This is the *only*
  place we touch a LinkedIn selector for the new feature, and it's documented
  as the first thing to check if the top spacing ever looks off.

  *(Alternative considered: float the bar in a corner to avoid all coupling.
  Rejected because the request specifies a top bar. The corner option remains a
  trivial fallback — drop the two offset rules and change the host's CSS to
  `top:auto; right:0; bottom:auto` — and I'll leave a comment noting that.)*

### 3c. Surviving SPA navigation

LinkedIn is a single-page app using the History API (`pushState`/
`replaceState`) for client-side route changes; full page loads are the
exception. Three layers of resilience:

1. **Structural (primary):** host lives under `<html>`, outside LinkedIn's React
   root, so normal route changes never remove it. Built once on script start.
2. **Self-healing guard:** an `ensureLauncher()` function checks
   `if (!document.getElementById(HOST_ID)) build()`. We call it:
   - on initial run,
   - from the existing MutationObserver (cheap: just an `getElementById` check,
     no heavy work), so if LinkedIn ever does wipe `<html>` children, we rebuild.
3. **Route-change hook:** monkey-patch `history.pushState` /
   `history.replaceState` and listen for `popstate`, firing a single
   `locationchange` handler that (a) calls `ensureLauncher()` and (b) updates
   which button is highlighted as "active" for the current path. This also
   re-asserts feed hiding on route change (see §4).

### 3d. Buttons / config

A **single config object at the top of `content.js`** so it's the only thing to
edit:

```js
const CONFIG = {
  barHeight: 40,
  links: [
    { label: 'Messages',   url: 'https://www.linkedin.com/messaging/' },
    { label: 'Queens',     url: 'https://www.linkedin.com/games/queens/' },
    { label: 'Tango',      url: 'https://www.linkedin.com/games/tango/' },
    { label: 'Pinpoint',   url: 'https://www.linkedin.com/games/pinpoint/' },
    { label: 'Crossclimb', url: 'https://www.linkedin.com/games/crossclimb/' },
    { label: 'Zip',        url: 'https://www.linkedin.com/games/zip/' },
  ],
};
```

- Each button is a real `<a href>` (normal navigation; works whether LinkedIn
  intercepts it as SPA nav or does a full load). `target="_self"`.
- **URL verification is a Phase 3 task:** before hard-coding, each game URL is
  checked against live LinkedIn (`/games/<name>/`). If LinkedIn has moved a path
  (e.g. a hub like `/games/`), the config is updated to the resolving URL. The
  config object makes any later fix a one-line edit.

---

## 4. Preserve feed-hiding (no regression)

- Keep `styles.css` feed rules **as-is**.
- Keep `content.js` `hideFeed()` / `preserveImportantElements()` logic and its
  selector list **unchanged** in behavior.
- The launcher code is **added alongside** it, not woven into it. The MV2→MV3
  manifest change does not affect content-script execution.
- Minor, behavior-preserving cleanup only if clearly safe: route the existing
  re-hide also off the new `locationchange` event (the 2s interval and observer
  stay). No selector changes, so feed-hiding behavior is identical or better.

---

## 5. File-by-file change list

| File | Change |
|---|---|
| `manifest.json` | MV3 migration (§2); update name/description to "Minimal LinkedIn". |
| `content.js` | Add `CONFIG`; add `buildLauncher()` (shadow DOM), `ensureLauncher()`, `setActive()`, history-API patch + `locationchange` listener, light-DOM offset style. Leave existing feed-hiding intact. |
| `styles.css` | Unchanged feed rules. (Launcher CSS lives inside the shadow root in `content.js`, so it can't be touched by LinkedIn — nothing launcher-related goes here.) |
| `README.md` | Document launcher feature + config; credit original author + MIT (Phase 5). |
| `PLAN.md` | This file. |
| `.gitignore` | (optional) trivial, e.g. OS cruft. |

No new files strictly required; no images; no libraries; no host permissions
beyond `linkedin.com`; no network calls; no analytics.

---

## 6. Risks & the "when it breaks later, look here" map

- **Game path moves** → edit `CONFIG.links` in `content.js` (top of file).
- **Top spacing looks wrong / nav overlapped** → the `.global-nav { top }` and
  `html { padding-top }` offset rules in `content.js` (the one LinkedIn-class
  coupling for this feature).
- **Feed reappears** → existing feed selectors in `styles.css` and the
  `feedSelectors` array in `content.js` (unchanged from upstream; same
  maintenance surface as today).
- **Launcher vanishes after navigation** → `ensureLauncher()` guard +
  `locationchange` hook in `content.js`.

---

## 7. Phase ordering from here

- **Phase 3 (after approval):** verify game URLs live → implement MV3 manifest,
  launcher, keep feed-hiding.
- **Phase 4:** Load-unpacked steps + manual test checklist + "where it breaks"
  list.
- **Phase 5:** git init + grouped commits + README update with credit/license.

---

**Stopping here for your review. Approve and I'll start Phase 3.**
