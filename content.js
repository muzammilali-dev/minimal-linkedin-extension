// Minimal LinkedIn — content script
// (1) Keeps the LinkedIn feed hidden (forked from linkedin-feed-blocker by
//     Magdy Saleh, MIT) and (2) adds a small persistent launcher bar that
//     deep-links to the only parts worth using.
(function () {
    'use strict';

    // =========================================================================
    // CONFIG — the only thing you should normally need to edit.
    // Each game URL was verified live against LinkedIn before being hard-coded.
    // If LinkedIn moves a path, change it here (single source of truth).
    // =========================================================================
    const CONFIG = {
        barHeight: 40, // px — height of the launcher bar
        links: [
            { label: 'Messages',   url: 'https://www.linkedin.com/messaging/' },
            { label: 'Queens',     url: 'https://www.linkedin.com/games/queens/' },
            { label: 'Tango',      url: 'https://www.linkedin.com/games/tango/' },
            { label: 'Pinpoint',   url: 'https://www.linkedin.com/games/pinpoint/' },
            { label: 'Crossclimb', url: 'https://www.linkedin.com/games/crossclimb/' },
            { label: 'Zip',        url: 'https://www.linkedin.com/games/zip/' },
            { label: 'Wend',       url: 'https://www.linkedin.com/games/wend/' },
        ],
    };

    const HOST_ID = 'minimal-linkedin-launcher-host';   // our shadow host
    const OFFSET_STYLE_ID = 'minimal-linkedin-offset';  // light-DOM layout offset
    const FEEDHIDE_STYLE_ID = 'minimal-linkedin-feedhide'; // anti-flash pre-hide

    // Inject (or remove) a CSS rule that pre-hides the feed column the instant
    // <main> renders, so the real feed never flashes before our JS runs. Runs at
    // document_start and is toggled per route (only active on the feed page).
    // Keeps our injected message visible; nothing else in <main> paints.
    function setFeedHideStyle() {
        const existing = document.getElementById(FEEDHIDE_STYLE_ID);
        if (isFeedPath()) {
            if (!existing) {
                const el = document.createElement('style');
                el.id = FEEDHIDE_STYLE_ID;
                el.textContent =
                    'main > *:not(.feed-blocked-message){display:none !important;}';
                (document.head || document.documentElement).appendChild(el);
            }
        } else if (existing) {
            existing.remove();
        }
    }

    // Apply immediately at document_start (before <main> paints).
    setFeedHideStyle();

    // =========================================================================
    // SECTION 1 — Feed hiding (preserved from the original extension).
    // Behavior intentionally unchanged; only re-indented into this section.
    // =========================================================================
    // True only on the home/feed page, where the central column IS the feed.
    function isFeedPath() {
        const p = window.location.pathname;
        return p === '/' || p === '/feed' || p === '/feed/';
    }

    function hideFeed() {
        // Keep the anti-flash pre-hide rule in sync with the current route.
        setFeedHideStyle();

        // --- Structural hide (robust): on the feed page the central column is
        // the feed itself. Hide every child of <main> except our own message,
        // instead of chasing LinkedIn's churn-prone post/container class names.
        // The side columns are <aside>/<section> siblings outside <main>, so
        // they (and the nav) stay visible. On non-feed pages <main> is left
        // alone so profiles, messaging, games, etc. work normally.
        if (isFeedPath()) {
            const main = document.querySelector('main');
            if (main) {
                Array.from(main.children).forEach(child => {
                    if (!child.classList.contains('feed-blocked-message')) {
                        child.style.display = 'none';
                    }
                });
                addFeedBlockedMessage(main);
            }
        }

        // --- Class-based hide (belt-and-suspenders): kill stray promoted/feed
        // posts that can surface on non-feed pages too. Selectors here are the
        // ones LinkedIn renames occasionally — see README's "where to look".
        const feedSelectors = [
            '[data-chameleon-result-urn*="update"]',
            '.feed-shared-update-v2',
            '.occludable-update',
            'div[data-id*="urn:li:activity"]',
            'div[data-urn*="urn:li:activity"]'
        ];
        feedSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                if (el && !el.classList.contains('feed-blocked')) {
                    el.style.display = 'none';
                    el.classList.add('feed-blocked');
                }
            });
        });
    }

    function addFeedBlockedMessage(main) {
        if (!main || main.querySelector(':scope > .feed-blocked-message')) return;
        const message = document.createElement('div');
        message.className = 'feed-blocked-message';
        message.innerHTML = `
            <div style="
                text-align: center;
                padding: 40px 20px;
                background: #f3f2ef;
                border-radius: 8px;
                margin: 20px;
                color: #666;
            ">
                <h2 style="color: #0077b5; margin-bottom: 10px;">📵 LinkedIn Feed Blocked</h2>
                <p>Your feed is hidden to help you stay focused!</p>
                <p>Use the launcher bar above for Messages and games.</p>
            </div>
        `;
        main.appendChild(message);
    }

    function preserveImportantElements() {
        const keepVisible = [
            '.global-nav',
            '[data-control-name="nav.messaging"]',
            '[data-control-name="nav.notifications"]',
            '.msg-overlay-bubble-header',
            '.notifications-overlay',
            '.search-global-typeahead',
            'header'
        ];

        keepVisible.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el) {
                    el.style.display = '';
                    el.style.visibility = 'visible';
                }
            });
        });
    }

    // =========================================================================
    // SECTION 2 — Launcher bar (new).
    // Rendered into a Shadow DOM host that is a *sibling* of LinkedIn's React
    // root (appended to <html>), so LinkedIn's SPA re-renders never touch it and
    // its CSS cannot collide with ours (and vice versa).
    // =========================================================================
    function buildLauncher() {
        if (document.getElementById(HOST_ID)) return; // already present

        const host = document.createElement('div');
        host.id = HOST_ID;
        // The host itself is the fixed bar; everything visual lives in the shadow.
        host.style.cssText = [
            'position:fixed',
            'top:0',
            'left:0',
            'right:0',
            'height:' + CONFIG.barHeight + 'px',
            'z-index:2147483646',
            'pointer-events:none', // shadow children re-enable this
        ].join(';');

        const root = host.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
            :host { all: initial; }
            .mlb-bar {
                pointer-events: auto;
                box-sizing: border-box;
                height: ${CONFIG.barHeight}px;
                width: 100%;
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 0 12px;
                background: #1d2226;
                border-bottom: 1px solid #000;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                font-size: 13px;
                overflow-x: auto;
            }
            .mlb-brand {
                display: inline-flex;
                align-items: center;
                color: #ffffff;
                font-weight: 700;
                font-size: 15px;
                letter-spacing: -0.2px;
                margin-right: 10px;
                white-space: nowrap;
                flex: 0 0 auto;
            }
            /* The "in" of "Minimal" rendered as the LinkedIn logo badge. */
            .mlb-li {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                box-sizing: border-box;
                height: 16px;
                padding: 0 3px;
                margin: 0 0.5px;
                background: #0a66c2;
                color: #ffffff;
                border-radius: 3px;
                font-size: 11px;
                font-weight: 700;
                line-height: 1;
            }
            .mlb-link {
                pointer-events: auto;
                flex: 0 0 auto;
                color: #e6e6e6;
                text-decoration: none;
                padding: 5px 12px;
                border-radius: 14px;
                white-space: nowrap;
                line-height: 1;
                transition: background-color 120ms ease, color 120ms ease;
            }
            .mlb-link:hover { background: #2f3439; color: #fff; }
            .mlb-link.mlb-active { background: #70b5f9; color: #1d2226; font-weight: 600; }
        `;
        root.appendChild(style);

        const bar = document.createElement('div');
        bar.className = 'mlb-bar';

        // Brand: "Minimal" with the "in" drawn as the LinkedIn logo badge.
        const brand = document.createElement('span');
        brand.className = 'mlb-brand';
        brand.setAttribute('aria-label', 'Minimal LinkedIn');
        brand.append('M');
        const li = document.createElement('span');
        li.className = 'mlb-li';
        li.textContent = 'in';
        brand.append(li);
        brand.append('imal');
        bar.appendChild(brand);

        CONFIG.links.forEach(({ label, url }) => {
            const a = document.createElement('a');
            a.className = 'mlb-link';
            a.href = url;
            a.target = '_self';
            a.rel = 'noopener';
            a.textContent = label;
            a.dataset.path = new URL(url).pathname;
            bar.appendChild(a);
        });

        root.appendChild(bar);
        // Append to <html> so it survives LinkedIn's in-app (SPA) re-renders.
        document.documentElement.appendChild(host);

        applyOffset();
        offsetTopNav();
        setActive();
    }

    // Push the whole page down by the bar height so our bar doesn't cover
    // content. LinkedIn's own top nav is position:fixed, so padding can't move
    // it — offsetTopNav() handles that separately.
    function applyOffset() {
        if (document.getElementById(OFFSET_STYLE_ID)) return;
        const offset = document.createElement('style');
        offset.id = OFFSET_STYLE_ID;
        offset.textContent = `html { padding-top: ${CONFIG.barHeight}px !important; }`;
        (document.head || document.documentElement).appendChild(offset);
    }

    // Move LinkedIn's fixed top nav down so it isn't hidden behind our bar.
    // This is the one place we touch LinkedIn's own chrome: we try several
    // reasonably stable selectors and only nudge an element that is actually
    // fixed/sticky (so we never shift unrelated in-flow elements). Re-applied
    // every tick because LinkedIn re-renders can reset inline styles. If this
    // ever stops working, the nav overlap is the only regression and this is
    // the function to update.
    const watchedNavs = new WeakSet(); // navs we've attached an observer to
    let topNavs = [];                  // cached nav elements (see scanTopNavs)

    function setNavTop(el) {
        if (getComputedStyle(el).top !== CONFIG.barHeight + 'px') {
            el.style.setProperty('top', CONFIG.barHeight + 'px', 'important');
        }
    }

    // Find LinkedIn's top nav purely by GEOMETRY — no tag/class assumptions.
    // Any element that is fixed/sticky, spans most of the width, is short (a
    // bar, not a full-page overlay/modal), and is pinned to the very top is
    // treated as a nav to push below our bar. This is tag/class agnostic, so it
    // survives LinkedIn renaming or restructuring the nav. Excludes our own bar
    // and the bottom-right messaging widget.
    function scanTopNavs() {
        const vw = window.innerWidth;
        const bar = CONFIG.barHeight;
        const found = [];
        const push = (el) => { if (el && found.indexOf(el) === -1) found.push(el); };

        // (a) Explicit catch for LinkedIn's known nav ids/classes (confirmed:
        // header#global-nav + div.global-nav__a11y-menu), regardless of size.
        document.querySelectorAll('#global-nav, [class*="global-nav"]').forEach(el => {
            const pos = getComputedStyle(el).position;
            if (pos === 'fixed' || pos === 'sticky') {
                const r = el.getBoundingClientRect();
                if (r.top <= 1 || Math.abs(r.top - bar) < 2) push(el);
            }
        });

        // (b) Geometry safety net — any short, full-width, top-pinned fixed bar,
        // even if LinkedIn renames everything (tag/class agnostic).
        const all = document.body ? document.body.getElementsByTagName('*') : [];
        for (let i = 0; i < all.length; i++) {
            const el = all[i];
            if (el.id === HOST_ID) continue;               // never move ourselves
            const c = getComputedStyle(el);
            if (c.position !== 'fixed' && c.position !== 'sticky') continue;
            const r = el.getBoundingClientRect();
            if (r.width < vw * 0.6) continue;              // exclude side/narrow widgets
            if (r.height > 140) continue;                  // exclude full-page overlays
            const pinnedTop = r.top <= 1 || Math.abs(r.top - bar) < 2;
            if (!pinnedTop) continue;                      // exclude bottom/mid bars
            push(el);
        }
        return found;
    }

    // Re-assert the offset. The full DOM scan only runs when the cache is empty
    // or a cached nav was detached (e.g. LinkedIn swapped the node on SPA nav);
    // otherwise we just cheaply re-pin the cached elements. Each nav also gets a
    // scoped attribute observer, because LinkedIn resets the nav's top via a
    // style/class change WITHOUT a childList mutation, which the page-wide
    // childList observer would otherwise miss.
    function offsetTopNav() {
        if (!topNavs.length || topNavs.some(el => !el.isConnected)) {
            topNavs = scanTopNavs();
            topNavs.forEach(el => {
                setNavTop(el);
                if (!watchedNavs.has(el)) {
                    watchedNavs.add(el);
                    new MutationObserver(() => {
                        if (el.isConnected) setNavTop(el);
                    }).observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
                }
            });
        } else {
            topNavs.forEach(setNavTop);
        }
    }

    // Re-assert the offset several times right after a route change, to win the
    // race while LinkedIn re-renders and re-pins the nav during an SPA nav.
    function burstOffsetTopNav() {
        [0, 100, 250, 500, 900, 1500, 2200].forEach(d => setTimeout(offsetTopNav, d));
    }

    // Highlight the button matching the current page.
    function setActive() {
        const host = document.getElementById(HOST_ID);
        if (!host || !host.shadowRoot) return;
        const here = window.location.pathname.replace(/\/+$/, '');
        host.shadowRoot.querySelectorAll('.mlb-link').forEach(a => {
            const linkPath = (a.dataset.path || '').replace(/\/+$/, '');
            a.classList.toggle('mlb-active', linkPath !== '' && here.startsWith(linkPath));
        });
    }

    // Rebuild the launcher if anything ever removes it; cheap id check.
    function ensureLauncher() {
        if (!document.getElementById(HOST_ID)) {
            buildLauncher();
        } else {
            applyOffset();
        }
        offsetTopNav();
    }

    // =========================================================================
    // SECTION 3 — SPA navigation handling.
    // LinkedIn is a single-page app; route changes go through the History API
    // rather than full page loads. NOTE: a content script runs in an isolated
    // world, so monkey-patching history.pushState here would NOT intercept
    // LinkedIn's own navigations. Instead we POLL location.href (driven by the
    // MutationObserver and the interval), which works regardless of who called
    // pushState. popstate (back/forward) is also handled directly.
    // =========================================================================
    let lastHref = location.href;

    function onLocationChange() {
        ensureLauncher();
        setActive();
        hideFeed();
        preserveImportantElements();
        burstOffsetTopNav();
    }

    // Fire onLocationChange only when the URL actually changed.
    function checkLocation() {
        if (location.href !== lastHref) {
            lastHref = location.href;
            onLocationChange();
        }
    }

    // =========================================================================
    // SECTION 4 — Boot.
    // =========================================================================
    const observer = new MutationObserver(function (mutations) {
        // Cheap self-heal on every batch: re-add launcher if missing, and
        // catch SPA URL changes (LinkedIn mutates the DOM as it routes).
        ensureLauncher();
        checkLocation();
        if (mutations.some(m => m.addedNodes.length > 0)) {
            setTimeout(() => {
                hideFeed();
                preserveImportantElements();
            }, 100);
        }
    });

    function startObserver() {
        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    function init() {
        buildLauncher();
        hideFeed();
        preserveImportantElements();
        startObserver();
        window.addEventListener('popstate', checkLocation);

        // Backup re-assert + URL poll, same cadence as the original extension.
        setInterval(() => {
            ensureLauncher();
            checkLocation();
            hideFeed();
            preserveImportantElements();
        }, 2000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('Minimal LinkedIn: active (build 2.1)');
})();
