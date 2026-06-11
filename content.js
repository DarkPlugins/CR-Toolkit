function applyStyles(enabled) {
    let style = document.getElementById("cr-player-resize-style");

    if (enabled) {
        if (!style) {
            style = document.createElement("style");
            style.id = "cr-player-resize-style";
            style.textContent = `
                .erc-watch-episode .video-player-wrapper {
                    height: 90vh !important;
                    transition: height 0.3s ease;
                }
                .erc-watch-episode .erc-current-media-info {
                    display: none !important;
                }
                body.scrolled .erc-watch-episode .erc-current-media-info {
                    display: block !important;
                }
            `;
            document.head.appendChild(style);
        }
    } else {
        if (style) style.remove();
    }
}

// Auf Scroll achten, damit Titel sichtbar wird
window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
        document.body.classList.add("scrolled");
    } else {
        document.body.classList.remove("scrolled");
    }
});

// Retrieve the status upon loading
chrome.storage.sync.get(["enabled"], (data) => {
    applyStyles(data.enabled);
});

// React to changes
chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
        applyStyles(changes.enabled.newValue);
    }
});