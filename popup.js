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
    const featureDefaults = {
        player_resize: true,
        auto_skip: true,
        better_search: true,
        hide_header: false,
        change_header: false,
        change_header_logo: false,
        change_header_new: false,
        change_header_popular: false,
        change_header_simulcast: false,
        change_header_categories: false,
        change_header_games: false,
        change_header_store: false,
        change_header_news: false
    };
    const featureCheckboxes = Object.entries(featureDefaults).map(([feature, fallback]) => ({
        key: `enabled_${feature}`,
        fallback,
        checkbox: document.getElementById(`toggle-${feature.replaceAll('_', '-')}`)
    }));
    const headerChildren = featureCheckboxes
        .filter(({ key }) => key.startsWith('enabled_change_header_'))
        .map(({ checkbox }) => checkbox);
    const headerCheckbox = document.getElementById('toggle-change-header');
    const btnAddNewColor = document.getElementById('btn-add-color');
    const btnAddPageColors = document.getElementById('btn-add-page-colors');
    const colorSort = document.getElementById('color-sort');

    const navButtons = document.querySelectorAll(".nav-btn");
    const sections = document.querySelectorAll(".section-page");

    function showSection(sectionId, persist = true) {
        if (!Array.from(sections).some(section => section.id === sectionId)) {
            sectionId = "s-general";
        }
        sections.forEach((section) => {
            section.classList.toggle("active", section.id === sectionId);
        });

        navButtons.forEach((button) => {
            button.classList.toggle(
                "active",
                button.dataset.section === sectionId
            );
        });

        if (persist) chrome.storage.sync.set({ active_popup_section: sectionId });
    }

    chrome.storage.sync.get([
        ...featureCheckboxes.map(({ key }) => key),
        "active_popup_section", "color_mappings", "color_sort_order"
    ], data => {
        featureCheckboxes.forEach(({ key, fallback, checkbox }) => {
            checkbox.checked = data[key] ?? fallback;
        });
        updateHeaderChildrenState(headerChildren, headerCheckbox.checked);
        colorSort.value = data.color_sort_order === 'color' ? 'color' : 'added';
        renderColorMappings(data.color_mappings);
        showSection(data.active_popup_section ?? "s-general", false);
    });

    // Navigation
    navButtons.forEach((button) => {
        button.addEventListener("click", () => {
            showSection(button.dataset.section);
        });
    });

    featureCheckboxes.forEach(({ key, checkbox }) => {
        checkbox.addEventListener("change", () => {
            chrome.storage.sync.set({ [key]: checkbox.checked });
            if (checkbox === headerCheckbox) {
                updateHeaderChildrenState(headerChildren, checkbox.checked);
            }
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

    return [...new Set(Array.from(rawColors).map(normalizeColor).filter(Boolean))].sort();
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
        if (await saveColorMappings()) {
            window.alert(`${newMappings.length} new colors were added.`);
        } else {
            renderColorMappings(currentMappings);
        }
    } catch (error) {
        console.error('CR-Toolkit: Could not collect Crunchyroll colors', error);
        window.alert('The colors could not be collected. Is a Crunchyroll page open in the active tab?');
    } finally {
        if (button) button.disabled = false;
    }
}

async function saveColorMappings() {
    const colorList = document.getElementById("list-colors");
    if (!colorList) return;

    const mappings = getColorMappings();

    try {
        await chrome.storage.sync.set({ color_mappings: mappings });
        return true;
    } catch (error) {
        console.error('CR-Toolkit: Could not save color mappings', error);
        window.alert('The colors could not be saved. The browser sync storage may be full. Remove some color mappings and try again.');
        return false;
    }
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
        .map((mapping, index) => ({ mapping, index, colorKey: sortMode === 'color' ? getColorSortKey(mapping.from) : null }))
        .sort((first, second) => {
            if (sortMode !== 'color') {
                return first.mapping.addedAt - second.mapping.addedAt ||
                    first.index - second.index;
            }

            const firstKey = first.colorKey;
            const secondKey = second.colorKey;
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
    from.setAttribute('aria-label', 'Original color');

    const sep = document.createElement('span');
    sep.textContent = '→';

    const to = document.createElement('input');
    to.type = 'color';
    to.className = 'color-to';
    to.name = `color-to-${colorCounter}`;
    to.id = `color-to-${colorCounter}`;
    to.value = mapping.to || DEFAULT_TO_COLOR;
    to.setAttribute('aria-label', 'Replacement color');

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '✕';
    removeBtn.setAttribute('aria-label', 'Remove color mapping');
    removeBtn.addEventListener('click', () => {
        row.remove();

        if (!colorList.querySelector('.color-row')) {
            renderColorMappings([]);
        }

        saveColorMappings();
    });

    to.addEventListener('change', saveColorMappings);
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
