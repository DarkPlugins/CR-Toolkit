const CLASS_NAMES = {
    header: "app-layout__header--ywueY",
    header_sub: "erc-large-header"
};

function getClassElement(element) {
    return document.getElementsByClassName(CLASS_NAMES[element])[0] ?? null;
}

window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
        document.body.classList.add("scrolled");
    } else {
        document.body.classList.remove("scrolled");
    }
});

function initFeatures() {
    window.CRToolkit.AutoSkip.init();
    window.CRToolkit.HideHeader.init();
    window.CRToolkit.PlayerResize.init();
    window.CRToolkit.ChangeHeader.init();
}

function applyFeatures() {
    window.CRToolkit.AutoSkip.apply();
    window.CRToolkit.HideHeader.apply();
    window.CRToolkit.PlayerResize.apply();
}


window.CRToolkit = window.CRToolkit || {};
window.CRToolkit.currentUrl = location.href;
window.CRToolkit.getClassElement = getClassElement;
window.CRToolkit.HideHeader = window.CRToolkit.HideHeader || {};
window.CRToolkit.PlayerResize = window.CRToolkit.PlayerResize || {};

// Timeout to wait for cr to be fully loaded
setTimeout(() => {
    initFeatures();
    applyFeatures();
}, 1250);

// Monitor url-changes
new MutationObserver(() => {
    if (location.href !== window.CRToolkit.currentUrl) {
        window.CRToolkit.currentUrl = location.href;
        applyFeatures();
    }
}).observe(document, {
    subtree: true,
    childList: true
});