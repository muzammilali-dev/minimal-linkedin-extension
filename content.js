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

    // =========================================================================
    // SECTION 1 — Feed hiding (preserved from the original extension).
    // Behavior intentionally unchanged; only re-indented into this section.
    // =========================================================================
    function hideFeed() {
        // Main feed container selectors (LinkedIn updates these occasionally)
        const feedSelectors = [
            '[data-chameleon-result-urn*="update"]',
            '.feed-shared-update-v2',
            '.occludable-update',
            'div[data-id*="urn:li:activity"]',
            '.scaffold-finite-scroll__content > div',
            'main .scaffold-finite-scroll',
            '[role="main"] .scaffold-finite-scroll'
        ];

        feedSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el && !el.classList.contains('feed-blocked')) {
                    el.style.display = 'none';
                    el.classList.add('feed-blocked');
                }
            });
        });

        const feedContainer = document.querySelector('main .scaffold-finite-scroll');
        if (feedContainer && window.location.pathname === '/feed/') {
            feedContainer.style.display = 'none';
        }

        addFeedBlockedMessage();
    }

    function addFeedBlockedMessage() {
        if (window.location.pathname === '/feed/' && !document.querySelector('.feed-blocked-message')) {
            const main = document.querySelector('main');
            if (main) {
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
        }
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
                color: #70b5f9;
                font-weight: 700;
                margin-right: 8px;
                white-space: nowrap;
                flex: 0 0 auto;
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

        const brand = document.createElement('span');
        brand.className = 'mlb-brand';
        brand.textContent = 'Minimal LinkedIn';
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
        setActive();
    }

    // Push the page down so the bar doesn't cover LinkedIn's own fixed nav.
    // SINGLE coupling point to a LinkedIn class: `.global-nav { top }`. If that
    // class is ever renamed, only the ~barHeight px of top spacing regresses
    // (cosmetic) — the launcher keeps working. To drop all coupling, delete the
    // `.global-nav` rule and dock the bar in a corner instead (set the host's
    // CSS to top:auto; right:0; bottom:0 in buildLauncher()).
    function applyOffset() {
        if (document.getElementById(OFFSET_STYLE_ID)) return;
        const offset = document.createElement('style');
        offset.id = OFFSET_STYLE_ID;
        offset.textContent = `
            html { padding-top: ${CONFIG.barHeight}px !important; }
            .global-nav { top: ${CONFIG.barHeight}px !important; }
        `;
        (document.head || document.documentElement).appendChild(offset);
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
    }

    // =========================================================================
    // SECTION 3 — SPA navigation handling.
    // LinkedIn is a single-page app; route changes go through the History API
    // rather than full page loads. Patch pushState/replaceState and listen for
    // popstate so we re-assert the launcher + feed hiding on client-side nav.
    // =========================================================================
    function emitLocationChange() {
        window.dispatchEvent(new Event('mlb:locationchange'));
    }

    function hookHistory() {
        const wrap = (name) => {
            const original = history[name];
            history[name] = function () {
                const result = original.apply(this, arguments);
                emitLocationChange();
                return result;
            };
        };
        wrap('pushState');
        wrap('replaceState');
        window.addEventListener('popstate', emitLocationChange);

        window.addEventListener('mlb:locationchange', () => {
            ensureLauncher();
            setActive();
            hideFeed();
            preserveImportantElements();
        });
    }

    // =========================================================================
    // SECTION 4 — Boot.
    // =========================================================================
    const observer = new MutationObserver(function (mutations) {
        // Cheap self-heal on every batch: re-add launcher if missing.
        ensureLauncher();
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
        hookHistory();

        // Backup re-assert, same cadence as the original extension.
        setInterval(() => {
            ensureLauncher();
            hideFeed();
            preserveImportantElements();
        }, 2000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('Minimal LinkedIn: active');
})();
