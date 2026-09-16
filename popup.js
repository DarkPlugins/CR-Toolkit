const DEFAULT_ACCENT_COLOR = '#ff6f00';

function query(root, selector) {
    return root === document ? document.querySelector(selector) : root.querySelector(selector);
}

function queryAll(root, selector) {
    return root === document ? document.querySelectorAll(selector) : root.querySelectorAll(selector);
}

function updateHeaderChildrenState(children, enabled, root) {
    children.forEach(cb => {
        cb.disabled = !enabled;

        const label = query(root, `label[for="${cb.id}"]`);
        if (label) {
            label.style.pointerEvents = enabled ? "auto" : "none";
            label.style.opacity = enabled ? "1" : "0.4";
        }
    });
}

function applyAccentColor(root, value) {
    const accent = /^#[0-9a-f]{6}$/i.test(value) ? value : DEFAULT_ACCENT_COLOR;
    const channels = accent.slice(1).match(/.{2}/g).map(channel => Number.parseInt(channel, 16));
    const rgba = alpha => `rgba(${channels.join(', ')}, ${alpha})`;
    const documentRoot = root === document
        ? document.documentElement
        : root.host?.ownerDocument?.documentElement;
    documentRoot?.style.setProperty('--cr-toolkit-accent', accent);
    documentRoot?.style.setProperty('--cr-toolkit-accent-border', rgba(0.8));
    documentRoot?.style.setProperty('--cr-toolkit-accent-soft', rgba(0.12));
    documentRoot?.style.setProperty('--cr-toolkit-accent-focus', rgba(0.16));
    documentRoot?.style.setProperty('--cr-toolkit-accent-glow', rgba(0.2));

    const settings = root.querySelector('.cr-toolkit-settings');
    settings?.style.setProperty('--primary-accent', accent);
    settings?.style.setProperty('--accent-strong', accent);
    settings?.style.setProperty('--accent-soft', rgba(0.14));
    settings?.style.setProperty('--accent-border', rgba(0.35));
    settings?.style.setProperty('--accent-checked-border', rgba(0.7));
    settings?.style.setProperty('--accent-glow', rgba(0.24));
}

function initPopup(root = document) {
    if (root.__crToolkitPopupInitialized) return;
    root.__crToolkitPopupInitialized = true;

    const featureDefaults = {
        player_resize: true,
        auto_skip: true,
        better_search: true,
        better_search_icons: false,
        better_calender: true,
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
        checkbox: query(root, `#toggle-${feature.replaceAll('_', '-')}`)
    }));
    const headerChildren = featureCheckboxes
        .filter(({ key }) => key.startsWith('enabled_change_header_'))
        .map(({ checkbox }) => checkbox);
    const headerCheckbox = query(root, '#toggle-change-header');
    const betterSearchCheckbox = query(root, '#toggle-better-search');
    const betterSearchChildren = [query(root, '#toggle-better-search-icons')].filter(Boolean);
    const btnAddNewColor = query(root, '#btn-add-color');
    const btnAddPageColors = query(root, '#btn-add-page-colors');
    const colorSort = query(root, '#color-sort');
    const accentColor = query(root, '#accent-color');
    const resetAccentColor = query(root, '#reset-accent-color');

    const navButtons = queryAll(root, ".nav-btn");
    const sections = queryAll(root, ".section-page");

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
        "active_popup_section", "color_mappings", "color_sort_order", "popup_accent_color"
    ], data => {
        featureCheckboxes.forEach(({ key, fallback, checkbox }) => {
            if (checkbox) checkbox.checked = data[key] ?? fallback;
        });
        if (headerCheckbox) updateHeaderChildrenState(headerChildren, headerCheckbox.checked, root);
        if (betterSearchCheckbox) updateHeaderChildrenState(betterSearchChildren, betterSearchCheckbox.checked, root);
        if (colorSort) colorSort.value = data.color_sort_order === 'color' ? 'color' : 'added';
        if (accentColor) accentColor.value = data.popup_accent_color || DEFAULT_ACCENT_COLOR;
        applyAccentColor(root, data.popup_accent_color);
        renderColorMappings(data.color_mappings, root);
        showSection(data.active_popup_section ?? "s-general", false);
    });

    // Navigation
    navButtons.forEach((button) => {
        button.addEventListener("click", () => {
            showSection(button.dataset.section);
        });
    });

    featureCheckboxes.forEach(({ key, checkbox }) => {
        if (!checkbox) return;
        checkbox.addEventListener("change", () => {
            chrome.storage.sync.set({ [key]: checkbox.checked });
            if (checkbox === headerCheckbox) {
                updateHeaderChildrenState(headerChildren, checkbox.checked, root);
            }
            if (checkbox === betterSearchCheckbox) {
                updateHeaderChildrenState(betterSearchChildren, checkbox.checked, root);
            }
        });
    });

    if (btnAddNewColor) {
        btnAddNewColor.addEventListener('click', () => addNewColor(root));
    }

    if (btnAddPageColors) {
        btnAddPageColors.addEventListener('click', () => addColorsFromCurrentPage(root));
    }

    if (colorSort) {
        colorSort.addEventListener('change', () => {
            chrome.storage.sync.set({ color_sort_order: colorSort.value });
            renderColorMappings(getColorMappings(root), root);
        });
    }

    if (accentColor) {
        accentColor.addEventListener('input', () => {
            applyAccentColor(root, accentColor.value);
        });
        accentColor.addEventListener('change', () => {
            const value = /^#[0-9a-f]{6}$/i.test(accentColor.value)
                ? accentColor.value
                : DEFAULT_ACCENT_COLOR;
            chrome.storage.sync.set({ popup_accent_color: value });
            applyAccentColor(root, value);
        });
    }

    if (resetAccentColor && accentColor) {
        resetAccentColor.addEventListener('click', () => {
            const defaultAccent = DEFAULT_ACCENT_COLOR;
            accentColor.value = defaultAccent;
            chrome.storage.sync.set({ popup_accent_color: defaultAccent });
            applyAccentColor(root, defaultAccent);
        });
    }
}

