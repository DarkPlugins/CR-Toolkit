(() => {
const SEEK_BUTTON_SELECTORS = {
    backward: [
        '[data-testid="jump-backward-button"]',
        '[data-testid="seek-backward-button"]',
        '[data-testid*="backward"]',
        '[data-testid*="rewind"]'
    ],
    forward: [
        '[data-testid="jump-forward-button"]',
        '[data-testid="seek-forward-button"]',
        '[data-testid*="forward"]',
        '[data-testid*="fast-forward"]'
    ]
};

const SEEK_SECONDS = 5;
let initialized = false;

function getSeekButton(direction) {
    const playerRoot = document.querySelector(
        '[data-testid="player-controls-root"]'
    );
    const selectors = SEEK_BUTTON_SELECTORS[direction];

    for (const selector of selectors) {
        const marker = playerRoot?.querySelector(selector) ||
            document.querySelector(selector);
        const button = marker?.closest?.(
            'button, [role="button"], [tabindex="0"]'
        ) || marker;

        if (!button || button.disabled || button.getAttribute("aria-hidden") === "true") {
            continue;
        }

        const style = window.getComputedStyle(button);
        if (style.display !== "none" && style.visibility !== "hidden") {
            return button;
        }
    }

    return null;
}

function getVideo() {
    const videos = document.querySelectorAll("video");
    return videos.length ? videos[videos.length - 1] : null;
}

function isEditableTarget(target) {
    return Boolean(target?.closest?.(
        'input:not([type="range"]), textarea, select, [contenteditable="true"]'
    ));
}

function seekVideo(video, seconds) {
    if (!video || !Number.isFinite(video.currentTime)) return false;

    const duration = Number.isFinite(video.duration)
        ? video.duration
        : Number.POSITIVE_INFINITY;
    const nextTime = Math.max(
        0,
        Math.min(duration, video.currentTime + seconds)
    );

    if (nextTime === video.currentTime) return false;

    video.currentTime = nextTime;
    return true;
}

function handleKeydown(event) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if (!window.location.pathname.includes("/watch")) return;
    if (isEditableTarget(event.target)) return;

    const direction = event.key === "ArrowLeft" ? "backward" : "forward";
    const seconds = direction === "backward" ? -SEEK_SECONDS : SEEK_SECONDS;
    const button = getSeekButton(direction);
    const didSeek = button ? true : seekVideo(getVideo(), seconds);

    if (!didSeek) return;

    event.preventDefault();
    event.stopPropagation();

    if (button) button.click();
}

function initKeyboardSeek() {
    if (initialized) return;
    initialized = true;

    // Capture the event before the player can reset the time again.
    document.addEventListener("keydown", handleKeydown, true);
}

window.CRToolkit = window.CRToolkit || {};
window.CRToolkit.KeyboardSeek = window.CRToolkit.KeyboardSeek || {};
window.CRToolkit.KeyboardSeek.init = initKeyboardSeek;
})();
