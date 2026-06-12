document.addEventListener("DOMContentLoaded", () => {
    const checkboxPlayerResize = document.getElementById("toggle-player-resize");
    const checkboxAutoSkipOpening = document.getElementById("toggle-auto-skip-opening");

    // Load current status
    chrome.storage.sync.get(["enabled_player_resize"], (data) => {
        checkboxPlayerResize.checked = data.enabled ?? true;
    });
    chrome.storage.sync.get(["enabled_auto_skip_opening"], (data) => {
        checkboxAutoSkipOpening.checked = data.enabled ?? true;
    });

    // Save changes
    checkboxPlayerResize.addEventListener("change", () => {
        chrome.storage.sync.set({ enabled: checkboxPlayerResize.checked });
    });
    checkboxAutoSkipOpening.addEventListener("change", () => {
        chrome.storage.sync.set({ enabled: checkboxAutoSkipOpening.checked });
    });
});
