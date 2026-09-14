(() => {
    // Page-specific adapter; Better Search owns filters, UI, cache and observers.
    const isPath = path => /^(?:\/[a-z]{2}(?:-[a-z\d]+)*)?\/videos(?:\/[a-z\d-]+)*\/?$/i.test(String(path || ""));
    const CARD_SELECTOR = [
        '[data-t~="series-card"]', '[data-t~="movie-card"]',
        '[data-testid~="series-card"]', '[data-testid~="movie-card"]',
        '[class^="browse-card--"]', '[class*=" browse-card--"]'
    ].join(", ");

    function getCards() {
        return Array.from(document.querySelectorAll(CARD_SELECTOR)).filter(card =>
            !card.parentElement?.closest(CARD_SELECTOR) &&
            card.querySelector('a[href*="/series/"], a[href*="/movie/"]')
        );
    }

    function getVisibilityTarget(card) {
        // Hide the layout item too, so a filtered card leaves no empty grid cell.
        const wrapper = card.parentElement;
        return wrapper?.matches('[data-t="carousel-card-wrapper"], .browse-card')
            ? wrapper : card;
    }

    function hasSidebarSpace() {
        const card = document.querySelector(CARD_SELECTOR);
        const collection = card?.closest('.erc-browse-cards-collection, [data-t="cards"]');
        return (collection?.getBoundingClientRect().left || 0) >= 328;
    }

    function isApiPath(path) {
        return /^\/content\/v2\/discover\/browse\/?$/i.test(path);
    }

    window.CRToolkit = window.CRToolkit || {};
    window.CRToolkit.BetterGeneres = { isPath, getCards, getVisibilityTarget, hasSidebarSpace, isApiPath };
})();
