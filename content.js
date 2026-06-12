function applyPlayerResize(enabled) {
    let style = document.getElementById("cr-player-resize-style");

    if (enabled) {
        if (!style) {
            style = document.createElement("style");
            style.id = "cr-player-resize-style";
            style.textContent = `
                .erc-watch-episode .video-player-wrapper {
                    height: 90vh !important;
                    transition: height 0.3s ease;
                }
                .erc-watch-episode .erc-current-media-info {
                    display: none !important;
                }
                body.scrolled .erc-watch-episode .erc-current-media-info {
                    display: block !important;
                }
            `;
            document.head.appendChild(style);
        }
    } else {
        if (style) style.remove();
    }
}

const SKIP_SELECTOR = 'button[aria-label="Opening überspringen"]';
const PLAY_DELAY_MS = 3000; // How long the video should play after a skip is detected

function simulateClick(elem) {
  const evOpts = { bubbles: true, cancelable: true, view: window };
  ['mousedown', 'mouseup', 'click'].forEach(type => {
    elem.dispatchEvent(new MouseEvent(type, evOpts));
  });
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function handleSkipWhenButtonDetected(btn) {
  // Try to find the current video element
  const videos = Array.from(document.querySelectorAll('video'));
  const v = videos.reverse()[0]; // prioritize the most recently inserted / visible video
  if (v) {
    // If paused, do not force anything—let it play if it is already playing, or wait briefly until it is playing.
    if (v.paused) {
      // Wait briefly for play (max. 5s); otherwise, do not start automatically.
      const played = await Promise.race([
        new Promise(resolve => {
          const onPlay = () => { cleanup(); resolve(true); };
          function cleanup() {
            v.removeEventListener('play', onPlay);
            v.removeEventListener('playing', onPlay);
          }
          v.addEventListener('play', onPlay, { once: true });
          v.addEventListener('playing', onPlay, { once: true });
        }),
        wait(5000).then(() => false)
      ]);
      if (!played && v.paused) {
        // Do nothing, video won't play — but we respect your preference: do not force playback.
        return;
      }
    }
    // Video is playing now; waiting for configuration to continue playback.
    await wait(PLAY_DELAY_MS);
  } else {
    // No video found: still, wait a moment before skipping.
    await wait(PLAY_DELAY_MS);
  }

  // Click the button (fetch the current DOM element again)
  const currentBtn = document.querySelector(SKIP_SELECTOR);
  if (currentBtn) simulateClick(currentBtn);
}

// Observer solely for identifying the button
const observer = new MutationObserver((mutations) => {
  for (const m of mutations) {
    if (m.addedNodes && m.addedNodes.length) {
      const btn = document.querySelector(SKIP_SELECTOR);
      if (btn) {
        // Act once; no further hiding or manipulating.
        handleSkipWhenButtonDetected(btn);
        return;
      }
    }
    if (m.type === 'attributes' && m.target && m.target.matches && m.target.matches(SKIP_SELECTOR)) {
      // Also take action if attributes are changed (e.g., visible).
      const btn = document.querySelector(SKIP_SELECTOR);
      if (btn) {
        handleSkipWhenButtonDetected(btn);
      }
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-hidden', 'class', 'tabindex'] });

// Check initially if the button already exists.
const existing = document.querySelector(SKIP_SELECTOR);
if (existing) handleSkipWhenButtonDetected(existing);

// stop observer after x ms to save resources
setTimeout(() => observer.disconnect(), 30000);

// Auf Scroll achten, damit Titel sichtbar wird
window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
        document.body.classList.add("scrolled");
    } else {
        document.body.classList.remove("scrolled");
    }
});

// Retrieve the status upon loading
chrome.storage.sync.get(["enabled"], (data) => {
    applyPlayerResize(data.enabled);
});

// React to changes
chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
        applyPlayerResize(changes.enabled.newValue);
    }
});