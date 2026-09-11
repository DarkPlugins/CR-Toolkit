(() => {
const SKIP_MARKER_SELECTORS = [
    // Current player: these markers are independent of the selected language.
    '[data-testid="skipIntroText"]',
    '[data-testid="skip-intro-button"]',
    '[data-testid="skipButton"]',
    'svg[data-testid="skip-intro-icon"]',
    'svg[data-testid="skip-recap-icon"]',
    'svg[data-testid="skip-credits-icon"]',
    'svg[data-testid="skip-outro-icon"]',
    '[data-testid*="skip"][data-testid*="icon"]'
];
const CLICKABLE_SELECTOR = 'button, [role="button"], [tabindex="0"]';
const PLAY_DELAY_MS = 1200;
const CHECK_INTERVAL = 800;

let initialized = false;
let intervalId = null;
let lastClick = 0;
let skipInProgress = false;
let enabled = true;
let controller = null;

function wait(ms, signal, video = null) {
    return new Promise(resolve => {
        const finish = resumed => {
            clearTimeout(timer);
            signal.removeEventListener("abort", onAbort);
            video?.removeEventListener("play", onPlay);
            video?.removeEventListener("playing", onPlay);
            resolve(resumed);
        };
        const onAbort = () => finish(false);
        const onPlay = () => finish(true);
        const timer = setTimeout(() => finish(!video), ms);
        signal.addEventListener("abort", onAbort, { once: true });
        video?.addEventListener("play", onPlay, { once: true });
        video?.addEventListener("playing", onPlay, { once: true });
        if (signal.aborted) finish(false);
    });
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
        style.opacity !== "0" &&
        style.pointerEvents !== "none" &&
        el.getAttribute("aria-hidden") !== "true" &&
        !el.disabled
    );
}

function getSkipButton() {
    for (const selector of SKIP_MARKER_SELECTORS) {
        const marker = document.querySelector(selector);
        if (!marker) continue;

        const candidates = [
            marker.closest(CLICKABLE_SELECTOR),
            marker.matches(CLICKABLE_SELECTOR) ? marker : null,
            marker.querySelector(CLICKABLE_SELECTOR),
            marker
        ];

        const button = candidates.find(isVisible);
        if (button) return button;
    }

    return null;
}

async function trySkip() {
    if (skipInProgress || !controller || controller.signal.aborted) return;
    const signal = controller.signal;

    const btn = getSkipButton();

    if (!btn) return;

    const now = Date.now();
    if (now - lastClick < 2500) return;

    skipInProgress = true;

    try {
        const video = getVideo();

        if (video?.paused) {
            const resumed = await wait(2500, signal, video);
            if (!resumed && video.paused) return;
        }

        if (!await wait(PLAY_DELAY_MS, signal)) return;
        if (signal.aborted || !/(^|\/)watch(?:\/|$)/i.test(location.pathname)) return;
        if (video && (video !== getVideo() || video.paused || video.ended)) return;

        const currentBtn = getSkipButton();
        if (!currentBtn) return;

        lastClick = Date.now();

        currentBtn.click();
    } finally {
        skipInProgress = false;
    }
}

function start() {
    if (intervalId) return;
    controller = new AbortController();
    lastClick = 0;

    intervalId = setInterval(() => {
        trySkip().catch(error => console.warn("CR-Toolkit: Auto-skip failed", error));
    }, CHECK_INTERVAL);
}

function stop() {
    controller?.abort();
    controller = null;
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

function applyAutoSkip() {
    // Cancel pending work even when navigating directly to another episode.
    stop();
    if (enabled && /(^|\/)watch(?:\/|$)/i.test(location.pathname)) start();
}

function initAutoSkip() {
    if (initialized) return;
    initialized = true;
    chrome.storage.sync.get(["enabled_auto_skip"], data => {
        enabled = data.enabled_auto_skip ?? true;
        applyAutoSkip();
    });

    // Apply listener
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "sync") return;

        if (changes.enabled_auto_skip) {
            enabled = changes.enabled_auto_skip.newValue ?? true;
            applyAutoSkip();
        }
    });
}

window.CRToolkit = window.CRToolkit || {};
window.CRToolkit.AutoSkip = window.CRToolkit.AutoSkip || {};
window.CRToolkit.AutoSkip.init = initAutoSkip;
window.CRToolkit.AutoSkip.apply = applyAutoSkip;
})();
