const BETTER_SEARCH_CACHE_KEY = "cr-better-search-extension-cache";
const BETTER_SEARCH_CACHE_TTL = 10 * 60 * 1000;
const betterSearchCacheOperations = [];
let betterSearchCacheOperationRunning = false;

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get(
        [
            "active_popup_section",
            "enabled_player_resize",
            "enabled_auto_skip"
        ],
        (data) => {
            const updates = {};

            if (data.enabled_player_resize === undefined) {
                updates.enabled_player_resize = true;
            }

            if (data.enabled_auto_skip === undefined) {
                updates.enabled_auto_skip = true;
            }

            if (data.active_popup_section === undefined) {
                updates.active_popup_section = "s-general";
            }

            if (Object.keys(updates).length > 0) {
                chrome.storage.sync.set(updates);
            }
        }
    );
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === "GET_TAB_ID") {
        sendResponse({
            tabId: sender?.tab?.id ?? null
        });

        return true;
    }

    if (!msg || !msg.type?.startsWith("CR_BETTER_SEARCH_")) {
        return false;
    }

    const tabKey = String(sender?.tab?.id ?? "global");

    if (msg.type === "CR_BETTER_SEARCH_ROUTE") {
        updateSearchRoute(tabKey, Boolean(msg.isSearch), sendResponse);
        return true;
    }

    if (msg.type === "CR_BETTER_SEARCH_GET_CACHE") {
        readSearchCache(tabKey, sendResponse);
        return true;
    }

    if (msg.type === "CR_BETTER_SEARCH_SAVE_CACHE") {
        mergeSearchCache(tabKey, msg.records, sendResponse);
        return true;
    }

    return false;
});

if (chrome.tabs?.onRemoved) {
    chrome.tabs.onRemoved.addListener(tabId => {
        removeTabSearchCache(String(tabId));
    });
}

function updateSearchRoute(tabKey, isSearch, sendResponse) {
    enqueueCacheOperation(done => {
        readCacheState(state => {
            const cleaned = cleanCacheState(state);

            if (!isSearch) {
                delete cleaned.tabs[tabKey];
            } else {
                const tabCache = cleaned.tabs[tabKey] || {
                    records: [],
                    isSearch: true,
                    updatedAt: Date.now()
                };
                tabCache.isSearch = true;
                tabCache.updatedAt = Date.now();
                cleaned.tabs[tabKey] = tabCache;
            }

            writeCacheState(cleaned, () => {
                respondAndFinish(done, sendResponse, {ok: true});
            });
        });
    });
}

function readSearchCache(tabKey, sendResponse) {
    enqueueCacheOperation(done => {
        readCacheState(state => {
            const cleaned = cleanCacheState(state);
            const tabCache = cleaned.tabs[tabKey];

            writeCacheState(cleaned, () => {
                respondAndFinish(done, sendResponse, {
                    records: tabCache?.records || []
                });
            });
        });
    });
}

function mergeSearchCache(tabKey, records, sendResponse) {
    enqueueCacheOperation(done => {
        readCacheState(state => {
            const cleaned = cleanCacheState(state);
            const tabCache = cleaned.tabs[tabKey] || {
                records: [],
                isSearch: true,
                updatedAt: Date.now()
            };

            tabCache.records = mergeRecords(tabCache.records, records);
            tabCache.isSearch = true;
            tabCache.updatedAt = Date.now();
            cleaned.tabs[tabKey] = tabCache;

            writeCacheState(cleaned, () => {
                respondAndFinish(done, sendResponse, {
                    records: tabCache.records
                });
            });
        });
    });
}

function removeTabSearchCache(tabKey) {
    enqueueCacheOperation(done => {
        readCacheState(state => {
            const cleaned = cleanCacheState(state);
            delete cleaned.tabs[tabKey];
            writeCacheState(cleaned, done);
        });
    });
}

function enqueueCacheOperation(operation) {
    betterSearchCacheOperations.push(operation);
    runNextCacheOperation();
}

