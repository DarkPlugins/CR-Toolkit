const SKIP_SELECTOR = 'button[data-variant="primary"]';
const PLAY_DELAY_MS = 1500;

let observer = null;
let observerTimeout = null;
let initialized = false;

function simulateClick(elem) {
    const evOpts = {
        bubbles: true,
        cancelable: true,
        view: window
    };

    ["mousedown", "mouseup", "click"].forEach((type) => {
        elem.dispatchEvent(new MouseEvent(type, evOpts));
    });
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function handleSkipWhenButtonDetected() {
    const videos = Array.from(document.querySelectorAll("video"));
    const video = videos.reverse()[0];

    if (video) {
        if (video.paused) {
            const played = await Promise.race([
                new Promise((resolve) => {
                    const onPlay = () => {
                        cleanup();
                        resolve(true);
                    };

                    function cleanup() {
                        video.removeEventListener("play", onPlay);
                        video.removeEventListener("playing", onPlay);
                    }

                    video.addEventListener("play", onPlay, { once: true });
                    video.addEventListener("playing", onPlay, { once: true });
                }),
                wait(5000).then(() => false)
            ]);

            if (!played && video.paused) {
                return;
            }
        }

        await wait(PLAY_DELAY_MS);
    } else {
        await wait(PLAY_DELAY_MS);
    }

    const currentBtn = document.querySelector(SKIP_SELECTOR);

    if (currentBtn) {
        simulateClick(currentBtn);
    }
}

function stopObserver() {
    observer?.disconnect();
    observer = null;

    if (observerTimeout) {
        clearTimeout(observerTimeout);
        observerTimeout = null;
    }
}

function startObserver() {
    stopObserver();

    observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes?.length) {
                const btn = document.querySelector(SKIP_SELECTOR);

                if (btn) {
                    handleSkipWhenButtonDetected();
                    return;
                }
            }

            if (
                mutation.type === "attributes" &&
                mutation.target?.matches?.(SKIP_SELECTOR)
            ) {
                const btn = document.querySelector(SKIP_SELECTOR);

                if (btn) {
                    handleSkipWhenButtonDetected();
                }
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["aria-hidden", "class", "tabindex"]
    });

    const existing = document.querySelector(SKIP_SELECTOR);

    if (existing) {
        handleSkipWhenButtonDetected();
    }

    observerTimeout = setTimeout(() => {
        stopObserver();
    }, 30000);
}

function applyAutoSkip(enabled) {
    if (enabled) {
        startObserver();
    } else {
        stopObserver();
    }
}

function initAutoSkip() {
    if (initialized) return;

    initialized = true;

    chrome.storage.sync.get(
        ["enabled_auto_skip"],
        (data) => {
            applyAutoSkip(data.enabled_auto_skip ?? true);
        }
    );

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "sync") return;

        if (changes.enabled_auto_skip) {
            applyAutoSkip(
                changes.enabled_auto_skip.newValue
            );
        }
    });
}

window.CRToolkit = window.CRToolkit || {};
window.CRToolkit.initAutoSkip = initAutoSkip;