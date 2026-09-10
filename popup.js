document.addEventListener("DOMContentLoaded", () => {
    const checkboxPlayerResize = document.getElementById("toggle-player-resize");
    const checkboxAutoSkip = document.getElementById("toggle-auto-skip");
    const checkboxBetterSearch = document.getElementById("toggle-better-search");

    const navButtons = document.querySelectorAll(".nav-btn");
    const sections = document.querySelectorAll(".section-page");

    function showSection(sectionId) {
        sections.forEach((section) => {
            section.classList.toggle("active", section.id === sectionId);
        });

        navButtons.forEach((button) => {
            button.classList.toggle(
                "active",
                button.dataset.section === sectionId
            );
        });

        chrome.storage.sync.set({
            active_popup_section: sectionId
        });
    }

    // Load current status
    chrome.storage.sync.get(
        [
            "enabled_player_resize",
            "enabled_auto_skip",
            "enabled_better_search",
            "active_popup_section"
        ],
        (data) => {
            checkboxPlayerResize.checked =
                data.enabled_player_resize ?? true;

            checkboxAutoSkip.checked =
                data.enabled_auto_skip ?? true;

            checkboxBetterSearch.checked =
                data.enabled_better_search ?? true;

            showSection(
                data.active_popup_section ?? "s-general"
            );
        }
    );

    // Navigation
    navButtons.forEach((button) => {
        button.addEventListener("click", () => {
            showSection(button.dataset.section);
        });
    });

    // Save changes
    checkboxPlayerResize.addEventListener("change", () => {
        chrome.storage.sync.set({
            enabled_player_resize: checkboxPlayerResize.checked
        });
    });

    checkboxAutoSkip.addEventListener("change", () => {
        chrome.storage.sync.set({
            enabled_auto_skip: checkboxAutoSkip.checked
        });
    });

    checkboxBetterSearch.addEventListener("change", () => {
        chrome.storage.sync.set({
            enabled_better_search: checkboxBetterSearch.checked
        });
    });
});
