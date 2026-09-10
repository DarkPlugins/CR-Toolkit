window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
        document.body.classList.add("scrolled");
    } else {
        document.body.classList.remove("scrolled");
    }
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
            chrome.storage.sync.get(["enabled_better_search"], data => {
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
            if (areaName !== "sync" || !changes.enabled_better_search) {
                return;
            }

            postBridgeMessage("CR_BETTER_SEARCH_ENABLED", {
                enabled: changes.enabled_better_search.newValue !== false
            });
        });
    } catch (error) {
        // The extension context can disappear while the page is navigating.
    }

    function syncRoute() {
        sendRouteState(/(^|\/)search(?:\/|$)/i.test(window.location.pathname));
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

window.CRToolkit?.initPlayerResize?.();
window.CRToolkit?.initAutoSkip?.();
window.CRToolkit?.initBetterSearch?.();
