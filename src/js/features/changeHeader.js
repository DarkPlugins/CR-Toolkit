(() => {
    const SELECTORS = {
        logo: ".header-logo",
        categories: ".header-menu",
        news: ".erc-news-menu",
        new: '[data-t="header-menu-new"]',
        popular: '[data-t="header-menu-popular"]',
        simulcast: '[data-t="header-menu-simulcast"]',
        games: '[data-t="header-menu-games"]',
        store: '[data-t="header-menu-store"]'
    };
    const KEYS = ["enabled_change_header", ...Object.keys(SELECTORS).map(
        key => `enabled_change_header_${key}`
    )];
    let initialized = false;
    let state = {};
    let style = null;

    function applyChangeHeader() {
        const selectors = state.enabled_change_header
            ? Object.entries(SELECTORS)
                .filter(([key]) => state[`enabled_change_header_${key}`])
                .map(([, selector]) => selector)
            : [];
        if (!selectors.length) {
            style?.remove();
            style = null;
            return;
        }
        if (!style) {
            style = document.createElement("style");
            style.id = "cr-change-header-style";
            (document.head || document.documentElement).appendChild(style);
        }
        const css = `${selectors.join(",")} { display: none !important; }`;
        if (style.textContent !== css) style.textContent = css;
    }

    function initChangeHeader() {
        if (initialized) return;
        initialized = true;
        chrome.storage.sync.get(KEYS, data => {
            state = data;
            applyChangeHeader();
        });
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== "sync") return;
            let changed = false;
            for (const key of KEYS) {
                if (!changes[key]) continue;
                state[key] = changes[key].newValue;
                changed = true;
            }
            if (changed) applyChangeHeader();
        });
    }

    window.CRToolkit = window.CRToolkit || {};
    window.CRToolkit.ChangeHeader = { init: initChangeHeader };
})();
