let currentState = null;
const HEADER_CLASS_ELEMENTS = {
    logo: "header-logo",                // Logo
    categories: "header-menu",          // Categories
    news: "erc-news-menu"               // News
};
const HEADER_DATAT_ELEMENTS = {
    new: "header-menu-new",             // New
    popular: "header-menu-popular",     // Popular
    simulcast: "header-menu-simulcast", // Simulcast
    games: "header-menu-games",         // Games
    store: "header-menu-store"          // Store
};

function applyChangeHeader(state) {
    const globalEnabled = state.enabled ?? false;

    // Class-based elements
    Object.entries(HEADER_CLASS_ELEMENTS).forEach(([key, className]) => {
        const headerEls = document.getElementsByClassName(className);
        if (!headerEls || headerEls.length === 0) return;

        const enabled = globalEnabled && (state[key] ?? false);
        setProperty(headerEls, enabled);
    });

    // data-t elements
    Object.entries(HEADER_DATAT_ELEMENTS).forEach(([key, dataVal]) => {
        const headerEls = document.querySelectorAll(`[data-t="${dataVal}"]`);
        if (!headerEls || headerEls.length === 0) return;

        const enabled = globalEnabled && (state[key] ?? false);
        setProperty(headerEls, enabled);
    });
}

function setProperty(elements, enabled) {
    Array.from(elements).forEach(el => {
        if (!el) return;
        el.style.setProperty("display", !enabled ? "" : "none", "important");
    });
}

function initChangeHeader() {
    chrome.storage.sync.get(
        [
            "enabled_change_header",
            "enabled_change_header_logo",
            "enabled_change_header_new",
            "enabled_change_header_popular",
            "enabled_change_header_simulcast",
            "enabled_change_header_categories",
            "enabled_change_header_games",
            "enabled_change_header_store",
            "enabled_change_header_news"
        ],
        (data) => {
            currentState = {
                enabled: data.enabled_change_header ?? false,
                logo: data.enabled_change_header_logo ?? false,
                new: data.enabled_change_header_new ?? false,
                popular: data.enabled_change_header_popular ?? false,
                simulcast: data.enabled_change_header_simulcast ?? false,
                categories: data.enabled_change_header_categories ?? false,
                games: data.enabled_change_header_games ?? false,
                store: data.enabled_change_header_store ?? false,
                news: data.enabled_change_header_news ?? false
            };

            applyChangeHeader(currentState);
        }
    );

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "sync") return;
        if (!currentState) return;

        if (changes.enabled_change_header)
            currentState.enabled = changes.enabled_change_header.newValue;

        if (changes.enabled_change_header_logo)
            currentState.logo = changes.enabled_change_header_logo.newValue;

        if (changes.enabled_change_header_new)
            currentState.new = changes.enabled_change_header_new.newValue;

        if (changes.enabled_change_header_popular)
            currentState.popular = changes.enabled_change_header_popular.newValue;

        if (changes.enabled_change_header_simulcast)
            currentState.simulcast = changes.enabled_change_header_simulcast.newValue;

        if (changes.enabled_change_header_categories)
            currentState.categories = changes.enabled_change_header_categories.newValue;

        if (changes.enabled_change_header_games)
            currentState.games = changes.enabled_change_header_games.newValue;

        if (changes.enabled_change_header_store)
            currentState.store = changes.enabled_change_header_store.newValue;

        if (changes.enabled_change_header_news)
            currentState.news = changes.enabled_change_header_news.newValue;

        applyChangeHeader(currentState);
    });
}

window.CRToolkit = window.CRToolkit || {};
window.CRToolkit.initChangeHeader = initChangeHeader;