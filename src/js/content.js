window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
        document.body.classList.add("scrolled");
    } else {
        document.body.classList.remove("scrolled");
    }
});

window.CRToolkit.initPlayerResize();
window.CRToolkit.initAutoSkip();