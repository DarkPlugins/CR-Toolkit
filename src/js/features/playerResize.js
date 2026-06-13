const STYLE_ID = "cr-player-resize-style";

function applyPlayerResize(enabled) {
    let style = document.getElementById(STYLE_ID);

    if (enabled) {
        if (!style) {
            style = document.createElement("style");
            style.id = STYLE_ID;

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
        style?.remove();
    }
}

function initPlayerResize() {
    chrome.storage.sync.get(
        ["enabled_player_resize"],
        (data) => {
            applyPlayerResize(data.enabled_player_resize ?? true);
        }
    );

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "sync") return;

        if (changes.enabled_player_resize) {
            applyPlayerResize(
                changes.enabled_player_resize.newValue
            );
        }
    });
}

window.CRToolkit = window.CRToolkit || {};
window.CRToolkit.initPlayerResize = initPlayerResize;