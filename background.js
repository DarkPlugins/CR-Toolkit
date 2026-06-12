chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ 
        enabled_player_resize: true, 
        enabled_auto_skip_opening: true
    });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'GET_TAB_ID') {
    // sender.tab may be undefined when message originates from content script; use sender.tab.id if present
    const tabId = sender && sender.tab && sender.tab.id ? sender.tab.id : null;
    sendResponse({ tabId });
    return true;
  }
});
