(() => {
let scrolled = null;
function updateScrollState() {
    if (!document.body) return;
    const nextScrolled = window.scrollY > 50;
    if (scrolled === nextScrolled) return;
    scrolled = nextScrolled;
    document.body.classList.toggle("scrolled", scrolled);
}
window.addEventListener("scroll", updateScrollState, { passive: true });
updateScrollState();

function initFeatures() {
    window.CRToolkit.BetterCalender.init();
    window.CRToolkit.AutoSkip.init();
    window.CRToolkit.KeyboardSeek.init();
    window.CRToolkit.ChangeColors.init();
    window.CRToolkit.HideHeader.init();
    window.CRToolkit.PlayerResize.init();
    window.CRToolkit.ChangeHeader.init();
    window.CRToolkit.SettingsPanel.init();
}

function applyFeatures() {
    window.CRToolkit.AutoSkip.apply();
    window.CRToolkit.HideHeader.apply();
    window.CRToolkit.PlayerResize.apply();
}


window.CRToolkit = window.CRToolkit || {};
window.CRToolkit.currentUrl = location.href;

initFeatures();

// Also handle route changes that do not immediately modify the DOM.
function syncFeaturesRoute() {
    if (location.href !== window.CRToolkit.currentUrl) {
        window.CRToolkit.currentUrl = location.href;
        applyFeatures();
    }
}
window.addEventListener("popstate", syncFeaturesRoute);
window.addEventListener("cr-toolkit-route-change", syncFeaturesRoute);
new MutationObserver(syncFeaturesRoute).observe(document, {
    subtree: true,
    childList: true
});
(() => {
    const bridgeSource = "CRToolkit";

    window.addEventListener("message", event => {
        if (event.source !== window || event.data?.source !== bridgeSource) {
            return;
        }

        if (event.data.type === "CR_BETTER_SEARCH_ROUTE") {
            sendRouteState(Boolean(event.data.isSearch));
            return;
        }

        if (event.data.type === "CR_BETTER_SEARCH_CACHE_UPDATE") {
            sendRuntimeMessage({
                type: "CR_BETTER_SEARCH_SAVE_CACHE",
                records: event.data.records
            }, response => {
                postBridgeMessage("CR_BETTER_SEARCH_CACHE_RESTORE", {
                    records: response?.records || []
                });
            });
        }
    });

    function postBridgeMessage(type, payload = {}) {
        window.postMessage({
            source: bridgeSource,
            type,
            ...payload
        }, "*");
    }

    function sendRuntimeMessage(message, callback = () => {}) {
        try {
            chrome.runtime.sendMessage(message, response => {
                if (chrome.runtime.lastError) {
                    return;
                }

                callback(response);
            });
        } catch (error) {
            // The extension context can disappear while the page is navigating.
        }
    }

    function sendRouteState(isSearch) {
        sendRuntimeMessage({
            type: "CR_BETTER_SEARCH_ROUTE",
            isSearch
        });

        if (isSearch) {
            sendRuntimeMessage({type: "CR_BETTER_SEARCH_GET_CACHE"}, response => {
                postBridgeMessage("CR_BETTER_SEARCH_CACHE_RESTORE", {
                    records: response?.records || []
                });
            });
        }
    }

    function syncBetterSearchState() {
        try {
            chrome.storage.sync.get(["enabled_better_search", "enabled_better_search_icons", "enabled_better_calender"], data => {
                postBridgeMessage("CR_BETTER_SEARCH_ICONS", {
                    enabled: data.enabled_better_search_icons === true
                });
                postBridgeMessage("CR_BETTER_CALENDER_ENABLED", {
                    enabled: data.enabled_better_calender !== false
                });
                postBridgeMessage("CR_BETTER_SEARCH_ENABLED", {
                    enabled: data.enabled_better_search !== false
                });
            });
        } catch (error) {
            postBridgeMessage("CR_BETTER_SEARCH_ENABLED", {enabled: true});
        }
    }

    try {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName !== "sync") {
                return;
            }
            if (changes.enabled_better_calender) postBridgeMessage("CR_BETTER_CALENDER_ENABLED", {
                enabled: changes.enabled_better_calender.newValue !== false
            });
            if (changes.enabled_better_search) postBridgeMessage("CR_BETTER_SEARCH_ENABLED", {
                enabled: changes.enabled_better_search.newValue !== false
            });
            if (changes.enabled_better_search_icons) postBridgeMessage("CR_BETTER_SEARCH_ICONS", {
                enabled: changes.enabled_better_search_icons.newValue === true
            });
        });
    } catch (error) {
        // The extension context can disappear while the page is navigating.
    }

    function syncRoute() {
        sendRouteState(/(^|\/)(?:search|simulcastcalendar)(?:\/|$)/i.test(window.location.pathname) ||
            window.CRToolkit.BetterGeneres.isPath(window.location.pathname));
    }

    window.addEventListener("popstate", syncRoute);
    syncBetterSearchState();
    syncRoute();
    window.postMessage({
        source: bridgeSource,
        type: "CR_BETTER_SEARCH_CACHE_REQUEST"
    }, "*");
    window.setInterval(syncRoute, 60 * 1000);
})();

})();
