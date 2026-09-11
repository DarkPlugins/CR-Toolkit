(() => {
    if (window.__CRToolkitBetterSearchInstalled) {
        return;
    }

    window.__CRToolkitBetterSearchInstalled = true;

    const STORAGE_KEY = "cr-better-search-filters";
    const SEARCH_API_PATH = "/content/v2/discover/search";
    const EXACT_CARD_SELECTOR = [
        '[data-t="search-series-card"]',
        '[data-t="search-movie-card"]',
        '[data-testid="search-series-card"]',
        '[data-testid="search-movie-card"]'
    ].join(", ");
    const FALLBACK_CARD_SELECTOR = [
        '[data-t*="search"][data-t*="card"]',
        '[data-testid*="search"][data-testid*="card"]'
    ].join(", ");

    const LANGUAGES = {
        "": "All",
        "en-US": "English",
        "de-DE": "German",
        "fr-FR": "French",
        "es-ES": "Spanish",
        "es-419": "Spanish (Latin America)",
        "it-IT": "Italian",
        "pt-BR": "Portuguese (Brazil)",
        "pt-PT": "Portuguese (Portugal)",
        "ru-RU": "Russian",
        "ar-SA": "Arabic",
        "ja-JP": "Japanese",
        "ko-KR": "Korean",
        "zh-CN": "Chinese (Simplified)",
        "zh-TW": "Chinese (Traditional)",
        "hi-IN": "Hindi",
        "pl-PL": "Polish",
        "tr-TR": "Turkish",
        "nl-NL": "Dutch",
        "sv-SE": "Swedish",
        "da-DK": "Danish",
        "nb-NO": "Norwegian",
        "fi-FI": "Finnish",
        "cs-CZ": "Czech",
        "hu-HU": "Hungarian",
        "ro-RO": "Romanian",
        "uk-UA": "Ukrainian",
        "el-GR": "Greek",
        "he-IL": "Hebrew",
        "id-ID": "Indonesian",
        "ms-MY": "Malay",
        "th-TH": "Thai",
        "vi-VN": "Vietnamese"
    };

    let dubFilter = "";
    let subFilter = "";
    let onlyDub = false;
    let onlySub = false;
    let betterSearchEnabled = true;
    const searchCache = new Map();
    const recordsById = new Map();
    const recordsByTitle = new Map();
    const MAX_CACHE_RECORDS = 500;
    let applyTimer = null;
    let initialized = false;
    let lastSearchQuery = "";
    let searchPagePath = window.location.pathname;
    let settingsPanel = null;
    let settingsBackdrop = null;
    let settingsToggle = null;

    function initBetterSearch() {
        if (!initialized) {
            initialized = true;
            loadFilters();
            observePage();
            observeSearchInput();
            observeHistory();
        }

        syncSearchPage(true);
        scheduleApply();
    }

    function loadFilters() {
        try {
            const data = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "{}"
            );

            dubFilter = validLanguage(data.dub) ? data.dub : "";
            subFilter = validLanguage(data.sub) ? data.sub : "";
            onlyDub = Boolean(data.onlyDub);
            onlySub = Boolean(data.onlySub);
        } catch (error) {
            dubFilter = "";
            subFilter = "";
            onlyDub = false;
            onlySub = false;
        }
    }

    function saveFilters() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    dub: dubFilter,
                    sub: subFilter,
                    onlyDub,
                    onlySub
                })
            );
        } catch (error) {
            // Filters still work when browser storage is unavailable or full.
        }
    }

    function validLanguage(language) {
        return typeof language === "string" &&
            Object.prototype.hasOwnProperty.call(LANGUAGES, language);
    }

    function injectUI() {
        if (!betterSearchEnabled) {
            return false;
        }

        if (document.querySelector("#cr-better-search")) {
            return true;
        }

        if (!isSearchPage() || !document.body) {
            return false;
        }

        injectStyles();

        settingsPanel = document.createElement("section");
        settingsPanel.id = "cr-better-search";
        settingsPanel.setAttribute("role", "dialog");
        settingsPanel.setAttribute("aria-label", "Settings");

        settingsBackdrop = document.createElement("div");
        settingsBackdrop.id = "cr-better-search-backdrop";

        settingsToggle = document.createElement("button");
        settingsToggle.id = "cr-better-search-toggle";
        settingsToggle.type = "button";
        settingsToggle.setAttribute("aria-label", "Open search settings");
        settingsToggle.setAttribute("aria-expanded", "false");
        settingsToggle.title = "Settings";
        settingsToggle.appendChild(createSettingsIcon());

        const header = document.createElement("div");
        header.className = "cr-better-search-header";

        const headingGroup = document.createElement("div");
        const heading = document.createElement("h2");
        heading.textContent = "Settings";
        headingGroup.appendChild(heading);

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "cr-better-search-close";
        closeButton.setAttribute("aria-label", "Close search settings");
        closeButton.appendChild(createCloseIcon());
        closeButton.addEventListener("click", closeSettingsModal);

        header.append(headingGroup, closeButton);

        const description = document.createElement("p");
        description.className = "cr-better-search-description";
        description.textContent = "Filter results by available audio and subtitle languages.";

        const divider = document.createElement("div");
        divider.className = "cr-better-search-divider";

        settingsPanel.append(
            header,
            description,
            divider,
            createFilterControl(
                "Audio",
                dubFilter,
                onlyDub,
                (value, enabled) => {
                    dubFilter = value;
                    onlyDub = enabled;
                    saveFilters();
                    refreshResults();
                }
            ),
            createFilterControl(
                "Subtitles",
                subFilter,
                onlySub,
                (value, enabled) => {
                    subFilter = value;
                    onlySub = enabled;
                    saveFilters();
                    refreshResults();
                }
            )
        );

        settingsBackdrop.addEventListener("click", closeSettingsModal);
        settingsToggle.addEventListener("click", openSettingsModal);
        document.addEventListener("keydown", handleSettingsKeydown);
        window.addEventListener("resize", updateResponsiveLayout);

        document.body.append(settingsBackdrop, settingsPanel, settingsToggle);
        setSettingsRouteVisibility(true);
        updateResponsiveLayout();
        return true;
    }

    function createFilterControl(label, selected, enabled, onChange) {
        const wrapper = document.createElement("div");
        wrapper.className = "cr-better-search-filter";

        const title = document.createElement("span");
        title.className = "cr-better-search-filter-title";
        title.textContent = label;

        const checkboxLabel = document.createElement("label");
        checkboxLabel.className = "cr-better-search-checkbox";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = enabled;

        const picker = createLanguagePicker(
            label,
            selected,
            value => onChange(value, checkbox.checked)
        );

        const checkboxVisual = document.createElement("span");
        checkboxVisual.className = "cr-better-search-checkbox-visual";

        const checkboxText = document.createElement("span");
        checkboxText.textContent = "Only matching results";

        checkboxLabel.append(checkbox, checkboxVisual, checkboxText);
        checkbox.addEventListener("change", () => onChange(
            picker.dataset.value || "",
            checkbox.checked
        ));

        wrapper.append(title, picker, checkboxLabel);
        return wrapper;
    }

    function createLanguagePicker(label, selected, onChange) {
        const picker = document.createElement("div");
        picker.className = "cr-better-search-language-picker";
        picker.dataset.value = selected;

        const input = document.createElement("input");
        input.type = "search";
        input.className = "cr-better-search-language-input";
        input.setAttribute("aria-label", `${label} language`);
        input.setAttribute("autocomplete", "off");
        input.setAttribute("spellcheck", "false");

        const arrow = document.createElement("span");
        arrow.className = "cr-better-search-picker-arrow";
        arrow.appendChild(createChevronIcon());

        const list = document.createElement("div");
        list.className = "cr-better-search-language-list";
        list.setAttribute("role", "listbox");
        list.hidden = true;

        const renderSelectedValue = () => {
            input.value = LANGUAGES[picker.dataset.value] || LANGUAGES[""];
        };

        const renderOptions = filter => {
            const normalizedFilter = normalizeText(filter);
            list.replaceChildren();

            Object.entries(LANGUAGES)
                .filter(([code, name]) =>
                    !normalizedFilter ||
                    normalizeText(name).includes(normalizedFilter) ||
                    normalizeText(code).includes(normalizedFilter)
                )
                .forEach(([code, name]) => {
                    const option = document.createElement("button");
                    option.type = "button";
                    option.className = "cr-better-search-language-option";
                    option.setAttribute("role", "option");
                    option.dataset.value = code;
                    option.setAttribute("aria-selected", String(
                        code === picker.dataset.value
                    ));
                    option.textContent = name;
                    option.addEventListener("click", event => {
                        event.preventDefault();
                        picker.dataset.value = code;
                        renderSelectedValue();
                        list.hidden = true;
                        onChange(code);
                    });
                    list.appendChild(option);
                });

            list.hidden = list.childElementCount === 0;
        };

        input.addEventListener("focus", () => {
            input.select();
            renderOptions("");
        });
        input.addEventListener("input", () => renderOptions(input.value));
        input.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                list.hidden = true;
                renderSelectedValue();
            }
            if (event.key === "Enter") {
                const firstOption = list.querySelector("button");
                if (firstOption) {
                    event.preventDefault();
                    firstOption.click();
                }
            }
        });
        input.addEventListener("blur", () => {
            window.setTimeout(() => {
                if (!picker.contains(document.activeElement)) {
                    list.hidden = true;
                    renderSelectedValue();
                }
            }, 0);
        });

        picker.append(input, arrow, list);
        renderSelectedValue();

        return picker;
    }

    function injectStyles() {
        if (document.querySelector("#cr-better-search-styles")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "cr-better-search-styles";
        style.textContent = `
            :root {
                --cr-toolkit-accent: #ff6f00;
                --cr-toolkit-accent-border: rgba(255, 111, 0, 0.8);
                --cr-toolkit-accent-soft: rgba(255, 111, 0, 0.12);
                --cr-toolkit-accent-focus: rgba(255, 111, 0, 0.16);
                --cr-toolkit-accent-glow: rgba(255, 111, 0, 0.2);
            }

            #cr-better-search,
            #cr-better-search *,
            #cr-better-search-toggle,
            #cr-better-search-toggle * {
                box-sizing: border-box;
            }

            #cr-better-search {
                position: fixed;
                z-index: 2147483000;
                top: 50%;
                left: 18px;
                width: 292px;
                max-height: calc(100vh - 48px);
                padding: 17px;
                overflow: visible;
                color: #ffffff;
                font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                background: #151515;
                border: 1px solid #151515;
                border-radius: 20px;
                box-shadow: 0 10px 26px rgba(0, 0, 0, 0.2);
                backdrop-filter: blur(18px) saturate(105%);
                -webkit-backdrop-filter: blur(18px) saturate(105%);
                transform: translateY(-50%);
                display: none;
            }

            html.cr-better-search-wide #cr-better-search {
                color: #ffffff;
                background: #151515;
                border-color: #151515;
                box-shadow: 0 10px 26px rgba(0, 0, 0, 0.2);
            }

            html.cr-better-search-wide #cr-better-search {
                display: block;
            }

            #cr-better-search.is-route-hidden,
            #cr-better-search-toggle.is-route-hidden,
            #cr-better-search-backdrop.is-route-hidden {
                display: none !important;
            }

            html.cr-better-search-wide .cr-better-search-close {
                display: none;
            }

            #cr-better-search-toggle {
                position: fixed;
                z-index: 2147483001;
                right: 16px;
                bottom: 16px;
                width: 44px;
                height: 44px;
                align-items: center;
                justify-content: center;
                padding: 0;
                color: #3b3840;
                background: rgba(255, 255, 255, 0.9);
                border: 1px solid rgba(255, 255, 255, 0.78);
                border-radius: 14px;
                box-shadow: 0 10px 24px rgba(0, 0, 0, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.7);
                cursor: pointer;
                transform: none;
                transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
                display: none;
            }

            html:not(.cr-better-search-wide) #cr-better-search-toggle {
                display: flex;
            }

            #cr-better-search-toggle:hover,
            #cr-better-search-toggle:focus-visible {
                background: #ffffff;
                border-color: var(--cr-toolkit-accent-border);
                transform: scale(1.04);
                outline: none;
            }

            #cr-better-search-toggle svg {
                width: 21px;
                height: 21px;
            }

            #cr-better-search-backdrop {
                position: fixed;
                z-index: 2147482999;
                inset: 0;
                background: rgba(0, 0, 0, 0.52);
                backdrop-filter: blur(3px);
                -webkit-backdrop-filter: blur(3px);
                display: none;
            }

            #cr-better-search-backdrop.is-visible {
                display: block;
            }

            html.cr-better-search-modal-open {
                overflow: hidden;
            }

            html.cr-better-search-modal-open #cr-better-search-toggle {
                visibility: hidden;
            }

            #cr-better-search.is-modal-open {
                inset: 0;
                width: 100vw;
                height: 100vh;
                max-height: none;
                overflow: auto;
                border: 0;
                border-radius: 0;
                transform: none;
                display: block;
            }

            .cr-better-search-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 14px;
            }

            .cr-better-search-header h2 {
                margin: 0;
                color: var(--cr-toolkit-accent);
                font-size: 19px;
                font-weight: 700;
                line-height: 1.2;
            }

            html.cr-better-search-wide .cr-better-search-header h2 {
                color: var(--cr-toolkit-accent);
            }

            .cr-better-search-close {
                display: grid;
                flex: 0 0 auto;
                place-items: center;
                width: 30px;
                height: 30px;
                padding: 0;
                color: #e34b4b;
                background: transparent;
                border: 1px solid transparent;
                border-radius: 9px;
                cursor: pointer;
            }

            html.cr-better-search-wide .cr-better-search-close {
                color: rgba(255, 255, 255, 0.66);
            }

            .cr-better-search-close:hover,
            .cr-better-search-close:focus-visible {
                color: #ff6b6b;
                background: rgba(227, 75, 75, 0.12);
                border-color: rgba(227, 75, 75, 0.28);
                outline: none;
            }

            .cr-better-search-close svg {
                width: 17px;
                height: 17px;
            }

            .cr-better-search-description,
            .cr-better-search-footer {
                margin: 10px 0 0;
                color: rgba(255, 255, 255, 0.62);
                font-size: 12px;
                line-height: 1.5;
            }

            html.cr-better-search-wide .cr-better-search-description {
                color: rgba(255, 255, 255, 0.62);
            }

            .cr-better-search-divider {
                height: 1px;
                margin: 18px 0;
                background: linear-gradient(90deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.02));
            }

            html.cr-better-search-wide .cr-better-search-divider {
                background: linear-gradient(90deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.02));
            }

            .cr-better-search-filter + .cr-better-search-filter {
                margin-top: 18px;
            }

            .cr-better-search-filter-title {
                display: block;
                margin-bottom: 8px;
                color: rgba(255, 255, 255, 0.9);
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.01em;
            }

            html.cr-better-search-wide .cr-better-search-filter-title {
                color: rgba(255, 255, 255, 0.9);
            }

            .cr-better-search-language-picker {
                position: relative;
            }

            .cr-better-search-language-input {
                width: 100%;
                height: 40px;
                padding: 0 38px 0 12px;
                color: #ffffff;
                font: inherit;
                font-size: 13px;
                background: #1d1d1d;
                border: 1px solid #303030;
                border-radius: 11px;
                outline: none;
                transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
            }

            html.cr-better-search-wide .cr-better-search-language-input {
                color: #ffffff;
                background: #1d1d1d;
                border-color: #303030;
            }

            .cr-better-search-language-input::placeholder {
                color: rgba(255, 255, 255, 0.42);
            }

            .cr-better-search-language-input:hover {
                background: #222222;
            }

            html.cr-better-search-wide .cr-better-search-language-input:hover {
                background: #222222;
            }

            .cr-better-search-language-input:focus {
                background: #222222;
                border-color: var(--cr-toolkit-accent-border);
                box-shadow: 0 0 0 3px var(--cr-toolkit-accent-focus);
            }

            html.cr-better-search-wide .cr-better-search-language-input:focus {
                background: #222222;
            }

            .cr-better-search-picker-arrow {
                position: absolute;
                top: 50%;
                right: 12px;
                color: rgba(255, 255, 255, 0.56);
                pointer-events: none;
                transform: translateY(-50%);
            }

            html.cr-better-search-wide .cr-better-search-picker-arrow {
                color: rgba(255, 255, 255, 0.56);
            }

            .cr-better-search-picker-arrow svg {
                width: 15px;
                height: 15px;
            }

            .cr-better-search-language-list {
                position: absolute;
                z-index: 2;
                top: calc(100% + 6px);
                right: 0;
                left: 0;
                max-height: 210px;
                padding: 5px;
                overflow: auto;
                background: #151515;
                border: 1px solid #303030;
                border-radius: 12px;
                box-shadow: 0 14px 28px rgba(0, 0, 0, 0.16);
                backdrop-filter: blur(18px);
            }

            html.cr-better-search-wide .cr-better-search-language-list {
                background: #151515;
                border-color: #303030;
            }

            .cr-better-search-language-option {
                display: block;
                width: 100%;
                padding: 9px 10px;
                color: rgba(255, 255, 255, 0.84);
                font: inherit;
                font-size: 12px;
                text-align: left;
                background: transparent;
                border: 0;
                border-radius: 8px;
                cursor: pointer;
            }

            html.cr-better-search-wide .cr-better-search-language-option {
                color: rgba(255, 255, 255, 0.84);
            }

            .cr-better-search-language-option:hover,
            .cr-better-search-language-option[aria-selected="true"] {
                color: #ffffff;
                background: var(--cr-toolkit-accent-soft);
            }

            .cr-better-search-checkbox {
                display: flex;
                align-items: center;
                gap: 9px;
                margin-top: 10px;
                color: rgba(255, 255, 255, 0.68);
                font-size: 12px;
                line-height: 1.35;
                cursor: pointer;
                user-select: none;
            }

            html.cr-better-search-wide .cr-better-search-checkbox {
                color: rgba(255, 255, 255, 0.68);
            }

            .cr-better-search-checkbox input {
                position: absolute;
                width: 1px;
                height: 1px;
                opacity: 0;
                pointer-events: none;
            }

            .cr-better-search-checkbox-visual {
                position: relative;
                flex: 0 0 auto;
                width: 36px;
                height: 20px;
                background: #303030;
                border: 1px solid #444444;
                border-radius: 999px;
                transition: background 160ms ease, border-color 160ms ease;
            }

            html.cr-better-search-wide .cr-better-search-checkbox-visual {
                background: #303030;
                border-color: #444444;
            }

            .cr-better-search-checkbox-visual::after {
                position: absolute;
                top: 3px;
                left: 3px;
                width: 12px;
                height: 12px;
                background: #ffffff;
                border-radius: 50%;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
                content: "";
                transition: transform 160ms ease;
            }

            .cr-better-search-checkbox input:checked + .cr-better-search-checkbox-visual {
                background: var(--cr-toolkit-accent);
                border-color: var(--cr-toolkit-accent);
            }

            .cr-better-search-checkbox input:checked + .cr-better-search-checkbox-visual::after {
                transform: translateX(16px);
            }

            .cr-better-search-checkbox input:focus-visible + .cr-better-search-checkbox-visual {
                box-shadow: 0 0 0 3px var(--cr-toolkit-accent-glow);
            }

            @media (prefers-reduced-motion: reduce) {
                #cr-better-search-toggle,
                .cr-better-search-language-input,
                .cr-better-search-checkbox-visual,
                .cr-better-search-checkbox-visual::after {
                    transition: none;
                }
            }
        `;
        document.head?.appendChild(style);
    }

    function createSvgIcon(pathData, viewBox = "0 0 24 24") {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", viewBox);
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", "1.8");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathData);
        svg.appendChild(path);
        return svg;
    }

    function createSettingsIcon() {
        const svg = createSvgIcon(
            "M3.66122 10.6392C4.13377 10.9361 4.43782 11.4419 4.43782 11.9999C4.43781 12.558 4.13376 13.0638 3.66122 13.3607C3.33966 13.5627 3.13248 13.7242 2.98508 13.9163C2.66217 14.3372 2.51966 14.869 2.5889 15.3949C2.64082 15.7893 2.87379 16.1928 3.33973 16.9999C3.80568 17.8069 4.03865 18.2104 4.35426 18.4526C4.77508 18.7755 5.30694 18.918 5.83284 18.8488C6.07287 18.8172 6.31628 18.7185 6.65196 18.5411C7.14544 18.2803 7.73558 18.2699 8.21895 18.549C8.70227 18.8281 8.98827 19.3443 9.00912 19.902C9.02332 20.2815 9.05958 20.5417 9.15224 20.7654C9.35523 21.2554 9.74458 21.6448 10.2346 21.8478C10.6022 22 11.0681 22 12 22C12.9319 22 13.3978 22 13.7654 21.8478C14.2554 21.6448 14.6448 21.2554 14.8478 20.7654C14.9404 20.5417 14.9767 20.2815 14.9909 19.9021C15.0117 19.3443 15.2977 18.8281 15.7811 18.549C16.2644 18.27 16.8545 18.2804 17.3479 18.5412C17.6837 18.7186 17.9271 18.8173 18.1671 18.8489C18.693 18.9182 19.2249 18.7756 19.6457 18.4527C19.9613 18.2106 20.1942 17.807 20.6603 17C20.8677 16.6407 21.029 16.3614 21.1486 16.1272M20.3387 13.3608C19.8662 13.0639 19.5622 12.5581 19.5621 12.0001C19.5621 11.442 19.8662 10.9361 20.3387 10.6392C20.6603 10.4372 20.8674 10.2757 21.0148 10.0836C21.3377 9.66278 21.4802 9.13092 21.411 8.60502C21.3591 8.2106 21.1261 7.80708 20.6601 7.00005C20.1942 6.19301 19.9612 5.7895 19.6456 5.54732C19.2248 5.22441 18.6929 5.0819 18.167 5.15113C17.927 5.18274 17.6836 5.2814 17.3479 5.45883C16.8544 5.71964 16.2643 5.73004 15.781 5.45096C15.2977 5.1719 15.0117 4.6557 14.9909 4.09803C14.9767 3.71852 14.9402 3.45835 14.8478 3.23463C14.6448 2.74458 14.2554 2.35523 13.7654 2.15224C13.3978 2 12.9319 2 12 2C11.0681 2 10.6022 2 10.2346 2.15224C9.74458 2.35523 9.35523 2.74458 9.15224 3.23463C9.05958 3.45833 9.02332 3.71848 9.00912 4.09794C8.98826 4.65566 8.70225 5.17191 8.21891 5.45096C7.73557 5.73002 7.14548 5.71959 6.65205 5.4588C6.31633 5.28136 6.0729 5.18269 5.83285 5.15108C5.30695 5.08185 4.77509 5.22436 4.35427 5.54727C4.03866 5.78945 3.80569 6.19297 3.33974 7C3.13231 7.35929 2.97105 7.63859 2.85138 7.87273"
        );
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", "12");
        circle.setAttribute("cy", "12");
        circle.setAttribute("r", "3");
        svg.insertBefore(circle, svg.firstChild);
        return svg;
    }

    function createCloseIcon() {
        return createSvgIcon("M6 6l12 12M18 6 6 18");
    }

    function createChevronIcon() {
        return createSvgIcon("m7 10 5 5 5-5");
    }

    function isWideLayout() {
        return window.innerWidth >= 1100 && window.innerHeight >= 650;
    }

    function updateResponsiveLayout() {
        const wide = isWideLayout();
        document.documentElement.classList.toggle("cr-better-search-wide", wide);
        if (wide) {
            closeSettingsModal();
        }
    }

    function openSettingsModal() {
        if (isWideLayout() || !settingsPanel || !settingsBackdrop) {
            return;
        }

        settingsPanel.classList.add("is-modal-open");
        settingsPanel.setAttribute("aria-modal", "true");
        settingsBackdrop.classList.add("is-visible");
        settingsToggle?.setAttribute("aria-expanded", "true");
        document.documentElement.classList.add("cr-better-search-modal-open");
        settingsPanel.querySelector(".cr-better-search-language-input")?.focus();
    }

    function closeSettingsModal() {
        settingsPanel?.classList.remove("is-modal-open");
        settingsPanel?.removeAttribute("aria-modal");
        settingsBackdrop?.classList.remove("is-visible");
        settingsToggle?.setAttribute("aria-expanded", "false");
        document.documentElement.classList.remove("cr-better-search-modal-open");
    }

    function removeSettingsUI() {
        closeSettingsModal();
        [settingsPanel, settingsToggle, settingsBackdrop].forEach(element => {
            element?.remove();
        });
        settingsPanel = null;
        settingsToggle = null;
        settingsBackdrop = null;
        document.documentElement.classList.remove("cr-better-search-wide");
        document.removeEventListener("keydown", handleSettingsKeydown);
        window.removeEventListener("resize", updateResponsiveLayout);
    }

    function handleSettingsKeydown(event) {
        if (event.key === "Escape" && settingsPanel?.classList.contains("is-modal-open")) {
            closeSettingsModal();
        }
    }

    function observePage() {
        const root = document.documentElement || document;
        const observer = new MutationObserver(mutations => {
            syncSearchPage();
            if (!betterSearchEnabled || !isSearchPage()) return;
            if (mutations.every(mutation => mutation.target.closest?.(
                '#cr-better-search, [data-cr-toolkit="availability-labels"]'
            ))) return;
            syncSearchQuery();
            injectUI();
            scheduleApply();
        });

        observer.observe(root, {
            childList: true,
            subtree: true
        });
    }

    function observeSearchInput() {
        document.addEventListener("input", event => {
            if (!event.target?.matches?.(
                'input[type="search"], input[class*="search-input"]'
            )) {
                return;
            }

            syncSearchPage();
            syncSearchQuery();
        }, true);
    }

    function observeHistory() {
        ["pushState", "replaceState"].forEach(method => {
            const original = window.history[method];

            if (typeof original !== "function" || original.__crToolkitBetterSearch) {
                return;
            }

            const wrapped = function() {
                const result = original.apply(this, arguments);
                window.dispatchEvent(new Event("cr-toolkit-route-change"));
                return result;
            };

            wrapped.__crToolkitBetterSearch = true;
            try {
                window.history[method] = wrapped;
            } catch (error) {
            }
        });

        window.addEventListener("popstate", syncSearchPage);
        window.addEventListener("cr-toolkit-route-change", syncSearchPage);
    }

    function syncSearchPage(force = false) {
        const currentPath = window.location.pathname;

        if (!force && currentPath === searchPagePath) {
            setSettingsRouteVisibility(isSearchPage());
            if (isSearchPage()) {
                injectUI();
            }
            return;
        }

        const wasSearchPage = isSearchPath(searchPagePath);
        const isCurrentSearchPage = isSearchPath(currentPath);
        searchPagePath = currentPath;
        setSettingsRouteVisibility(isCurrentSearchPage);

        if (!wasSearchPage || !isCurrentSearchPage) {
            clearSearchCache();
        }

        notifySearchRoute();
        lastSearchQuery = getActiveSearchQuery();
        if (isCurrentSearchPage) {
            injectUI();
        }
        scheduleApply();
    }

    function setSettingsRouteVisibility(visible) {
        if (!visible) {
            closeSettingsModal();
        }

        [settingsPanel, settingsToggle, settingsBackdrop].forEach(element => {
            element?.classList.toggle("is-route-hidden", !visible);
        });
    }

    function syncSearchQuery() {
        const query = getActiveSearchQuery();

        if (query !== lastSearchQuery) {
            lastSearchQuery = query;
            scheduleApply();
        }
    }

    function postBridgeMessage(type, payload = {}) {
        window.postMessage({
            source: "CRToolkit",
            type,
            ...payload
        }, "*");
    }

    function notifySearchRoute() {
        postBridgeMessage("CR_BETTER_SEARCH_ROUTE", {
            isSearch: isSearchPage()
        });
    }

    function notifyCacheUpdate() {
        if (betterSearchEnabled && isSearchPage() && searchCache.size) {
            postBridgeMessage("CR_BETTER_SEARCH_CACHE_UPDATE", {
                records: [...searchCache.values()]
            });
        }
    }

    function handleBridgeMessage(event) {
        if (event.source !== window || event.data?.source !== "CRToolkit") {
            return;
        }

        if (event.data.type === "CR_BETTER_SEARCH_ENABLED") {
            setBetterSearchEnabled(event.data.enabled !== false);
            return;
        }

        if (event.data.type === "CR_BETTER_SEARCH_CACHE_RESTORE") {
            if (!betterSearchEnabled || !isSearchPage()) {
                return;
            }

            const records = Array.isArray(event.data.records)
                ? event.data.records
                : [];
            mergeRecordsIntoLocal(records);
            scheduleApply();
            return;
        }

        if (event.data.type === "CR_BETTER_SEARCH_CACHE_REQUEST") {
            if (!betterSearchEnabled) {
                return;
            }

            postBridgeMessage("CR_BETTER_SEARCH_CACHE_RESTORE", {
                records: [...searchCache.values()]
            });
            notifyCacheUpdate();
        }
    }

    function setBetterSearchEnabled(enabled) {
        const nextEnabled = Boolean(enabled);
        if (nextEnabled === betterSearchEnabled) {
            if (nextEnabled) {
                injectUI();
                scheduleApply();
            }
            return;
        }

        betterSearchEnabled = nextEnabled;
        if (!betterSearchEnabled) {
            clearBetterSearchEffects();
            clearSearchCache();
            removeSettingsUI();
            return;
        }

        syncSearchPage(true);
        scheduleApply();
    }

    function normalizeCachedRecord(record) {
        if (!record || typeof record !== "object" ||
            !Array.isArray(record.ids) || !Array.isArray(record.titles) ||
            !Array.isArray(record.audioLocales) ||
            !Array.isArray(record.subtitleLocales)) {
            return null;
        }

        const normalizeValues = (values, normalize) => uniqueValues(values
            .filter(value => typeof value === "string" && value.length <= 300)
            .map(normalize).filter(Boolean).slice(0, 100));
        const ids = normalizeValues(record.ids, normalizeText);
        const titles = normalizeValues(record.titles, normalizeText);

        if (!ids.length && !titles.length) {
            return null;
        }

        return {
            cacheKey: ids[0] || `title:${titles[0]}`,
            ids,
            titles,
            audioLocales: normalizeValues(record.audioLocales, normalizeLocale),
            subtitleLocales: normalizeValues(record.subtitleLocales, normalizeLocale),
            hasDub: record.hasDub === true || record.hasDub === false
                ? record.hasDub
                : null,
            hasSub: record.hasSub === true || record.hasSub === false
                ? record.hasSub
                : null
        };
    }

    function isSearchPage() {
        return isSearchPath(window.location.pathname);
    }

    function isSearchPath(path) {
        return /(^|\/)search(?:\/|$)/i.test(String(path || ""));
    }

    function clearSearchCache() {
        searchCache.clear();
        recordsById.clear();
        recordsByTitle.clear();
    }

    function getActiveSearchQuery() {
        const input = Array.from(document.querySelectorAll(
            'input[type="search"], input[class*="search-input"]'
        )).find(element => !element.closest("#cr-better-search"));
        const inputValue = input?.value?.trim();

        if (inputValue) {
            return normalizeText(inputValue);
        }

        try {
            return normalizeText(new URL(window.location.href).searchParams.get("q"));
        } catch (error) {
            return "";
        }
    }

    function refreshResults() {
        scheduleApply();
    }

    function scheduleApply() {
        if (!betterSearchEnabled || !isSearchPage()) return;
        if (applyTimer !== null) {
            return;
        }

        applyTimer = window.setTimeout(() => {
            applyTimer = null;
            applyFiltersToResults();
        }, 50);
    }

    function applyFiltersToResults() {
        if (!betterSearchEnabled || !isSearchPage()) {
            return;
        }

        const cards = getSearchCards();

        if (!cards.length) {
            return;
        }

        cards.forEach(card => {
            const record = findRecordForCard(card);
            const recordAvailability = record
                ? getAvailability(record)
                : null;
            const cardAvailability = getAvailabilityFromCard(card);
            const availability = record
                ? mergeAvailability(recordAvailability, cardAvailability)
                : cardAvailability;
            const matches = !record || matchesActiveFilters(availability);

            card.style.display = matches ? "" : "none";
            updateAvailabilityLabels(card, availability);
        });
    }

    function clearBetterSearchEffects() {
        getSearchCards().forEach(card => {
            card.style.display = "";
            card.querySelector('[data-cr-toolkit="availability-labels"]')?.remove();
            delete card.dataset.crToolkitRecordKey;
        });
    }

    function getSearchCards() {
        const cards = new Set();
        const exactCards = Array.from(
            document.querySelectorAll(EXACT_CARD_SELECTOR)
        );

        exactCards.forEach(element => {
            cards.add(element);
        });

        if (!cards.size) {
            const matchingElements = Array.from(
                document.querySelectorAll(FALLBACK_CARD_SELECTOR)
            );

            matchingElements.forEach(element => {
                cards.add(getOutermostMatchingElement(
                    element,
                    FALLBACK_CARD_SELECTOR
                ));
            });

            const cardParts = Array.from(
                document.querySelectorAll('[class*="search-show-card"]')
            );

            cardParts.forEach(part => {
                cards.add(getOutermostMatchingElement(
                    part,
                    '[class*="search-show-card"]'
                ));
            });
        }

        return [...cards].filter(card =>
            card.querySelector("a[href], h1, h2, h3, [class*='title']")
        );
    }

    function getOutermostMatchingElement(element, selector) {
        let root = element;

        while (root.parentElement?.matches(selector)) {
            root = root.parentElement;
        }

        return root;
    }

    function matchesActiveFilters(availability) {
        const dubMatches = matchesType(
            availability.audioLocales,
            availability.hasDub,
            dubFilter
        );
        const subMatches = matchesType(
            availability.subtitleLocales,
            availability.hasSub,
            subFilter
        );

        if (onlyDub && dubMatches === false) {
            return false;
        }

        if (onlySub && subMatches === false) {
            return false;
        }

        return true;
    }

    function matchesType(locales, hasType, selectedLanguage) {
        if (!selectedLanguage) {
            return hasType;
        }

        if (locales.some(locale => localeMatches(locale, selectedLanguage))) {
            return true;
        }

        if (hasType === false || locales.length) {
            return false;
        }

        return null;
    }

    function localeMatches(locale, selectedLanguage) {
        const normalizedLocale = normalizeLocale(locale);
        const normalizedSelection = normalizeLocale(selectedLanguage);

        return normalizedLocale === normalizedSelection ||
            normalizedLocale.split("-")[0] === normalizedSelection.split("-")[0];
    }

    function findRecordForCard(card) {
        // Re-read identity because the site can reuse a card for another result.
        const ids = getCardIds(card);
        if (ids.length) {
            const record = ids.map(id => recordsById.get(id)).find(Boolean);
            if (record) {
                return record;
            }
        }

        const titles = getCardTitles(card);
        const exactRecord = titles.map(title => recordsByTitle.get(title)).find(Boolean);
        if (exactRecord) return exactRecord;
        const record = Array.from(searchCache.values()).find(item =>
            item.titles.some(recordTitle =>
                titles.some(cardTitle => titlesMatch(recordTitle, cardTitle))
            )
        ) || null;

        return record;
    }

    function getCardIds(card) {
        const ids = [];
        const nodes = [card, ...Array.from(card.querySelectorAll("*"))];

        nodes.slice(0, 250).forEach(node => {
            Array.from(node.attributes || []).forEach(attribute => {
                if (/(^|[-_])(id|guid|content-id|series-id|movie-id)([-_]|$)/i.test(
                    attribute.name
                )) {
                    ids.push(attribute.value);
                }

                if (attribute.name === "href") {
                    const idMatch = attribute.value.match(
                        /\/(?:series|movie|watch)\/([^/?#]+)/i
                    );
                    if (idMatch) {
                        ids.push(idMatch[1]);
                    }
                }
            });
        });

        return uniqueValues(ids
            .map(value => String(value).trim().toLowerCase())
            .filter(Boolean));
    }

    function getCardTitles(card) {
        return uniqueValues(Array.from(card.querySelectorAll(
            "h1, h2, h3, [data-t*='title'], [data-testid*='title'], [class*='title']"
        ))
            .map(element => normalizeText(element.textContent))
            .filter(title => title.length >= 3));
    }

    function titlesMatch(left, right) {
        if (left === right) {
            return true;
        }

        const shorter = (left.length <= right.length ? left : right)
            .replace(/(?:\.\.\.|…)+$/, "")
            .trim();
        const longer = left.length <= right.length ? right : left;

        return shorter.length >= 8 && longer.startsWith(shorter);
    }

    function updateAvailabilityLabels(card, availability) {
        let container = card.querySelector(
            '[data-cr-toolkit="availability-labels"]'
        );

        const labels = getAvailabilityLabels(availability);

        if (!labels.length) {
            container?.remove();
            return;
        }

        if (!container) {
            container = document.createElement("div");
            container.dataset.crToolkit = "availability-labels";
            container.style.display = "flex";
            container.style.flexDirection = "column";
            container.style.gap = "2px";
            container.style.marginTop = "4px";
            container.style.width = "100%";

            const footer = card.querySelector(
                '[class*="search-show-card__footer"]'
            );
            const body = card.querySelector('[class*="search-show-card__body"]');

            if (footer) {
                footer.insertAdjacentElement("afterend", container);
            } else {
                (body || card).appendChild(container);
            }
        }

        const labelKey = labels
            .map(label => `${label.matches ? "1" : "0"}:${label.text}`)
            .join("|");

        if (container.dataset.labels === labelKey) {
            return;
        }

        container.dataset.labels = labelKey;
        container.replaceChildren();

        labels.forEach(label => {
            container.appendChild(createAvailabilityLabel(label.text, label.matches));
        });
    }

    function getAvailabilityLabels(availability) {
        const labels = [];

        if (dubFilter) {
            const matches = matchesType(
                availability.audioLocales,
                availability.hasDub,
                dubFilter
            );
            if (matches !== null) {
                labels.push({
                    text: `${matches ? "Dubbed in" : "Not dubbed in"} ${LANGUAGES[dubFilter]}`,
                    matches
                });
            } else if (availability.hasDub === true) {
                labels.push({text: "Dubbed", matches: true});
            }
        } else if (availability.hasDub === true) {
            labels.push({text: "Dubbed", matches: true});
        }

        if (subFilter) {
            const matches = matchesType(
                availability.subtitleLocales,
                availability.hasSub,
                subFilter
            );
            if (matches !== null) {
                labels.push({
                    text: `${matches ? "Subbed in" : "Not subbed in"} ${LANGUAGES[subFilter]}`,
                    matches
                });
            } else if (availability.hasSub === true) {
                labels.push({text: "Subtitles", matches: true});
            }
        } else if (availability.hasSub === true) {
            labels.push({text: "Subtitles", matches: true});
        }

        return labels;
    }

    function createAvailabilityLabel(text, matches) {
        const label = document.createElement("span");
        label.textContent = text;
        label.style.color = matches ? "#2ecc71" : "#e74c3c";
        label.style.fontSize = "12px";
        return label;
    }

    function getAvailability(record) {
        const audioLocales = getLocales(record, [
            "audio_locales",
            "audioLocales",
            "audio_locale",
            "audioLocale",
            "available_audio_locales",
            "availableAudioLocales",
            "audio_languages",
            "audioLanguages",
            "available_audio_languages",
            "availableAudioLanguages",
            "dubbed_locales",
            "dubbedLocales",
            "dub_locales",
            "dubLocales",
            "dubbing_locales",
            "dubbingLocales",
            "dubbed_languages",
            "dubbedLanguages",
            "dubs"
        ]);
        const subtitleLocales = getLocales(record, [
            "subtitle_locales",
            "subtitleLocales",
            "subtitle_locale",
            "subtitleLocale",
            "available_subtitle_locales",
            "availableSubtitleLocales",
            "subtitle_languages",
            "subtitleLanguages",
            "available_subtitle_languages",
            "availableSubtitleLanguages",
            "subtitles",
            "captions"
        ]);
        const recordHasDub = typeof record.hasDub === "boolean"
            ? record.hasDub
            : getBoolean(record, [
                "is_dubbed",
                "isDubbed",
                "has_dub",
                "hasDub",
                "dubbed"
            ]);
        const recordHasSub = typeof record.hasSub === "boolean"
            ? record.hasSub
            : getBoolean(record, [
                "is_subbed",
                "isSubbed",
                "has_sub",
                "hasSub",
                "subbed"
            ]);

        return {
            audioLocales,
            subtitleLocales,
            hasDub: recordHasDub ?? (audioLocales.length ? true : null),
            hasSub: recordHasSub ?? (subtitleLocales.length ? true : null)
        };
    }

    function mergeAvailability(recordAvailability, cardAvailability) {
        return {
            audioLocales: uniqueValues(
                recordAvailability.audioLocales.concat(cardAvailability.audioLocales)
            ),
            subtitleLocales: uniqueValues(
                recordAvailability.subtitleLocales.concat(cardAvailability.subtitleLocales)
            ),
            hasDub: recordAvailability.hasDub ?? cardAvailability.hasDub,
            hasSub: recordAvailability.hasSub ?? cardAvailability.hasSub
        };
    }

    function getAvailabilityFromCard(card) {
        const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                return node.parentElement?.closest('[data-cr-toolkit], script, style')
                    ? NodeFilter.FILTER_REJECT
                    : NodeFilter.FILTER_ACCEPT;
            }
        });
        const parts = [];
        while (walker.nextNode()) parts.push(walker.currentNode.textContent);
        const text = parts.join(" ");
        const hasKnownStatus = /Synchro|Dubbed|Dubbing|Untertitel|Subtitles|Subs/i.test(
            text
        );
        const hasDub = hasKnownStatus
            ? /Synchro|Dubbed|Dubbing/i.test(text)
            : null;
        const hasSub = hasKnownStatus
            ? /Untertitel|Subtitles|Subs/i.test(text)
            : null;

        return {
            audioLocales: [],
            subtitleLocales: [],
            hasDub,
            hasSub
        };
    }

    function getBoolean(object, keys) {
        const wantedKeys = new Set(keys.map(canonicalKey));
        const visited = new WeakSet();
        let result = null;

        const visit = (value, depth) => {
            if (result !== null || !value || depth > 6 || typeof value !== "object") {
                return;
            }

            if (visited.has(value)) {
                return;
            }
            visited.add(value);

            if (Array.isArray(value)) {
                value.forEach(item => visit(item, depth + 1));
                return;
            }

            Object.entries(value).forEach(([key, child]) => {
                if (wantedKeys.has(canonicalKey(key)) && typeof child === "boolean") {
                    result = child;
                    return;
                }
                visit(child, depth + 1);
            });
        };

        visit(object, 0);
        return result;
    }

    function getLocales(object, keys) {
        return uniqueValues(collectNestedLocales(object, keys));
    }

    function flattenLocaleValues(value) {
        if (Array.isArray(value)) {
            return value.flatMap(flattenLocaleValues);
        }

        if (typeof value === "string") {
            return [normalizeLocale(value)];
        }

        if (value && typeof value === "object") {
            return flattenLocaleValues(
                value.locale || value.language || value.code || value.value || ""
            );
        }

        return [];
    }

    function collectNestedLocales(object, keys) {
        const values = [];
        const wantedKeys = new Set(keys.map(canonicalKey));
        const visited = new WeakSet();

        const visit = (value, depth) => {
            if (!value || depth > 6 || typeof value !== "object") {
                return;
            }

            if (visited.has(value)) {
                return;
            }
            visited.add(value);

            if (Array.isArray(value)) {
                value.forEach(item => visit(item, depth + 1));
                return;
            }

            Object.entries(value).forEach(([key, child]) => {
                if (wantedKeys.has(canonicalKey(key))) {
                    values.push(...flattenLocaleValues(child));
                }
                visit(child, depth + 1);
            });
        };

        visit(object, 0);
        return values.filter(Boolean);
    }

    function canonicalKey(key) {
        return String(key || "").replace(/[-_]/g, "").toLowerCase();
    }

    function normalizeLocale(locale) {
        const normalized = String(locale || "")
            .trim()
            .replace(/_/g, "-")
            .toLowerCase();
        const languageEntry = Object.entries(LANGUAGES).find(([, name]) =>
            name.toLowerCase() === normalized
        );

        return languageEntry ? languageEntry[0].toLowerCase() : normalized;
    }

    function normalizeText(text) {
        return String(text || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");
    }

    function handleSearchResponse(payload, requestQuery = "") {
        if (!betterSearchEnabled || !isSearchPage()) {
            return;
        }

        const activeQuery = getActiveSearchQuery();
        const normalizedRequestQuery = normalizeText(requestQuery);

        if (normalizedRequestQuery && activeQuery &&
            normalizedRequestQuery !== activeQuery) {
            return;
        }

        const items = extractSearchItems(payload);
        if (!items.length) {
            return;
        }

        const records = items.map(createSearchRecord).filter(Boolean);
        if (!records.length) {
            return;
        }
        mergeSearchRecords(records);
        scheduleApply();
    }

    function mergeSearchRecords(records) {
        mergeRecordsIntoLocal(records);
        notifyCacheUpdate();
    }

    function mergeRecordsIntoLocal(records) {
        if (!Array.isArray(records)) {
            return;
        }

        records.slice(-MAX_CACHE_RECORDS).forEach(record => {
            const normalized = normalizeCachedRecord(record);
            if (!normalized) {
                return;
            }

            const existing = normalized.ids.map(id => recordsById.get(id)).find(Boolean) ||
                normalized.titles.map(title => recordsByTitle.get(title)).find(Boolean);

            if (!existing) {
                searchCache.set(normalized.cacheKey, normalized);
                indexRecord(normalized);
                trimSearchCache();
                return;
            }

            existing.ids = uniqueValues(existing.ids.concat(normalized.ids));
            existing.titles = uniqueValues(existing.titles.concat(normalized.titles));
            existing.audioLocales = uniqueValues(
                existing.audioLocales.concat(normalized.audioLocales)
            );
            existing.subtitleLocales = uniqueValues(
                existing.subtitleLocales.concat(normalized.subtitleLocales)
            );
            existing.hasDub = mergeAvailabilityFlag(existing.hasDub, normalized.hasDub);
            existing.hasSub = mergeAvailabilityFlag(existing.hasSub, normalized.hasSub);
            indexRecord(existing);
        });
    }

    function indexRecord(record) {
        record.ids.forEach(id => recordsById.set(id, record));
        record.titles.forEach(title => recordsByTitle.set(title, record));
    }

    function trimSearchCache() {
        while (searchCache.size > MAX_CACHE_RECORDS) {
            const [key, record] = searchCache.entries().next().value;
            searchCache.delete(key);
            record.ids.forEach(id => {
                if (recordsById.get(id) === record) recordsById.delete(id);
            });
            record.titles.forEach(title => {
                if (recordsByTitle.get(title) === record) recordsByTitle.delete(title);
            });
        }
    }

    function getRecordKey(record) {
        return record.ids[0] || `title:${record.titles[0]}`;
    }

    function mergeAvailabilityFlag(existingValue, incomingValue) {
        if (existingValue === true || incomingValue === true) {
            return true;
        }

        if (existingValue === false || incomingValue === false) {
            return false;
        }

        return null;
    }

    function uniqueValues(values) {
        return [...new Set(values)];
    }

    function extractSearchItems(payload) {
        const candidates = [];
        const visit = (value, depth) => {
            if (!value || depth > 4) {
                return;
            }

            if (Array.isArray(value)) {
                const objects = value.filter(item => item && typeof item === "object");
                if (objects.some(item => item.id || item.series_id || item.movie_id)) {
                    candidates.push(value);
                }
                objects.slice(0, 20).forEach(item => visit(item, depth + 1));
                return;
            }

            if (typeof value !== "object") {
                return;
            }

            Object.values(value).forEach(child => visit(child, depth + 1));
        };

        visit(payload, 0);

        return candidates.sort((left, right) => {
            const scoreDifference = getCandidateScore(right) - getCandidateScore(left);
            return scoreDifference || right.length - left.length;
        })[0] || [];
    }

    function getCandidateScore(items) {
        return items.reduce((score, item) => {
            if (!item || typeof item !== "object") return score;
            let itemScore = 0;

            if (item.title || item.series_title || item.movie_title) {
                itemScore += 3;
            }

            if (item.audio_locales || item.audio_locale || item.is_dubbed !== undefined) {
                itemScore += 2;
            }

            if (item.subtitle_locales || item.subtitle_locale || item.is_subbed !== undefined) {
                itemScore += 2;
            }

            return score + itemScore;
        }, 0);
    }

    function createSearchRecord(item) {
        if (!item || typeof item !== "object") {
            return null;
        }

        const ids = [
            item.id,
            item.series_id,
            item.movie_id,
            item.content_id,
            item.seriesId,
            item.movieId,
            item.contentId
        ]
            .filter(Boolean)
            .map(value => String(value).toLowerCase());

        const titles = [
            item.title,
            item.series_title,
            item.movie_title,
            item.title_en,
            item.titleEn
        ]
            .filter(Boolean)
            .map(normalizeText);

        if (!ids.length && !titles.length) {
            return null;
        }

        const record = {
            ids,
            titles,
            ...getAvailability(item)
        };

        record.cacheKey = getRecordKey(record);
        return record;
    }

    function getRequestDetails(input, init) {
        const requestUrl = typeof input === "string"
            ? input
            : input?.url || input?.href;
        const method = init?.method || input?.method || "GET";

        return {
            url: requestUrl,
            method: String(method).toUpperCase()
        };
    }

    function isSearchApiRequest(url) {
        return typeof url === "string" && url.includes(SEARCH_API_PATH);
    }

    function getSearchQueryFromUrl(url) {
        try {
            return new URL(url, window.location.href).searchParams.get("q") || "";
        } catch (error) {
            return "";
        }
    }

    function installFetchInterceptor() {
        if (typeof window.fetch !== "function" || window.fetch.__crToolkitBetterSearch) {
            return;
        }

        const originalFetch = window.fetch;
        const wrappedFetch = function(input, init) {
            const request = getRequestDetails(input, init);
            const responsePromise = originalFetch.apply(this, arguments);

            if (betterSearchEnabled && request.method === "GET" &&
                isSearchApiRequest(request.url)) {
                const requestQuery = getSearchQueryFromUrl(request.url) || getActiveSearchQuery();
                responsePromise.then(response => {
                    response.clone().json()
                        .then(payload => handleSearchResponse(
                            payload,
                            requestQuery
                        ))
                        .catch(() => {});
                }).catch(() => {});
            }

            return responsePromise;
        };

        wrappedFetch.__crToolkitBetterSearch = true;
        window.fetch = wrappedFetch;
    }

    function installXhrInterceptor() {
        const XHR = window.XMLHttpRequest;
        if (!XHR || XHR.prototype.__crToolkitBetterSearch) {
            return;
        }

        const originalOpen = XHR.prototype.open;
        const originalSend = XHR.prototype.send;

        XHR.prototype.open = function(method, url) {
            if (this.__crToolkitSearchListener) {
                this.removeEventListener("load", this.__crToolkitSearchListener);
                this.__crToolkitSearchListener = null;
            }
            this.__crToolkitSearchMethod = method;
            this.__crToolkitSearchUrl = String(url);
            return originalOpen.apply(this, arguments);
        };

        XHR.prototype.send = function() {
            const url = this.__crToolkitSearchUrl;
            const method = String(this.__crToolkitSearchMethod || "GET").toUpperCase();
            if (betterSearchEnabled && method === "GET" && isSearchApiRequest(url)) {
                const requestQuery = getSearchQueryFromUrl(url) || getActiveSearchQuery();
                this.__crToolkitSearchListener = () => {
                    try {
                        handleSearchResponse(
                            this.responseType === "json" ? this.response : JSON.parse(this.responseText),
                            requestQuery
                        );
                    } catch (error) {
                        // The request may have a non-JSON response.
                    }
                };
                this.addEventListener("load", this.__crToolkitSearchListener, { once: true });
            }

            return originalSend.apply(this, arguments);
        };

        XHR.prototype.__crToolkitBetterSearch = true;
    }

    installFetchInterceptor();
    installXhrInterceptor();
    window.addEventListener("message", handleBridgeMessage);

    window.CRToolkit = window.CRToolkit || {};
    window.CRToolkit.initBetterSearch = initBetterSearch;
    initBetterSearch();
})();
