document.addEventListener("DOMContentLoaded", () => {
    const checkboxPlayerResize = document.getElementById("toggle-player-resize");
    const checkboxAutoSkip = document.getElementById("toggle-auto-skip");
    const checkboxHideHeader = document.getElementById("toggle-hide-header");

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
            "active_popup_section",
            "enabled_hide_header"
        ],
        (data) => {
            checkboxPlayerResize.checked =
                data.enabled_player_resize ?? true;

            checkboxAutoSkip.checked =
                data.enabled_auto_skip ?? true;

            checkboxHideHeader.checked =
                data.enabled_hide_header ?? true;

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

    checkboxHideHeader.addEventListener("change", () => {
        chrome.storage.sync.set({
            enabled_hide_header: checkboxHideHeader.checked
        });
    });
});