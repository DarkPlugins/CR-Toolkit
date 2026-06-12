document.addEventListener("DOMContentLoaded", () => {
  const checkbox = document.getElementById("toggle");
  const accent = document.getElementById("input-accent");
  const resetBtn = document.getElementById("reset-colors");

  const DEFAULTS = {
    enabled: true,
    accentColor: "#FF640A"
  };

  chrome.storage.sync.get(["enabled", "accentColor"], (data) => {
    checkbox.checked = data.enabled ?? DEFAULTS.enabled;
    accent.value = data.accentColor ?? DEFAULTS.accentColor;
  });

  checkbox.addEventListener("change", () => {
    chrome.storage.sync.set({ enabled: checkbox.checked });
  });

  // Save accent immediately on input (no debounce) so content script can apply without delay
  accent.addEventListener("input", () => {
    chrome.storage.sync.set({ accentColor: accent.value });
  });

  resetBtn.addEventListener("click", () => {
    chrome.storage.sync.set(DEFAULTS, () => {
      accent.value = DEFAULTS.accentColor;
      checkbox.checked = DEFAULTS.enabled;
    });
  });
});
