const HEADER_CLASS = "erc-large-header";

function applyHideHeader(enabled) {
    const headerEls = document.getElementsByClassName(HEADER_CLASS);
    const headerEl = headerEls[0] ?? null;

    if (!headerEl) return;

    if (enabled) {
        headerEl.style.opacity = "0";
        headerEl.style.pointerEvents = "none";
        headerEl.style.transition = "opacity 0.5s";

        // Show when hovering over the top edge of the screen
        document.addEventListener("mousemove", handleMouseMove);
    } else {
        headerEl.style.opacity = "1";
        headerEl.style.pointerEvents = "auto";
        document.removeEventListener("mousemove", handleMouseMove);
    }
}

function handleMouseMove(event) {
    const headerEls = document.getElementsByClassName(HEADER_CLASS);
    const headerEl = headerEls[0] ?? null;

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
    chrome.storage.sync.get(
        ["enabled_hide_header"],
        (data) => {
            applyHideHeader(data.enabled_hide_header ?? true);
        }
    );

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "sync") return;

        if (changes.enabled_hide_header) {
            applyHideHeader(
                changes.enabled_hide_header.newValue
            );
        }
    });
}

window.CRToolkit = window.CRToolkit || {};
window.CRToolkit.initHideHeader = initHideHeader;