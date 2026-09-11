(() => {
    const STYLE_ID = "cr-player-resize-style";
    const WATCH_KEYS = ["enabled_player_resize", "enabled_hide_header"];
    let initialized = false;
    let enabledPlayerResize = true;
    let enabledHideHeader = false;

    function applyPlayerResize() {
        let style = document.getElementById(STYLE_ID);
        if (!enabledPlayerResize) {
            style?.remove();
            return;
        }
        if (!style) {
            style = document.createElement("style");
            style.id = STYLE_ID;
            (document.head || document.documentElement).appendChild(style);
        }
        const css = `
            .erc-watch-episode .video-player-wrapper {
                height: ${enabledHideHeader ? "100vh" : "90vh"} !important;
                transition: height 0.3s ease;
            }
            .erc-watch-episode .erc-current-media-info {
                display: none !important;
            }
            body.scrolled .erc-watch-episode .erc-current-media-info {
                display: block !important;
            }
        `;
        if (style.textContent !== css) style.textContent = css;
    }

    function initPlayerResize() {
        if (initialized) return;
        initialized = true;
        chrome.storage.sync.get(WATCH_KEYS, data => {
            enabledPlayerResize = data.enabled_player_resize ?? true;
            enabledHideHeader = data.enabled_hide_header ?? false;
            applyPlayerResize();
        });
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== "sync" || !WATCH_KEYS.some(key => changes[key])) return;
            if (changes.enabled_player_resize) {
                enabledPlayerResize = changes.enabled_player_resize.newValue ?? true;
            }
            if (changes.enabled_hide_header) {
                enabledHideHeader = changes.enabled_hide_header.newValue ?? false;
            }
            applyPlayerResize();
        });
    }

    window.CRToolkit = window.CRToolkit || {};
    window.CRToolkit.PlayerResize = { init: initPlayerResize, apply: applyPlayerResize };
})();
