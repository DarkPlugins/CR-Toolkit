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
    const btnAddNewColor = document.getElementById('btn-add-color');
    const btnAddPageColors = document.getElementById('btn-add-page-colors');
    const colorSort = document.getElementById('color-sort');

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
            "color_mappings",
            "color_sort_order"
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

            if (colorSort) {
                colorSort.value = data.color_sort_order === 'color' ? 'color' : 'added';
            }
            renderColorMappings(data.color_mappings ?? []);

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

    if (btnAddNewColor) {
        btnAddNewColor.addEventListener('click', addNewColor);
    }

    if (btnAddPageColors) {
        btnAddPageColors.addEventListener('click', addColorsFromCurrentPage);
    }

    if (colorSort) {
        colorSort.addEventListener('change', () => {
            chrome.storage.sync.set({ color_sort_order: colorSort.value });
            renderColorMappings(getColorMappings());
        });
    }
});

let colorCounter = 0;
const DEFAULT_FROM_COLOR = '#FF640A';
const DEFAULT_TO_COLOR = '#b7183e';

function isCrunchyrollUrl(url) {
    try {
        const hostname = new URL(url).hostname;
        return hostname === 'crunchyroll.com' || hostname.endsWith('.crunchyroll.com');
    } catch (_) {
        return false;
    }
}

function collectColorsFromCurrentPage() {
    const colorTokenPattern = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi;
    const rawColors = new Set();
    const colorProperties = [
        'color',
        'background-color',
        'background',
        'border-top-color',
        'border-right-color',
        'border-bottom-color',
        'border-left-color',
        'outline-color',
        'text-decoration-color',
        'column-rule-color',
        'caret-color',
        'fill',
        'stroke',
        'stop-color',
        'flood-color',
        'box-shadow',
        'text-shadow',
        'background-image'
    ];

    const collectValue = value => {
        if (!value || value === 'none' || value === 'transparent') return;
        String(value).match(colorTokenPattern)?.forEach(color => rawColors.add(color));
    };

    const collectRules = rules => {
        for (const rule of Array.from(rules || [])) {
            try {
                if (rule.style) {
                    for (let index = 0; index < rule.style.length; index += 1) {
                        collectValue(rule.style.getPropertyValue(rule.style.item(index)));
                    }
                }
                if (rule.cssRules) collectRules(rule.cssRules);
            } catch (_) {
                // Cross-origin or changing stylesheets can be skipped.
            }
        }
    };

    for (const stylesheet of Array.from(document.styleSheets)) {
        try {
            collectRules(stylesheet.cssRules);
        } catch (_) {
            // Cross-origin stylesheets can be skipped.
        }
    }

    const elements = document.querySelectorAll('*');
    for (const element of elements) {
        const computed = getComputedStyle(element);
        colorProperties.forEach(property => collectValue(computed.getPropertyValue(property)));
        collectValue(element.getAttribute('style'));
        ['fill', 'stroke', 'color', 'stop-color', 'flood-color', 'lighting-color']
            .forEach(attribute => collectValue(element.getAttribute(attribute)));
    }

    const normalizeColor = token => {
        const probe = document.createElement('span');
        probe.style.color = token;
        if (!probe.style.color || !document.body) return null;

        document.body.appendChild(probe);
        const computed = getComputedStyle(probe).color;
        probe.remove();

        const match = computed.match(
            /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)$/i
        );
        if (!match || (match[4] !== undefined && Number(match[4]) === 0)) return null;

        return `#${[match[1], match[2], match[3]]
            .map(channel => Number(channel).toString(16).padStart(2, '0'))
            .join('')}`;
    };

    return Array.from(rawColors)
        .map(normalizeColor)
        .filter(Boolean)
        .filter((color, index, colors) => colors.indexOf(color) === index)
        .sort();
}

async function addColorsFromCurrentPage() {
    const confirmed = window.confirm(
        'Crunchyroll must be open in the active tab. This reads all colors from the currently open Crunchyroll page and adds any colors that are not already listed. Continue?'
    );
    if (!confirmed) return;

    const button = document.getElementById('btn-add-page-colors');
    if (button) button.disabled = true;

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id || !isCrunchyrollUrl(tab.url)) {
            window.alert('Please open a Crunchyroll page in the active tab first.');
            return;
        }

        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: collectColorsFromCurrentPage
        });
        const pageColors = results?.[0]?.result ?? [];
        const colorList = document.getElementById('list-colors');
        if (!colorList || pageColors.length === 0) {
            window.alert('No colors were found on the current Crunchyroll page.');
            return;
        }

        const currentMappings = getColorMappings();
        const existingColors = new Set(
            currentMappings
                .map(mapping => mapping.from?.toLowerCase())
                .filter(Boolean)
        );
        const firstAddedAt = getNextAddedAt(currentMappings);
        const newMappings = pageColors
            .filter(color => !existingColors.has(color.toLowerCase()))
            .map((color, index) => ({
                from: color,
                to: color,
                addedAt: firstAddedAt + index
            }));

        if (newMappings.length === 0) {
            window.alert('All detected colors are already listed.');
            return;
        }

        renderColorMappings([...currentMappings, ...newMappings]);
        saveColorMappings();
        window.alert(`${newMappings.length} new colors were added.`);
    } catch (error) {
        console.error('CR-Toolkit: Could not collect Crunchyroll colors', error);
        window.alert('The colors could not be collected. Is a Crunchyroll page open in the active tab?');
    } finally {
        if (button) button.disabled = false;
    }
}

