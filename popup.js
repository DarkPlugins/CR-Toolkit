function updateHeaderChildrenState(children, enabled) {
    children.forEach(cb => {
        cb.disabled = !enabled;

        const label = document.querySelector(`label[for="${cb.id}"]`);
        if (label) {
            label.style.pointerEvents = enabled ? "auto" : "none";
            label.style.opacity = enabled ? "1" : "0.4";
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const checkboxPlayerResize = document.getElementById("toggle-player-resize");
    const checkboxAutoSkip = document.getElementById("toggle-auto-skip");
    const checkboxHideHeader = document.getElementById("toggle-hide-header");
    const checkBoxChangeHeader = document.getElementById("toggle-change-header");
    const checkBoxChangeHeaderLogo = document.getElementById("toggle-change-header-logo");
    const checkBoxChangeHeaderNew = document.getElementById("toggle-change-header-new");
    const checkBoxChangeHeaderPopular = document.getElementById("toggle-change-header-popular");
    const checkBoxChangeHeaderSimulcast = document.getElementById("toggle-change-header-simulcast");
    const checkBoxChangeHeaderCategories = document.getElementById("toggle-change-header-categories");
    const checkBoxChangeHeaderGames = document.getElementById("toggle-change-header-games");
    const checkBoxChangeHeaderStore = document.getElementById("toggle-change-header-store");
    const checkBoxChangeHeaderNews = document.getElementById("toggle-change-header-news");
    const checkBoxChangeHeaderChildren = [
        checkBoxChangeHeaderLogo,
        checkBoxChangeHeaderNew,
        checkBoxChangeHeaderPopular,
        checkBoxChangeHeaderSimulcast,
        checkBoxChangeHeaderCategories,
        checkBoxChangeHeaderGames,
        checkBoxChangeHeaderStore,
        checkBoxChangeHeaderNews
    ];
    // Feature: Change Colors
    const colorList = document.getElementById("list-colors"); 
    const btnAddNewColor = document.getElementById('btn-add-color');

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
            "enabled_hide_header",
            "enabled_change_header",
            "enabled_change_header_logo",
            "enabled_change_header_new",
            "enabled_change_header_popular",
            "enabled_change_header_simulcast",
            "enabled_change_header_categories",
            "enabled_change_header_games",
            "enabled_change_header_store",
            "enabled_change_header_news",
            "active_popup_section"
        ],
        (data) => {
            checkboxPlayerResize.checked =
                data.enabled_player_resize ?? true;

            checkboxAutoSkip.checked =
                data.enabled_auto_skip ?? true;

            checkboxHideHeader.checked =
                data.enabled_hide_header ?? true;
                
            checkBoxChangeHeader.checked =
                data.enabled_change_header ?? false;

            checkBoxChangeHeaderLogo.checked =
                data.enabled_change_header_logo ?? false;

            checkBoxChangeHeaderNew.checked =
                data.enabled_change_header_new ?? false;

            checkBoxChangeHeaderPopular.checked =
                data.enabled_change_header_popular ?? false;

            checkBoxChangeHeaderSimulcast.checked =
                data.enabled_change_header_simulcast ?? false;

            checkBoxChangeHeaderCategories.checked =
                data.enabled_change_header_categories ?? false;

            checkBoxChangeHeaderGames.checked =
                data.enabled_change_header_games ?? false;

            checkBoxChangeHeaderStore.checked =
                data.enabled_change_header_store ?? false;

            checkBoxChangeHeaderNews.checked =
                data.enabled_change_header_news ?? false;

            updateHeaderChildrenState(checkBoxChangeHeaderChildren, checkBoxChangeHeader.checked);

            // Feature: Change-Colors
            if(colorList) {
                
            }

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
    
    checkBoxChangeHeader.addEventListener("change", () => {
        const enabled = checkBoxChangeHeader.checked;

        chrome.storage.sync.set({
            enabled_change_header: enabled
        });

        updateHeaderChildrenState(checkBoxChangeHeaderChildren, enabled);
    });

    checkBoxChangeHeaderLogo.addEventListener("change", () => {
        chrome.storage.sync.set({
            enabled_change_header_logo: checkBoxChangeHeaderLogo.checked
        });
    });

    checkBoxChangeHeaderNew.addEventListener("change", () => {
        chrome.storage.sync.set({
            enabled_change_header_new: checkBoxChangeHeaderNew.checked
        });
    });

    checkBoxChangeHeaderPopular.addEventListener("change", () => {
        chrome.storage.sync.set({
            enabled_change_header_popular: checkBoxChangeHeaderPopular.checked
        });
    });

    checkBoxChangeHeaderSimulcast.addEventListener("change", () => {
        chrome.storage.sync.set({
            enabled_change_header_simulcast: checkBoxChangeHeaderSimulcast.checked
        });
    });

    checkBoxChangeHeaderCategories.addEventListener("change", () => {
        chrome.storage.sync.set({
            enabled_change_header_categories: checkBoxChangeHeaderCategories.checked
        });
    });

    checkBoxChangeHeaderGames.addEventListener("change", () => {
        chrome.storage.sync.set({
            enabled_change_header_games: checkBoxChangeHeaderGames.checked
        });
    });

    checkBoxChangeHeaderStore.addEventListener("change", () => {
        chrome.storage.sync.set({
            enabled_change_header_store: checkBoxChangeHeaderStore.checked
        });
    });

    checkBoxChangeHeaderNews.addEventListener("change", () => {
        chrome.storage.sync.set({
            enabled_change_header_news: checkBoxChangeHeaderNews.checked
        });
    });

    btnAddNewColor.addEventListener('click', addNewColor);
});

let colorCounter = 0;

function addNewColor() {
    const colorList = document.getElementById("list-colors");
    if (!colorList) return;

    colorCounter += 1;
    const row = document.createElement('div');
    row.className = 'color-row';

    const from = document.createElement('input');
    from.type = 'color';
    from.name = `color-from-${colorCounter}`;
    from.id = `color-from-${colorCounter}`;
    from.value = '#FF640A';

    const sep = document.createElement('span');
    sep.textContent = '→';

    const to = document.createElement('input');
    to.type = 'color';
    to.name = `color-to-${colorCounter}`;
    to.id = `color-to-${colorCounter}`;
    to.value = '#b7183e';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => row.remove());

    row.append(from, sep, to, removeBtn);
    colorList.appendChild(row);
}