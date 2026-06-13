chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get(
        [
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
});