document.addEventListener("DOMContentLoaded", () => {
    const checkbox = document.getElementById("toggle");

    // Load current status
    chrome.storage.sync.get(["enabled"], (data) => {
        checkbox.checked = data.enabled ?? true;
    });

    // Save changes
    checkbox.addEventListener("change", () => {
        chrome.storage.sync.set({ enabled: checkbox.checked });
    });
});
