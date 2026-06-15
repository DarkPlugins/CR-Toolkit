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

window.CRToolkit = window.CRToolkit || {};
window.CRToolkit.getClassElement = getClassElement;
// Timeout to wait for cr to be fully loaded
setTimeout(() => {
    window.CRToolkit.initPlayerResize();
    window.CRToolkit.initAutoSkip();
    window.CRToolkit.initHideHeader();
    window.CRToolkit.initChangeHeader();
}, 1250);