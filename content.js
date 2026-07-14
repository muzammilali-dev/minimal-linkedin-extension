// Minimal LinkedIn — content script
//
// Forked from linkedin-feed-blocker by Magdy Saleh (MIT). This version hides
// ONLY LinkedIn's center feed column on the home page, leaving everything else
// intact: the left profile rail, the right "News / Today's puzzles (games)"
// rail, and the top navigation (Messaging, Notifications, etc.).
//
// How the feed is identified (rename-proof): LinkedIn's home is a 3-column row
// inside <main> where the left and right rails are <aside> elements and the
// center feed is a <section>. LinkedIn obfuscates all class names (e.g.
// "_5fb01c27"), so we key off that stable TAG distinction instead of classes:
// hide the <section> that sits alongside <aside> rails; keep the asides.
(function () {
    'use strict';

    const FEEDHIDE_STYLE_ID = 'minimal-linkedin-feedhide';

    // The home/feed page is the only place we hide anything.
    function isFeedPath() {
        const p = window.location.pathname;
        return p === '/' || p === '/feed' || p === '/feed/';
    }

    // CSS that hides the center feed column. Uses :has() so it targets the feed
    // <section> purely by structure — "a column row that has an <aside> child,
    // hide its <section> child" — independent of element order or class names.
    // Injected at document_start so the feed never flashes before our JS runs.
    const FEED_HIDE_CSS = 'main :has(> aside) > section { display: none !important; }';

    function setFeedHideStyle() {
        const existing = document.getElementById(FEEDHIDE_STYLE_ID);
        if (isFeedPath()) {
            if (!existing) {
                const el = document.createElement('style');
                el.id = FEEDHIDE_STYLE_ID;
                el.textContent = FEED_HIDE_CSS;
                (document.head || document.documentElement).appendChild(el);
            }
        } else if (existing) {
            existing.remove();
        }
    }

    // Apply immediately at document_start (before the feed paints).
    setFeedHideStyle();

    // JS backup for the CSS above: structurally hide the center feed <section>
    // (a <section> whose parent row also contains an <aside> rail). Keeps the
    // rails and nav untouched. Runs on every re-render / route change so it
    // survives LinkedIn's single-page-app navigation.
    function hideFeed() {
        setFeedHideStyle(); // keep the anti-flash rule in sync with the route
        if (!isFeedPath()) return;
        const main = document.querySelector('main');
        if (!main) return;
        main.querySelectorAll('section').forEach(section => {
            const parent = section.parentElement;
            if (parent && parent.querySelector(':scope > aside')) {
                section.style.setProperty('display', 'none', 'important');
            }
        });
    }

    // --- SPA handling -------------------------------------------------------
    // LinkedIn navigates client-side (History API) far more than it does full
    // page loads. A content script runs in an isolated world, so we can't hook
    // the page's pushState; instead we re-apply on every DOM mutation, on
    // popstate, and on a periodic backup — cheap because hideFeed() no-ops off
    // the feed page.
    let lastHref = window.location.href;

    const observer = new MutationObserver(() => {
        if (window.location.href !== lastHref) lastHref = window.location.href;
        hideFeed();
    });

    function start() {
        hideFeed();
        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        }
        window.addEventListener('popstate', hideFeed);
        setInterval(hideFeed, 2000); // backup for anything the observer misses
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

    console.log('Minimal LinkedIn: active (build 3.0)');
})();