function saveColorMappings() {
    const colorList = document.getElementById("list-colors");
    if (!colorList) return;

    const mappings = getColorMappings();

    chrome.storage.sync.set({ color_mappings: mappings });
}

function getColorMappings() {
    const colorList = document.getElementById("list-colors");
    if (!colorList) return [];

    return Array.from(colorList.querySelectorAll('.color-row'))
        .map((row, index) => ({
            from: row.querySelector('.color-from')?.value,
            to: row.querySelector('.color-to')?.value,
            addedAt: Number.isFinite(Number(row.dataset.addedAt))
                ? Number(row.dataset.addedAt)
                : index
        }))
        .filter(mapping => mapping.from && mapping.to);
}

function getNextAddedAt(mappings) {
    const highest = mappings.reduce(
        (max, mapping) => Math.max(max, Number(mapping.addedAt) || 0),
        -1
    );
    return highest + 1;
}

function normalizeStoredMappings(mappings) {
    if (!Array.isArray(mappings)) return [];

    return mappings
        .map((mapping, index) => ({
            from: mapping?.from,
            to: mapping?.to,
            addedAt: Number.isFinite(Number(mapping?.addedAt))
                ? Number(mapping.addedAt)
                : index
        }))
        .filter(mapping => mapping.from && mapping.to);
}

function getColorSortKey(color) {
    const match = String(color).match(/^#([0-9a-f]{6})$/i);
    if (!match) return [Number.POSITIVE_INFINITY, 0, 0];

    const red = Number.parseInt(match[1].slice(0, 2), 16) / 255;
    const green = Number.parseInt(match[1].slice(2, 4), 16) / 255;
    const blue = Number.parseInt(match[1].slice(4, 6), 16) / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const lightness = (max + min) / 2;

    if (max === min) return [360, 0, lightness];

    const difference = max - min;
    const saturation = lightness > 0.5
        ? difference / (2 - max - min)
        : difference / (max + min);
    let hue;

    if (max === red) hue = (green - blue) / difference + (green < blue ? 6 : 0);
    else if (max === green) hue = (blue - red) / difference + 2;
    else hue = (red - green) / difference + 4;

    return [hue * 60, saturation, lightness];
}

function sortColorMappings(mappings) {
    const normalized = normalizeStoredMappings(mappings);
    const sortMode = document.getElementById('color-sort')?.value ?? 'added';

    return normalized
        .map((mapping, index) => ({ mapping, index }))
        .sort((first, second) => {
            if (sortMode !== 'color') {
                return first.mapping.addedAt - second.mapping.addedAt ||
                    first.index - second.index;
            }

            const firstKey = getColorSortKey(first.mapping.from);
            const secondKey = getColorSortKey(second.mapping.from);
            for (let index = 0; index < firstKey.length; index += 1) {
                if (firstKey[index] !== secondKey[index]) {
                    return firstKey[index] - secondKey[index];
                }
            }

            return first.mapping.addedAt - second.mapping.addedAt ||
                first.index - second.index;
        })
        .map(entry => entry.mapping);
}

function renderColorMappings(mappings) {
    const colorList = document.getElementById("list-colors");
    if (!colorList) return;

    colorList.replaceChildren();
    colorCounter = 0;

    if (!Array.isArray(mappings) || mappings.length === 0) {
        const placeholder = document.createElement('span');
        placeholder.className = 'small';
        placeholder.textContent = 'Add the colors you want to change';
        colorList.appendChild(placeholder);
        return;
    }

    sortColorMappings(mappings).forEach(mapping => addColorRow(mapping));
}

function addColorRow(mapping = {}) {
    const colorList = document.getElementById("list-colors");
    if (!colorList) return;

    colorList.querySelector('.small')?.remove();

    colorCounter += 1;
    const row = document.createElement('div');
    row.className = 'color-row';
    row.dataset.addedAt = Number.isFinite(Number(mapping.addedAt))
        ? String(mapping.addedAt)
        : String(Date.now());

    const from = document.createElement('input');
    from.type = 'color';
    from.className = 'color-from';
    from.name = `color-from-${colorCounter}`;
    from.id = `color-from-${colorCounter}`;
    from.value = mapping.from || DEFAULT_FROM_COLOR;

    const sep = document.createElement('span');
    sep.textContent = '→';

    const to = document.createElement('input');
    to.type = 'color';
    to.className = 'color-to';
    to.name = `color-to-${colorCounter}`;
    to.id = `color-to-${colorCounter}`;
    to.value = mapping.to || DEFAULT_TO_COLOR;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => {
        row.remove();

        if (!colorList.querySelector('.color-row')) {
            renderColorMappings([]);
        }

        saveColorMappings();
    });

    from.addEventListener('input', saveColorMappings);
    to.addEventListener('input', saveColorMappings);
    from.addEventListener('change', () => {
        if (document.getElementById('color-sort')?.value === 'color') {
            const mappings = getColorMappings();
            renderColorMappings(mappings);
        }
        saveColorMappings();
    });

    row.append(from, sep, to, removeBtn);
    colorList.appendChild(row);
}

function addNewColor() {
    const mappings = getColorMappings();
    mappings.push({
        from: DEFAULT_FROM_COLOR,
        to: DEFAULT_TO_COLOR,
        addedAt: getNextAddedAt(mappings)
    });
    renderColorMappings(mappings);
    saveColorMappings();
}
