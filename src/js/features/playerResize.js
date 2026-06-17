const STYLE_ID = "cr-player-resize-style";

function applyPlayerResize() {
    chrome.storage.sync.get(
        ["enabled_player_resize", "enabled_hide_header"],
        (data) => {
            const enabledPlayerResize = data.enabled_player_resize ?? true;
            const enabledHideHeader = data.enabled_hide_header ?? true;

            let style = document.getElementById(STYLE_ID);
            if (enabledPlayerResize) {
                if (!style) {
                    style = document.createElement("style");
                    style.id = STYLE_ID;
                    document.head.appendChild(style);
                }

                style.textContent = getStyle(enabledHideHeader);
            } else {
                style?.remove();
            }
        }
    );
}

function getStyle(enabledHideHeader) {
    let height;
    if (enabledHideHeader) {
        height = "100vh";
    } else {
        height = "90vh";
    }

    return `
        .erc-watch-episode .video-player-wrapper {
            height: ${height} !important;
            transition: height 0.3s ease;
        }

        .erc-watch-episode .erc-current-media-info {
            display: none !important;
        }

        body.scrolled .erc-watch-episode .erc-current-media-info {
            display: block !important;
        }
    `;
}

function initPlayerResize() {
    // Apply listener
    const WATCH_KEYS = [
        "enabled_player_resize",
        "enabled_hide_header"
    ];
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "sync") return;

        const shouldUpdate = WATCH_KEYS.some(key => changes[key]);

        if (shouldUpdate) {
            applyPlayerResize();
        }
    });
}

window.CRToolkit = window.CRToolkit || {};
window.CRToolkit.PlayerResize = window.CRToolkit.PlayerResize || {};
window.CRToolkit.PlayerResize.init = initPlayerResize;
window.CRToolkit.PlayerResize.apply = applyPlayerResize;