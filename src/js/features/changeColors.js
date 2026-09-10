(() => {
const COLOR_STORAGE_KEY = "color_mappings";
const COLOR_TOKEN_PATTERN = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi;
const PRESENTATION_ATTRIBUTES = [
    "fill",
    "stroke",
    "color",
    "stop-color",
    "flood-color",
    "lighting-color"
];

let initialized = false;
let colorMappings = [];
let mutationObserver = null;
let stylesheetTimer = null;
let applying = false;

// Keep the original declarations so changing/removing a mapping can restore them.
const stylesheetOverrides = new Map();
const inlineStyleOverrides = new Map();
const attributeOverrides = new Map();

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function parseNumber(value, percentageScale = 1) {
    const number = Number.parseFloat(value);
    if (!Number.isFinite(number)) return null;

    return value.trim().endsWith("%")
        ? (number / 100) * percentageScale
        : number;
}

function parseColorToken(value) {
    const token = value.trim().toLowerCase();

    if (token.startsWith("#")) {
        const hex = token.slice(1);
        if (![3, 4, 6, 8].includes(hex.length) || !/^[0-9a-f]+$/.test(hex)) {
            return null;
        }

        const expanded = hex.length <= 4
            ? hex.split("").map(part => part + part).join("")
            : hex;

        return {
            r: Number.parseInt(expanded.slice(0, 2), 16),
            g: Number.parseInt(expanded.slice(2, 4), 16),
            b: Number.parseInt(expanded.slice(4, 6), 16),
            a: expanded.length === 8
                ? Number.parseInt(expanded.slice(6, 8), 16) / 255
                : 1
        };
    }

    const functionMatch = token.match(/^(rgba?|hsla?)\((.*)\)$/i);
    if (!functionMatch) return null;

    const type = functionMatch[1].toLowerCase();
    const parts = functionMatch[2].includes(",")
        ? functionMatch[2].split(",").map(part => part.trim())
        : functionMatch[2]
            .replace(/\//g, " / ")
            .split(/\s+/)
            .filter(part => part && part !== "/");

    if (parts.length < 3) return null;

    if (type.startsWith("rgb")) {
        const rawChannels = parts.slice(0, 3).map(part => parseNumber(part, 255));
        if (rawChannels.some(channel => channel === null)) return null;
        const channels = rawChannels.map(channel => clamp(channel, 0, 255));

        const alpha = parts[3] === undefined
            ? 1
            : clamp(parseNumber(parts[3]), 0, 1);

        return alpha === null
            ? null
            : { r: channels[0], g: channels[1], b: channels[2], a: alpha };
    }

    const hue = Number.parseFloat(parts[0]);
    const saturation = parseNumber(parts[1]);
    const lightness = parseNumber(parts[2]);
    if (!Number.isFinite(hue) || saturation === null || lightness === null) {
        return null;
    }

    const h = ((hue % 360) + 360) % 360 / 360;
    const s = clamp(saturation, 0, 1);
    const l = clamp(lightness, 0, 1);
    const chroma = (1 - Math.abs(2 * l - 1)) * s;
    const x = chroma * (1 - Math.abs((h * 6) % 2 - 1));
    const match = h < 1 / 6
        ? [chroma, x, 0]
        : h < 2 / 6
            ? [x, chroma, 0]
            : h < 3 / 6
                ? [0, chroma, x]
                : h < 4 / 6
                    ? [0, x, chroma]
                    : h < 5 / 6
                        ? [x, 0, chroma]
                        : [chroma, 0, x];
    const offset = l - chroma / 2;
    const alpha = parts[3] === undefined
        ? 1
        : clamp(parseNumber(parts[3]), 0, 1);

    return alpha === null
        ? null
        : {
            r: Math.round((match[0] + offset) * 255),
            g: Math.round((match[1] + offset) * 255),
            b: Math.round((match[2] + offset) * 255),
            a: alpha
        };
}

function colorToHex(color) {
    if (!color) return null;

    return `#${[color.r, color.g, color.b]
        .map(channel => Math.round(channel).toString(16).padStart(2, "0"))
        .join("")}`;
}

function colorsMatch(first, second) {
    return first && second &&
        first.r === second.r &&
        first.g === second.g &&
        first.b === second.b &&
        (second.a >= 0.99 || Math.abs(first.a - second.a) < 0.01);
}

function normalizeMappings(value) {
    if (!Array.isArray(value)) return [];

    return value.reduce((mappings, mapping) => {
        const from = parseColorToken(mapping?.from || "");
        const to = parseColorToken(mapping?.to || "");
        if (!from || !to) return mappings;

        mappings.push({
            from: colorToHex(from),
            to: colorToHex(to),
            fromColor: from,
            toColor: to
        });
        return mappings;
    }, []);
}

function formatReplacement(mapping, sourceColor) {
    if (sourceColor.a >= 0.99) return mapping.to;

    return `rgba(${mapping.toColor.r}, ${mapping.toColor.g}, ${mapping.toColor.b}, ${sourceColor.a})`;
}

function replaceColorTokens(value) {
    if (!value || !colorMappings.length) return value;

    return value.replace(COLOR_TOKEN_PATTERN, token => {
        const sourceColor = parseColorToken(token);
        if (!sourceColor) return token;

        const mapping = colorMappings.find(candidate =>
            colorsMatch(sourceColor, candidate.fromColor)
        );

        return mapping ? formatReplacement(mapping, sourceColor) : token;
    });
}

function restoreStylesheetOverrides() {
    for (const [style, properties] of stylesheetOverrides) {
        for (const [property, original] of properties) {
            try {
                if (
                    style.getPropertyValue(property) === original.appliedValue &&
                    style.getPropertyPriority(property) === original.priority
                ) {
                    style.setProperty(property, original.value, original.priority);
                }
            } catch (_) {
                // Stylesheets can disappear while Crunchyroll changes views.
            }
        }
    }
    stylesheetOverrides.clear();
}

function restoreInlineStyleOverrides() {
    for (const [element, original] of inlineStyleOverrides) {
        try {
            if (element.getAttribute("style") !== original.appliedValue) continue;
            if (original.value) element.setAttribute("style", original.value);
            else element.removeAttribute("style");
        } catch (_) {
            // The element may have been removed during a route change.
        }
    }
    inlineStyleOverrides.clear();
}

function restoreAttributeOverrides() {
    for (const [element, attributes] of attributeOverrides) {
        for (const [attribute, original] of attributes) {
            try {
                if (element.getAttribute(attribute) !== original.appliedValue) continue;
                if (original.original === null) element.removeAttribute(attribute);
                else element.setAttribute(attribute, original.original);
            } catch (_) {
                // The element may have been removed during a route change.
            }
        }
    }
    attributeOverrides.clear();
}

function processStyleDeclaration(style) {
    let properties = stylesheetOverrides.get(style);

    for (let index = 0; index < style.length; index += 1) {
        const property = style.item(index);
        const value = style.getPropertyValue(property);
        const priority = style.getPropertyPriority(property);
        const previous = properties?.get(property);

        // Ignore mutations caused by this feature itself.
        if (previous && value === previous.appliedValue && priority === previous.priority) {
            continue;
        }

        if (previous) properties.delete(property);

        const replacement = replaceColorTokens(value);
        if (replacement === value) continue;

        if (!properties) {
            properties = new Map();
            stylesheetOverrides.set(style, properties);
        }

        properties.set(property, {
            value,
            priority,
            appliedValue: replacement
        });

        try {
            style.setProperty(property, replacement, priority);
        } catch (_) {
            properties.delete(property);
        }
    }
}

function processRules(rules) {
    for (const rule of Array.from(rules || [])) {
        try {
            if (rule.style) processStyleDeclaration(rule.style);
            if (rule.cssRules) processRules(rule.cssRules);
        } catch (_) {
            // A single inaccessible nested rule must not stop other rules.
        }
    }
}

function processStylesheets() {
    if (!colorMappings.length) return;

    for (const stylesheet of Array.from(document.styleSheets)) {
        try {
            processRules(stylesheet.cssRules);
        } catch (_) {
            // Cross-origin stylesheets cannot be inspected by the browser.
        }
    }
}

function processInlineStyle(element) {
    if (!element.hasAttribute("style")) return;

    const value = element.getAttribute("style") || "";
    const previous = inlineStyleOverrides.get(element);

    if (previous && value === previous.appliedValue) return;
    if (previous) inlineStyleOverrides.delete(element);

    const replacement = replaceColorTokens(value);
    if (replacement === value) return;

    inlineStyleOverrides.set(element, { value, appliedValue: replacement });
    element.setAttribute("style", replacement);
}

function processPresentationAttribute(element, attribute) {
    if (!element.hasAttribute(attribute)) return;

    const value = element.getAttribute(attribute);
    let attributes = attributeOverrides.get(element);
    const previous = attributes?.get(attribute);

    if (previous && value === previous.appliedValue) return;
    if (previous) attributes.delete(attribute);

    const replacement = replaceColorTokens(value);
    if (replacement === value) return;

    if (!attributes) {
        attributes = new Map();
        attributeOverrides.set(element, attributes);
    }

    attributes.set(attribute, { original: value, appliedValue: replacement });
    element.setAttribute(attribute, replacement);
}

function processElement(element) {
    if (!(element instanceof Element)) return;

    processInlineStyle(element);
    for (const attribute of PRESENTATION_ATTRIBUTES) {
        processPresentationAttribute(element, attribute);
    }
}

function processDocumentElements() {
    processElement(document.documentElement);
    for (const element of document.querySelectorAll(
        `[style],${PRESENTATION_ATTRIBUTES.map(attribute => `[${attribute}]`).join(",")}`
    )) {
        processElement(element);
    }
}

function processAddedNode(node) {
    if (!(node instanceof Element)) return;

    processElement(node);
    for (const element of node.querySelectorAll(
        `[style],${PRESENTATION_ATTRIBUTES.map(attribute => `[${attribute}]`).join(",")}`
    )) {
        processElement(element);
    }
}

function scheduleStylesheetProcessing() {
    if (stylesheetTimer) return;

    stylesheetTimer = setTimeout(() => {
        stylesheetTimer = null;
        processStylesheets();
    }, 0);
}

function observeChanges() {
    if (mutationObserver || !document.documentElement) return;

    mutationObserver = new MutationObserver(mutations => {
        if (applying || !colorMappings.length) return;

        let stylesheetChanged = false;

        for (const mutation of mutations) {
            if (mutation.type === "childList") {
                stylesheetChanged = stylesheetChanged || mutation.addedNodes.length > 0;
                mutation.addedNodes.forEach(processAddedNode);
            } else if (mutation.type === "attributes") {
                if (mutation.attributeName === "style") {
                    processInlineStyle(mutation.target);
                } else {
                    processPresentationAttribute(mutation.target, mutation.attributeName);
                }
            }
        }

        if (stylesheetChanged) scheduleStylesheetProcessing();
    });

    mutationObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", ...PRESENTATION_ATTRIBUTES]
    });
}

function applyColorMappings(value) {
    applying = true;
    restoreStylesheetOverrides();
    restoreInlineStyleOverrides();
    restoreAttributeOverrides();

    colorMappings = normalizeMappings(value);
    if (colorMappings.length) {
        processStylesheets();
        processDocumentElements();
    }

    applying = false;
}

function initChangeColors() {
    if (initialized) return;
    initialized = true;

    observeChanges();
    chrome.storage.sync.get([COLOR_STORAGE_KEY], data => {
        applyColorMappings(data[COLOR_STORAGE_KEY]);
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "sync" || !changes[COLOR_STORAGE_KEY]) return;
        applyColorMappings(changes[COLOR_STORAGE_KEY].newValue);
    });
}

window.CRToolkit = window.CRToolkit || {};
window.CRToolkit.ChangeColors = window.CRToolkit.ChangeColors || {};
window.CRToolkit.ChangeColors.init = initChangeColors;
})();
