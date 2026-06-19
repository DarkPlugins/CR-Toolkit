function applyHideHeader() {
    chrome.storage.sync.get(
        ["enabled_hide_header"],
        (data) => {
            const enabled = data.enabled_hide_header;

            const headerEl = window.CRToolkit.getClassElement("header_sub");
            const headerBackEl = window.CRToolkit.getClassElement("header");

            if (!headerEl) return;

            if (enabled && window.location.pathname.includes("watch")) {
                headerEl.style.opacity = "0";
                headerEl.style.pointerEvents = "none";
                headerEl.style.transition = "opacity 0.25s";

                if (headerBackEl) {
                    headerBackEl.style.position = "absolute";
                }

                // Show when hovering over the top edge of the screen
                document.addEventListener("mousemove", handleMouseMove);
            } else {
                headerEl.style.opacity = "1";
                headerEl.style.pointerEvents = "auto";

                if (headerBackEl) {
                    headerBackEl.style.position = "relative";
                }

                document.removeEventListener("mousemove", handleMouseMove);
            }
        }
    );
}

function handleMouseMove(event) {
    const headerEl = window.CRToolkit.getClassElement("header_sub");

    if (!headerEl) return;

    // Show header when the mouse is in the top 50px of the window
    if (event.clientY <= 50) {
        headerEl.style.opacity = "1";
        headerEl.style.pointerEvents = "auto";
    } else {
        headerEl.style.opacity = "0";
        headerEl.style.pointerEvents = "none";
    }
}

function initHideHeader() {
    // Apply listener
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "sync") return;

        if (changes.enabled_hide_header) {
            apply();
        }
    });
}

window.CRToolkit = window.CRToolkit || {};
window.CRToolkit.HideHeader = window.CRToolkit.HideHeader || {};
window.CRToolkit.HideHeader.init = initHideHeader;
window.CRToolkit.HideHeader.apply = applyHideHeader;