window.CRToolkit = window.CRToolkit || {};
window.CRToolkit.Popup = window.CRToolkit.Popup || { init: initPopup };

if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", () => initPopup());
} else if (document.querySelector('#toggle-player-resize')) {
    initPopup();
}

let colorCounter = 0;
const DEFAULT_FROM_COLOR = '#FF640A';
const DEFAULT_TO_COLOR = '#b7183e';

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

async function addColorsFromCurrentPage(root = document) {
    const confirmed = window.confirm(
        'Crunchyroll must be open in the active tab. This reads all colors from the currently open Crunchyroll page and adds any colors that are not already listed. Continue?'
    );
    if (!confirmed) return;

    const button = query(root, '#btn-add-page-colors');
    if (button) button.disabled = true;

    try {
        const pageColors = collectColorsFromCurrentPage();
        const colorList = query(root, '#list-colors');
        if (!colorList || pageColors.length === 0) {
            window.alert('No colors were found on the current Crunchyroll page.');
            return;
        }

        const currentMappings = getColorMappings(root);
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

        renderColorMappings([...currentMappings, ...newMappings], root);
        if (await saveColorMappings(root)) {
            window.alert(`${newMappings.length} new colors were added.`);
        } else {
            renderColorMappings(currentMappings, root);
        }
    } catch (error) {
        console.error('CR-Toolkit: Could not collect Crunchyroll colors', error);
        window.alert('The colors could not be collected. Is a Crunchyroll page open in the active tab?');
    } finally {
        if (button) button.disabled = false;
    }
}

async function saveColorMappings(root = document) {
    const colorList = query(root, '#list-colors');
    if (!colorList) return;

    const mappings = getColorMappings(root);

    try {
        await chrome.storage.sync.set({ color_mappings: mappings });
        return true;
    } catch (error) {
        console.error('CR-Toolkit: Could not save color mappings', error);
        window.alert('The colors could not be saved. The browser sync storage may be full. Remove some color mappings and try again.');
        return false;
    }
}

function getColorMappings(root = document) {
    const colorList = query(root, '#list-colors');
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

function sortColorMappings(mappings, root = document) {
    const normalized = normalizeStoredMappings(mappings);
    const sortMode = query(root, '#color-sort')?.value ?? 'added';

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

function renderColorMappings(mappings, root = document) {
    const colorList = query(root, '#list-colors');
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

    sortColorMappings(mappings, root).forEach(mapping => addColorRow(mapping, root));
}

function addColorRow(mapping = {}, root = document) {
    const colorList = query(root, '#list-colors');
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
            renderColorMappings([], root);
        }

        saveColorMappings(root);
    });

    to.addEventListener('change', () => saveColorMappings(root));
    from.addEventListener('change', () => {
        if (query(root, '#color-sort')?.value === 'color') {
            const mappings = getColorMappings(root);
            renderColorMappings(mappings, root);
        }
        saveColorMappings(root);
    });

    row.append(from, sep, to, removeBtn);
    colorList.appendChild(row);
}

function addNewColor(root = document) {
    const mappings = getColorMappings(root);
    mappings.push({
        from: DEFAULT_FROM_COLOR,
        to: DEFAULT_TO_COLOR,
        addedAt: getNextAddedAt(mappings)
    });
    renderColorMappings(mappings, root);
    saveColorMappings(root);
}
