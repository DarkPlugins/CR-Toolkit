(() => {
    let initialized = false;
    let enabled = false;
    let active = false;
    let visible = false;
    let hideTimer = null;
    let pointerNearHeader = false;
    let pageActive = true;
    const menuObserver = new MutationObserver(updateVisibility);

    function setVisible(nextVisible) {
        if (visible === nextVisible) return;
        visible = nextVisible;
        document.documentElement.classList.toggle("cr-header-visible", visible);
    }

    function cancelHide() {
        clearTimeout(hideTimer);
        hideTimer = null;
    }

    function resetVisibility() {
        cancelHide();
        setVisible(false);
    }

    function handleVisibilityChange() {
        if (document.hidden) suspendVisibility();
        else resumeVisibility();
    }

    function hasOpenHeaderMenu() {
        return Boolean(document.querySelector(
            '.erc-large-header [aria-haspopup="menu"][aria-expanded="true"]'
        ));
    }

    function updateVisibility() {
        if (!active || !pageActive || document.hidden) {
            resetVisibility();
        } else if (pointerNearHeader || hasOpenHeaderMenu()) {
            cancelHide();
            setVisible(true);
        } else if (visible && hideTimer === null) {
            // Allow crossing the small gap between a header action and its dropdown.
            hideTimer = setTimeout(() => {
                hideTimer = null;
                setVisible(active && pageActive && !document.hidden &&
                    (pointerNearHeader || hasOpenHeaderMenu()));
            }, 180);
        }
    }

    function suspendVisibility() {
        pageActive = false;
        pointerNearHeader = false;
        resetVisibility();
    }

    function resumeVisibility() {
        pageActive = true;
        updateVisibility();
    }

    function handleMouseLeave() {
        pointerNearHeader = false;
        if (hasOpenHeaderMenu()) updateVisibility();
        else resetVisibility();
    }

    function handleMouseMove(event) {
        if (document.hidden) return;
        // The composed path also includes dropdowns inside the settings shadow root.
        const overHeader = event.composedPath().some(node => node.matches?.(".erc-large-header"));
        pageActive = true;
        pointerNearHeader = event.clientY <= 50 || overHeader;
        updateVisibility();
    }

    function applyHideHeader() {
        const nextActive = enabled && /(^|\/)watch(?:\/|$)/i.test(location.pathname);
        if (active === nextActive) return;
        active = nextActive;
        pointerNearHeader = false;
        resetVisibility();
        document.documentElement.classList.toggle("cr-hide-header", active);
        if (active) {
            document.addEventListener("mousemove", handleMouseMove, { passive: true });
            document.addEventListener("mouseleave", handleMouseLeave);
            document.addEventListener("visibilitychange", handleVisibilityChange);
            window.addEventListener("blur", suspendVisibility);
            window.addEventListener("focus", resumeVisibility);
            // Observe the site's menu state, including menus replaced during SPA navigation.
            menuObserver.observe(document.documentElement, {
                subtree: true,
                childList: true,
                attributes: true,
                attributeFilter: ["aria-expanded", "aria-haspopup"]
            });
            updateVisibility();
        } else {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseleave", handleMouseLeave);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", suspendVisibility);
            window.removeEventListener("focus", resumeVisibility);
            menuObserver.disconnect();
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
