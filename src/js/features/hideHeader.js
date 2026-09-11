(() => {
    let initialized = false;
    let enabled = false;
    let active = false;
    let visible = false;

    function handleMouseMove(event) {
        const nextVisible = event.clientY <= 50;
        if (visible === nextVisible) return;
        visible = nextVisible;
        document.documentElement.classList.toggle("cr-header-visible", visible);
    }

    function applyHideHeader() {
        const nextActive = enabled && /(^|\/)watch(?:\/|$)/i.test(location.pathname);
        if (active === nextActive) return;
        active = nextActive;
        visible = false;
        document.documentElement.classList.toggle("cr-hide-header", active);
        document.documentElement.classList.remove("cr-header-visible");
        if (active) {
            document.addEventListener("mousemove", handleMouseMove, { passive: true });
        } else {
            document.removeEventListener("mousemove", handleMouseMove);
        }
    }

    function initHideHeader() {
        if (initialized) return;
        initialized = true;
        const style = document.createElement("style");
        style.id = "cr-hide-header-style";
        style.textContent = `
            html.cr-hide-header .erc-large-header {
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.25s;
            }
            html.cr-hide-header.cr-header-visible .erc-large-header {
                opacity: 1;
                pointer-events: auto;
            }
            html.cr-hide-header [class*="app-layout__header--"] {
                position: absolute;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
        chrome.storage.sync.get(["enabled_hide_header"], data => {
            enabled = data.enabled_hide_header ?? false;
            applyHideHeader();
        });
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== "sync" || !changes.enabled_hide_header) return;
            enabled = changes.enabled_hide_header.newValue ?? false;
            applyHideHeader();
        });
    }

    window.CRToolkit = window.CRToolkit || {};
    window.CRToolkit.HideHeader = { init: initHideHeader, apply: applyHideHeader };
})();
