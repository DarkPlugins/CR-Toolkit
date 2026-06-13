document.addEventListener("DOMContentLoaded", () => {
    const checkboxPlayerResize = document.getElementById("toggle-player-resize");
    const checkboxAutoSkip = document.getElementById("toggle-auto-skip");

    // Load current status
    chrome.storage.sync.get(
        [
            "enabled_player_resize",
            "enabled_auto_skip"
        ],
        (data) => {
            checkboxPlayerResize.checked =
                data.enabled_player_resize ?? true;

            checkboxAutoSkip.checked =
                data.enabled_auto_skip ?? true;
        }
    );

    
    // Save changes
    checkboxPlayerResize.addEventListener("change", () => {
        chrome.storage.sync.set({ enabled_player_resize: checkboxPlayerResize.checked });
    });

    checkboxAutoSkip.addEventListener("change", () => {
        chrome.storage.sync.set({ enabled_auto_skip: checkboxAutoSkip.checked });
    });
});
