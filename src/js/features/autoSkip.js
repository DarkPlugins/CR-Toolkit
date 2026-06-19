const SKIP_SELECTOR = 'button[data-variant="primary"]';
const PLAY_DELAY_MS = 1200;
const CHECK_INTERVAL = 800;

let initialized = false;
let intervalId = null;
let lastClick = 0;

function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function getVideo() {
    const videos = document.querySelectorAll("video");
    return videos.length ? videos[videos.length - 1] : null;
}

function isVisible(el) {
    if (!el) return false;

    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);

    return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        style.opacity !== "0"
    );
}

async function trySkip() {
    const btn = document.querySelector(SKIP_SELECTOR);

    if (!btn || !isVisible(btn)) return;

    const now = Date.now();
    if (now - lastClick < 2500) return;

    const video = getVideo();

    if (video) {
        if (video.paused) {
            const resumed = await Promise.race([
                new Promise(resolve => {
                    const onPlay = () => {
                        video.removeEventListener("play", onPlay);
                        video.removeEventListener("playing", onPlay);
                        resolve(true);
                    };

                    video.addEventListener("play", onPlay, { once: true });
                    video.addEventListener("playing", onPlay, { once: true });
                }),
                wait(2500).then(() => false)
            ]);

            if (!resumed && video.paused) return;
        }

        await wait(PLAY_DELAY_MS);
    } else {
        await wait(PLAY_DELAY_MS);
    }

    const currentBtn = document.querySelector(SKIP_SELECTOR);
    if (!currentBtn || !isVisible(currentBtn)) return;

    lastClick = Date.now();

    // IMPORTANT: no MouseEvent spam anymore
    currentBtn.click();
}

function start() {
    if (intervalId) return;

    intervalId = setInterval(() => {
        trySkip();
    }, CHECK_INTERVAL);
}

function stop() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

function applyAutoSkip() {
    chrome.storage.sync.get(["enabled_auto_skip"], (data) => {
        if (Boolean(data.enabled_auto_skip) && window.CRToolkit && window.CRToolkit.currentUrl &&
            window.CRToolkit.currentUrl.indexOf("watch") !== -1)
        {
            start();
        }
        else {
            stop();
        }
    });
}

function initAutoSkip() {
    if (initialized) return;
    initialized = true;

    // Apply listener
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "sync") return;

        if (changes.enabled_auto_skip) {
            applyAutoSkip(changes.enabled_auto_skip.newValue);
        }
    });
}

window.CRToolkit = window.CRToolkit || {};
window.CRToolkit.AutoSkip = window.CRToolkit.AutoSkip || {};
window.CRToolkit.AutoSkip.init = initAutoSkip;
window.CRToolkit.AutoSkip.apply = applyAutoSkip;