function runNextCacheOperation() {
    if (betterSearchCacheOperationRunning || !betterSearchCacheOperations.length) {
        return;
    }

    betterSearchCacheOperationRunning = true;
    const operation = betterSearchCacheOperations.shift();
    let completed = false;

    const done = () => {
        if (completed) {
            return;
        }

        completed = true;
        betterSearchCacheOperationRunning = false;
        runNextCacheOperation();
    };

    try {
        operation(done);
    } catch (error) {
        done();
    }
}

function respondAndFinish(done, sendResponse, response) {
    try {
        sendResponse(response);
    } finally {
        done();
    }
}

function readCacheState(callback) {
    chrome.storage.local.get(BETTER_SEARCH_CACHE_KEY, data => {
        callback(data[BETTER_SEARCH_CACHE_KEY] || {tabs: {}});
    });
}

function writeCacheState(state, callback = () => {}) {
    chrome.storage.local.set({
        [BETTER_SEARCH_CACHE_KEY]: state
    }, callback);
}

function cleanCacheState(state) {
    const cleaned = state && typeof state === "object"
        ? state
        : {tabs: {}};
    cleaned.tabs = cleaned.tabs && typeof cleaned.tabs === "object"
        ? cleaned.tabs
        : {};

    const now = Date.now();
    Object.entries(cleaned.tabs).forEach(([tabKey, tabCache]) => {
        if (!tabCache || !Array.isArray(tabCache.records) ||
            now - Number(tabCache.updatedAt || 0) > BETTER_SEARCH_CACHE_TTL) {
            delete cleaned.tabs[tabKey];
        }
    });

    return cleaned;
}

function mergeRecords(existingRecords, incomingRecords) {
    const records = Array.isArray(existingRecords)
        ? existingRecords
        : [];

    if (!Array.isArray(incomingRecords)) {
        return records;
    }

    incomingRecords.forEach(incoming => {
        if (!isCacheRecord(incoming)) {
            return;
        }

        const existing = records.find(record => recordsOverlap(record, incoming));
        if (!existing) {
            records.push(normalizeCacheRecord(incoming));
            return;
        }

        existing.ids = unique(existing.ids.concat(incoming.ids));
        existing.titles = unique(existing.titles.concat(incoming.titles));
        existing.audioLocales = unique(
            existing.audioLocales.concat(incoming.audioLocales)
        );
        existing.subtitleLocales = unique(
            existing.subtitleLocales.concat(incoming.subtitleLocales)
        );
        existing.hasDub = mergeFlag(existing.hasDub, incoming.hasDub);
        existing.hasSub = mergeFlag(existing.hasSub, incoming.hasSub);
    });

    return records.slice(-500);
}

function isCacheRecord(record) {
    return record && typeof record === "object" &&
        Array.isArray(record.ids) && Array.isArray(record.titles) &&
        Array.isArray(record.audioLocales) &&
        Array.isArray(record.subtitleLocales);
}

function normalizeCacheRecord(record) {
    return {
        cacheKey: record.cacheKey || record.ids[0] || `title:${record.titles[0]}`,
        ids: unique(record.ids.map(value => String(value).toLowerCase())),
        titles: unique(record.titles.map(value => String(value).toLowerCase())),
        audioLocales: unique(record.audioLocales.map(value => String(value).toLowerCase())),
        subtitleLocales: unique(record.subtitleLocales.map(value => String(value).toLowerCase())),
        hasDub: normalizeFlag(record.hasDub),
        hasSub: normalizeFlag(record.hasSub)
    };
}

function recordsOverlap(left, right) {
    return left.ids.some(id => right.ids.includes(id)) ||
        left.titles.some(title => right.titles.includes(title));
}

function normalizeFlag(value) {
    return value === true || value === false ? value : null;
}

function mergeFlag(existing, incoming) {
    if (existing === true || incoming === true) {
        return true;
    }

    if (existing === false || incoming === false) {
        return false;
    }

    return null;
}

function unique(values) {
    return [...new Set(values)];
}
