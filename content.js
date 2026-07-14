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

    // CSS that blanks the center feed column. Uses :has() so it targets the feed
    // <section> purely by structure — "a column row that has an <aside> child,
    // blank its <section>'s contents" — independent of element order or classes.
    // We hide the section's children (not the section itself) so the column
    // stays in the layout and can hold our "feed hidden" note. Injected at
    // document_start so the feed never flashes before our JS runs.
    const FEED_HIDE_CSS =
        'main :has(> aside) > section > *:not(.mll-note){display:none!important}';

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

    // JS backup for the CSS above: find the center feed <section> (a <section>
    // whose parent row also contains an <aside> rail), blank its contents, and
    // show our note. Keeps the rails and nav untouched. Runs on every re-render
    // / route change so it survives LinkedIn's single-page-app navigation.
    function hideFeed() {
        setFeedHideStyle(); // keep the anti-flash rule in sync with the route
        if (!isFeedPath()) return;
        const main = document.querySelector('main');
        if (!main) return;
        main.querySelectorAll('section').forEach(section => {
            const parent = section.parentElement;
            if (parent && parent.querySelector(':scope > aside')) {
                // Center feed column: hide its real contents, then show our note
                // (kept in place so the note occupies the middle column).
                Array.from(section.children).forEach(child => {
                    if (!child.classList.contains('mll-note')) {
                        child.style.setProperty('display', 'none', 'important');
                    }
                });
                addNote(section);
            }
        });
    }

    // Friendly "feed hidden" note shown where the feed used to be.
    function addNote(section) {
        if (section.querySelector(':scope > .mll-note')) return;
        const note = document.createElement('div');
        note.className = 'mll-note';
        note.innerHTML = `
            <div style="
                text-align: center;
                padding: 40px 24px;
                background: #ffffff;
                border: 1px solid #e0dfdc;
                border-radius: 8px;
                color: #666666;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            ">
                <div aria-label="Minimal LinkedIn" style="font-weight: 700; font-size: 26px; letter-spacing: -0.3px; color: #1d2226; margin-bottom: 12px;">M<span style="display: inline-block; background: #0a66c2; color: #ffffff; border-radius: 4px; padding: 1px 5px; margin: 0 1px;">in</span>imal</div>
                <h2 style="color: #0a66c2; margin: 0 0 8px; font-size: 18px;">Feed hidden</h2>
                <p style="margin: 0;">Your LinkedIn feed is hidden to help you stay focused.</p>
                <p style="margin: 8px 0 0; font-size: 13px;">Messages are in the top nav; games are in “Today’s puzzles” on the right. →</p>
            </div>
        `;
        section.appendChild(note);
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

    console.log('Minimal LinkedIn: active (build 3.2)');
})();
