const STYLE_ID = "cr-player-resize-style";

function applyPlayerResize(enabled) {
    let style = document.getElementById(STYLE_ID);

    console.log("Test213");
    let height;
    const headerEl = window.CRToolkit.getClassElement("header");
    if(headerEl && headerEl.style.position === "absolute") {
        height = "100vh";
        console.log("Yes");
    } else {
       height = "90vh";
       console.log("Nope")
    }
    console.log("Test213");

    if (enabled) {
        if (!style) {
            style = document.createElement("style");
            style.id = STYLE_ID;

            style.textContent = `
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
            setTimeout(() => {
                applyPlayerResize(data.enabled_player_resize ?? true);
            }, 1250);
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