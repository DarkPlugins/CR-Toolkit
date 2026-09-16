(() => {
    const CONTROL_ATTRIBUTE = "data-cr-toolkit-control";
    const PANEL_CLASS = "cr-toolkit-settings";
    const LOGO_URL = typeof chrome !== "undefined" && typeof chrome.runtime?.getURL === "function"
        ? chrome.runtime.getURL("icon.png")
        : "icon.png";

    const i18n = window.CRToolkit.I18n;

    const PANEL_CSS = `
        :host {
            all: initial;
            --primary-accent: #ff6f00;
            --accent-strong: #ff6f00;
            --accent-soft: rgba(255, 111, 0, 0.14);
            --accent-border: rgba(255, 111, 0, 0.35);
            --accent-checked-border: rgba(255, 111, 0, 0.7);
            --accent-glow: rgba(255, 111, 0, 0.24);
            --panel-bg: rgba(24, 27, 33, 0.7);
            --panel-raised: rgba(40, 45, 54, 0.82);
            --panel-soft: rgba(255, 255, 255, 0.05);
            --panel-border: rgba(255, 255, 255, 0.12);
            --panel-border-strong: rgba(255, 255, 255, 0.2);
            --panel-text: #f3f1ec;
            --panel-muted: #a7abb3;
            position: relative;
            z-index: 2147483647;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            flex: 0 0 40px;
            margin: 0;
            padding: 0;
            color: var(--panel-text);
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            line-height: 0;
        }

        *, *::before, *::after {
            box-sizing: border-box;
        }

        button, input, select {
            font: inherit;
        }

        .control-button {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            margin: 0;
            padding: 0;
            border: 1px solid transparent;
            border-radius: 10px;
            background: transparent;
            color: #fff;
            cursor: pointer;
            line-height: 0;
            transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
        }

        .control-button:hover,
        .control-button[aria-expanded="true"] {
            border-color: rgba(255, 255, 255, 0.12);
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
        }

        .control-button:active {
            transform: scale(0.95);
        }

        .control-button:focus-visible,
        .panel button:focus-visible,
        .panel a:focus-visible,
        .panel select:focus-visible,
        .panel input:focus-visible + .toggle-label {
            outline: 2px solid var(--accent-strong);
            outline-offset: 2px;
        }

        .control-button svg {
            display: block;
            width: 24px;
            height: 24px;
        }

        .panel {
            position: absolute;
            top: calc(100% + 10px);
            right: 0;
            display: none;
            width: min(348px, calc(100vw - 24px));
            max-height: calc(100vh - 72px);
            overflow: hidden;
            border: 1px solid var(--panel-border);
            border-radius: 20px;
            background: var(--panel-bg);
            box-shadow: 0 24px 70px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.07);
            backdrop-filter: blur(24px) saturate(120%);
        }

        .panel.open {
            display: block;
            animation: panel-in 0.18s ease-out;
        }

        .panel-inner {
            max-height: calc(100vh - 72px);
            padding: 12px;
            overflow: hidden;
        }

        .panel-header {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 42px;
            margin-bottom: 8px;
        }

        .panel-logo {
            display: block;
            width: 96px;
            height: auto;
            margin: 0 auto;
        }

        .close-button {
            position: absolute;
            top: 0;
            right: 0;
            display: grid;
            width: 26px;
            height: 26px;
            margin: 0;
            padding: 0;
            place-items: center;
            border: 1px solid var(--panel-border);
            border-radius: 8px;
            background: var(--panel-soft);
            color: var(--panel-muted);
            cursor: pointer;
            font-size: 16px;
            line-height: 1;
        }

        .close-button:hover {
            border-color: var(--panel-border-strong);
            background: rgba(255, 255, 255, 0.1);
            color: var(--panel-text);
        }

        .navbar {
            display: flex;
            gap: 4px;
            margin-bottom: 8px;
            padding: 4px;
            border: 1px solid var(--panel-border);
            border-radius: 13px;
            background: rgba(10, 12, 15, 0.22);
        }

        .nav-btn {
            flex: 1;
            min-height: 32px;
            padding: 6px 8px;
            border: 1px solid transparent;
            border-radius: 9px;
            background: transparent;
            color: var(--panel-muted);
            cursor: pointer;
            font-size: 11px;
            font-weight: 650;
        }

        .nav-btn:hover {
            border-color: var(--panel-border);
            background: var(--panel-soft);
            color: var(--panel-text);
        }

        .nav-btn.active {
            border-color: var(--accent-border);
            background: var(--accent-soft);
            color: var(--accent-strong);
        }

        .section-container {
            height: 320px;
            overflow: hidden;
            border: 1px solid var(--panel-border);
            border-radius: 15px;
            background: rgba(10, 12, 15, 0.2);
        }

        .section-page {
            display: none;
            height: 100%;
            padding: 9px;
            overflow: auto;
            scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
            scrollbar-width: thin;
        }

        .section-page.active {
            display: block;
        }

        .feat-item {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-height: 52px;
            margin-bottom: 7px;
            padding: 10px 11px 10px 13px;
            border: 1px solid var(--panel-border);
            border-radius: 13px;
            background: linear-gradient(105deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.025));
        }

        .feat-item.child {
            min-height: 44px;
            margin-left: 12px;
            padding-top: 8px;
            padding-bottom: 8px;
            background: rgba(255, 255, 255, 0.025);
        }

        .feat-item.child::before {
            width: 3px;
            height: 18px;
            margin-right: 9px;
            border-radius: 999px;
            background: var(--accent-border);
            content: "";
        }

        .toggle-text {
            min-width: 0;
            color: var(--panel-text);
            font-size: 12px;
            font-weight: 650;
        }

        .child .toggle-text {
            color: var(--panel-muted);
            font-size: 11px;
            font-weight: 550;
        }

        input[type="checkbox"] {
            position: absolute;
            right: 11px;
            top: 50%;
            width: 40px;
            height: 23px;
            margin: 0;
            transform: translateY(-50%);
            opacity: 0;
            pointer-events: none;
        }

        .toggle-label {
            position: relative;
            display: inline-block;
            width: 40px;
            height: 23px;
            flex: 0 0 auto;
            cursor: pointer;
        }

        .toggle-label::before,
        .toggle-label::after {
            position: absolute;
            content: "";
        }

        .toggle-label::before {
            width: 100%;
            height: 100%;
            border: 1px solid var(--panel-border-strong);
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.1);
            transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .toggle-label::after {
            top: 4px;
            left: 4px;
            width: 15px;
            height: 15px;
            border-radius: 50%;
            background: #d9dad7;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
            transition: background 0.2s ease, transform 0.2s ease;
        }

        input[type="checkbox"]:checked + .toggle-label::before {
            border-color: var(--accent-checked-border);
            background: var(--primary-accent);
            box-shadow: 0 0 14px var(--accent-glow);
        }

        input[type="checkbox"]:checked + .toggle-label::after {
            background: #fff7f0;
            transform: translateX(17px);
        }

        input[type="checkbox"]:disabled + .toggle-label::before,
        input[type="checkbox"]:disabled + .toggle-label::after {
            opacity: 0.42;
        }

        .color-feature {
            align-items: stretch;
            flex-direction: column;
            gap: 8px;
            padding: 11px;
        }

        .feat-head-multi,
        .color-sort {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            width: 100%;
        }

        .color-actions {
            display: flex;
            gap: 5px;
        }

        .color-actions button,
        .color-row button {
            display: inline-grid;
            width: 29px;
            height: 29px;
            place-items: center;
            padding: 0;
            border: 1px solid var(--panel-border-strong);
            border-radius: 8px;
            background: var(--panel-soft);
            color: var(--accent-strong);
            cursor: pointer;
            line-height: 1;
        }

        .color-actions button:hover {
            border-color: var(--accent-border);
            background: var(--accent-soft);
        }

        .color-actions svg {
            width: 15px;
            height: 15px;
        }

        .color-sort {
            color: var(--panel-muted);
            font-size: 10px;
        }

        #color-sort {
            padding: 5px 8px;
            border: 1px solid var(--panel-border);
            border-radius: 8px;
            background: rgba(10, 12, 15, 0.26);
            color: var(--panel-text);
            cursor: pointer;
            font-size: 10px;
        }

        .list {
            width: 100%;
            max-height: 148px;
            padding: 5px;
            overflow: auto;
            border: 1px solid var(--panel-border);
            border-radius: 10px;
            background: rgba(10, 12, 15, 0.24);
            text-align: center;
            scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
            scrollbar-width: thin;
        }

        .list .small {
            display: block;
            padding: 13px 7px;
            color: var(--panel-muted);
            font-size: 10px;
        }

        .color-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 6px;
            margin: 3px 0;
            padding: 5px 6px;
            border: 1px solid rgba(255, 255, 255, 0.07);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.04);
        }

        .color-row > span {
            color: var(--panel-muted);
            font-size: 12px;
        }

        input[type="color"] {
            width: 48px;
            height: 24px;
            padding: 2px;
            border: 1px solid var(--panel-border-strong);
            border-radius: 7px;
            background: transparent;
            cursor: pointer;
        }

        input[type="color"]::-moz-color-swatch,
        input[type="color"]::-webkit-color-swatch {
            border: none;
            border-radius: 4px;
        }

        input[type="color"]::-webkit-color-swatch-wrapper {
            padding: 0;
        }

        .color-row button {
            width: 23px;
            height: 23px;
            color: var(--panel-muted);
            font-size: 12px;
        }

        .color-row button:hover {
            border-color: rgba(201, 119, 112, 0.5);
            background: rgba(201, 119, 112, 0.14);
            color: #e99a92;
        }

        .setting-note {
            display: block;
            max-width: 132px;
            margin-top: 8px;
            color: var(--panel-muted);
            font-size: 10px;
            line-height: 1.45;
        }

        #s-options .feat-item > div:first-child {
            min-width: 0;
            flex: 1;
            padding-right: 14px;
        }

        .accent-actions {
            display: flex;
            align-items: center;
            gap: 6px;
            flex: 0 0 auto;
        }

        .reset-button {
            min-height: 24px;
            padding: 4px 7px;
            border: 1px solid var(--panel-border);
            border-radius: 7px;
            background: var(--panel-soft);
            color: var(--panel-muted);
            cursor: pointer;
            font-size: 10px;
        }

        .reset-button:hover {
            border-color: var(--panel-border-strong);
            background: rgba(255, 255, 255, 0.1);
            color: var(--panel-text);
        }

        #s-options.active {
            display: flex;
            flex-direction: column;
        }

        #s-options > .feat-item {
            flex-shrink: 0;
        }

        .panel-footer {
            display: flex;
            flex-shrink: 0;
            justify-content: center;
            gap: 8px;
            margin-top: auto;
            padding-top: 8px;
            border-top: 1px solid var(--panel-border);
        }

        .support-link {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            min-height: 32px;
            padding: 6px 10px;
            border: 1px solid transparent;
            border-radius: 9px;
            color: var(--panel-muted);
            font-size: 11px;
            font-weight: 550;
            line-height: 1.4;
            text-decoration: none;
            transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        }

        .support-link:hover,
        .support-link:focus-visible {
            border-color: var(--accent-border);
            background: var(--accent-soft);
            color: var(--accent-strong);
        }

        .support-link svg {
            display: block;
            width: 16px;
            height: 16px;
            flex: 0 0 auto;
            fill: currentColor;
        }

        .language-setting { gap: 12px; cursor: default; }
        #display-language {
            min-width: 0; max-width: 68%; padding: 7px 9px;
            border: 1px solid var(--panel-border); border-radius: 8px;
            background: var(--panel-soft); color: var(--panel-muted);
            opacity: 0.65; font-size: 11px; pointer-events: none;
        }
        .language-tooltip {
            position: absolute; z-index: 2; top: calc(100% + 5px);
            inset-inline: 0; padding: 10px 12px; border: 1px solid var(--panel-border-strong);
            border-radius: 9px; background: #20232a; color: var(--panel-text);
            font-size: 11px; font-weight: 400; line-height: 1.5;
            visibility: hidden; pointer-events: none;
        }
        .language-setting:hover .language-tooltip,
        .language-setting:focus-visible .language-tooltip { visibility: visible; }
        .language-setting:focus-visible { outline: 2px solid var(--accent-strong); outline-offset: 2px; }
        .toggle-text { line-height: 1.4; }
        .feat-item { gap: 8px; }
        .feat-item.child { margin-left: 0; margin-inline-start: 12px; }
        .feat-item.child::before { margin-right: 0; margin-inline-end: 9px; flex-shrink: 0; }
        #s-options .feat-item > div:first-child { padding-right: 0; padding-inline-end: 14px; }
        .cr-toolkit-settings[dir="rtl"] .close-button { right: auto; left: 0; }

        @keyframes panel-in {
            from { opacity: 0; transform: translateY(-5px) scale(0.985); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
                transition-duration: 0.01ms !important;
                animation-duration: 0.01ms !important;
            }
        }
    `;

    const PANEL_MARKUP = `
        <button class="control-button" type="button" aria-label="Settings" data-i18n-aria-label="Settings" aria-expanded="false" title="Settings" data-i18n-title="Settings">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7"/>
            </svg>
        </button>

        <div class="panel" role="dialog" aria-label="Settings" data-i18n-aria-label="Settings" aria-hidden="true">
            <div class="panel-inner">
                <div class="panel-header">
                    <img class="panel-logo" src="${LOGO_URL}" alt="CR Toolkit">
                    <button class="close-button" type="button" aria-label="Close settings" data-i18n-aria-label="Close settings">×</button>
                </div>

                <div class="navbar">
                    <button class="nav-btn" data-section="s-general" type="button" data-i18n="General">General</button>
                    <button class="nav-btn" data-section="s-appearance" type="button" data-i18n="Appearance">Appearance</button>
                    <button class="nav-btn" data-section="s-options" type="button" data-i18n="Options">Options</button>
                </div>

                <div class="section-container">
                    <div class="section-page" id="s-general">
                        <div class="feat-item">
                            <span class="toggle-text" id="toggle-player-resize-text" data-i18n="Player Resize">Player Resize</span>
                            <input type="checkbox" id="toggle-player-resize" aria-labelledby="toggle-player-resize-text">
                            <label for="toggle-player-resize" class="toggle-label"></label>
                        </div>
                        <div class="feat-item">
                            <span class="toggle-text" id="toggle-auto-skip-text" data-i18n="Auto Skip OP/ED">Auto Skip OP/ED</span>
                            <input type="checkbox" id="toggle-auto-skip" aria-labelledby="toggle-auto-skip-text">
                            <label for="toggle-auto-skip" class="toggle-label"></label>
                        </div>
                        <div class="feat-item">
                            <span class="toggle-text" id="toggle-better-search-text" data-i18n="Better Search">Better Search</span>
                            <input type="checkbox" id="toggle-better-search" aria-labelledby="toggle-better-search-text">
                            <label for="toggle-better-search" class="toggle-label"></label>
                        </div>
                        <div class="feat-item child">
                            <span class="toggle-text" id="toggle-better-search-icons-text" data-i18n="Use Icons instead">Use Icons instead</span>
                            <input type="checkbox" id="toggle-better-search-icons" aria-labelledby="toggle-better-search-icons-text" disabled>
                            <label for="toggle-better-search-icons" class="toggle-label"></label>
                        </div>
                        <div class="feat-item">
                            <span class="toggle-text" id="toggle-better-calender-text" data-i18n="Better Calender">Better Calender</span>
                            <input type="checkbox" id="toggle-better-calender" aria-labelledby="toggle-better-calender-text">
                            <label for="toggle-better-calender" class="toggle-label"></label>
                        </div>
                    </div>

                    <div class="section-page" id="s-appearance">
                        <div class="feat-item color-feature">
                            <div class="feat-head-multi">
                                <span class="toggle-text" data-i18n="Colors">Colors</span>
                                <div class="color-actions">
                                    <button id="btn-add-page-colors" type="button" title="Add all colors from the current Crunchyroll page" data-i18n-title="Add all colors from the current Crunchyroll page" aria-label="Add all colors from the current Crunchyroll page" data-i18n-aria-label="Add all colors from the current Crunchyroll page">
                                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                                    </button>
                                    <button id="btn-add-color" type="button" title="Add a color" data-i18n-title="Add a color" aria-label="Add a color" data-i18n-aria-label="Add a color">+</button>
                                </div>
                            </div>
                            <div class="color-sort">
                                <label for="color-sort" data-i18n="Sort by">Sort by</label>
                                <select id="color-sort">
                                    <option value="added" data-i18n="Added">Added</option>
                                    <option value="color" data-i18n="Color">Color</option>
                                </select>
                            </div>
                            <div class="list" id="list-colors"><span class="small" data-i18n="Add the colors you want to change">Add the colors you want to change</span></div>
                        </div>
                        <div class="feat-item">
                            <span class="toggle-text" id="toggle-hide-header-text" data-i18n="Hide Header on Playback">Hide Header on Playback</span>
                            <input type="checkbox" id="toggle-hide-header" aria-labelledby="toggle-hide-header-text">
                            <label for="toggle-hide-header" class="toggle-label"></label>
                        </div>
                        <div class="feat-item">
                            <span class="toggle-text" id="toggle-change-header-text" data-i18n="Change Header">Change Header</span>
                            <input type="checkbox" id="toggle-change-header" aria-labelledby="toggle-change-header-text">
                            <label for="toggle-change-header" class="toggle-label"></label>
                        </div>
                        <div class="feat-item child">
                            <span class="toggle-text" id="toggle-change-header-logo-text" data-i18n="Remove: Logo">Remove: Logo</span>
                            <input type="checkbox" id="toggle-change-header-logo" aria-labelledby="toggle-change-header-logo-text">
                            <label for="toggle-change-header-logo" class="toggle-label"></label>
                        </div>
                        <div class="feat-item child">
                            <span class="toggle-text" id="toggle-change-header-new-text" data-i18n="Remove: New">Remove: New</span>
                            <input type="checkbox" id="toggle-change-header-new" aria-labelledby="toggle-change-header-new-text">
                            <label for="toggle-change-header-new" class="toggle-label"></label>
                        </div>
                        <div class="feat-item child">
                            <span class="toggle-text" id="toggle-change-header-popular-text" data-i18n="Remove: Popular">Remove: Popular</span>
                            <input type="checkbox" id="toggle-change-header-popular" aria-labelledby="toggle-change-header-popular-text">
                            <label for="toggle-change-header-popular" class="toggle-label"></label>
                        </div>
                        <div class="feat-item child">
                            <span class="toggle-text" id="toggle-change-header-simulcast-text" data-i18n="Remove: Simulcast">Remove: Simulcast</span>
                            <input type="checkbox" id="toggle-change-header-simulcast" aria-labelledby="toggle-change-header-simulcast-text">
                            <label for="toggle-change-header-simulcast" class="toggle-label"></label>
                        </div>
                        <div class="feat-item child">
                            <span class="toggle-text" id="toggle-change-header-categories-text" data-i18n="Remove: Categories">Remove: Categories</span>
                            <input type="checkbox" id="toggle-change-header-categories" aria-labelledby="toggle-change-header-categories-text">
                            <label for="toggle-change-header-categories" class="toggle-label"></label>
                        </div>
                        <div class="feat-item child">
                            <span class="toggle-text" id="toggle-change-header-games-text" data-i18n="Remove: Games">Remove: Games</span>
                            <input type="checkbox" id="toggle-change-header-games" aria-labelledby="toggle-change-header-games-text">
                            <label for="toggle-change-header-games" class="toggle-label"></label>
                        </div>
                        <div class="feat-item child">
                            <span class="toggle-text" id="toggle-change-header-store-text" data-i18n="Remove: Store">Remove: Store</span>
                            <input type="checkbox" id="toggle-change-header-store" aria-labelledby="toggle-change-header-store-text">
                            <label for="toggle-change-header-store" class="toggle-label"></label>
                        </div>
                        <div class="feat-item child">
                            <span class="toggle-text" id="toggle-change-header-news-text" data-i18n="Remove: News">Remove: News</span>
                            <input type="checkbox" id="toggle-change-header-news" aria-labelledby="toggle-change-header-news-text">
                            <label for="toggle-change-header-news" class="toggle-label"></label>
                        </div>
                    </div>

                    <div class="section-page" id="s-options">
                        <div class="feat-item language-setting" tabindex="0" aria-describedby="language-sync-note">
                            <label class="toggle-text" for="display-language" data-i18n="Language">Language</label>
                            <select id="display-language" disabled aria-describedby="language-sync-note"></select>
                            <span class="language-tooltip" id="language-sync-note" role="tooltip" data-i18n="Synced with Crunchyroll’s display language. Change it in your Crunchyroll account preferences."></span>
                        </div>
                        <div class="feat-item">
                            <div>
                                <div class="toggle-text" data-i18n="Accent color">Accent color</div>
                                <div class="setting-note" data-i18n="Shared by this panel, Better Search and the calendar. Site color mappings take priority in the calendar.">Shared by this panel, Better Search and the calendar. Site color mappings take priority in the calendar.</div>
                            </div>
                            <div class="accent-actions">
                                <input type="color" id="accent-color" value="#ff6f00" aria-label="Accent color" data-i18n-aria-label="Accent color">
                                <button class="reset-button" id="reset-accent-color" type="button" data-i18n="Reset">Reset</button>
                            </div>
                        </div>
                        <footer class="panel-footer">
                            <a class="support-link" href="https://github.com/DarkPlugins/CR-Toolkit/issues" target="_blank" rel="noopener noreferrer" title="Bug reports" data-i18n-title="Bug reports">
                                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                                    <path d="M7 0V1.60002C7.32311 1.53443 7.65753 1.5 8 1.5C8.34247 1.5 8.67689 1.53443 9 1.60002V0H11V2.49963C11.8265 3.12041 12.4543 3.99134 12.7711 5H3.2289C3.5457 3.99134 4.17354 3.12041 5 2.49963V0H7Z"/>
                                    <path d="M0 7V9H3V10.4957L0.225279 11.2885L0.774721 13.2115L3.23189 12.5095C3.87194 14.5331 5.76467 16 8 16C10.2353 16 12.1281 14.5331 12.7681 12.5095L15.2253 13.2115L15.7747 11.2885L13 10.4957V9H16V7H9V12H7V7H0Z"/>
                                </svg>
                                <span data-i18n="Bug reports">Bug reports</span>
                            </a>
                            <a class="support-link" href="https://github.com/DarkPlugins/CR-Toolkit/discussions/new/choose" target="_blank" rel="noopener noreferrer" title="Feedback" data-i18n-title="Feedback">
                                <svg viewBox="0 0 128 128" aria-hidden="true" focusable="false">
                                    <path d="M86.5,114.1c-0.5,2.9-3,4.9-5.9,4.9H34v8h46.6c6.8,0,12.6-4.9,13.8-11.5l6.4-36c0.7-4.1-0.4-8.3-3-11.4 c-2.7-3.2-6.6-5-10.7-5H71.2c1.2-3.7,2.8-9.1,4.1-16.2l0.6-4.2c0.9-6.6-3.7-12.6-10.2-13.5c-3.2-0.4-6.3,0.4-8.9,2.3 c-2.6,1.9-4.2,4.8-4.7,7.9l-0.6,4c-0.1,0.5-0.2,1-0.2,1.5c-0.1,0.5-0.2,1-0.3,1.5C47.9,61,36.3,72.8,21.3,76.6L16,77.9V127h8V84.1 c17.5-4.7,31.2-18.7,34.9-36c0.1-0.6,0.2-1.2,0.4-1.8c0.1-0.6,0.2-1.2,0.3-1.8l0.6-4c0.1-1.1,0.7-2,1.6-2.6c0.9-0.6,1.9-0.9,3-0.8 c2.2,0.3,3.7,2.3,3.4,4.5l-0.5,3.9c-2.1,11.6-5,18.3-5.5,19.6l-0.3,0.8l0,5.2h25.5c1.8,0,3.5,0.8,4.6,2.1c1.1,1.4,1.6,3.2,1.3,4.9 L86.5,114.1z"/>
                                </svg>
                                <span data-i18n="Feedback">Feedback</span>
                            </a>
                        </footer>
                    </div>
                </div>
            </div>
        </div>
    `;

    let control = null;
    let shadow = null;
    let observer = null;

    function getHeaderActions() {
        return document.querySelector(".header-actions, #header_userpanel_beta");
    }

    function closePanel() {
        const panel = shadow?.querySelector(".panel");
        const button = shadow?.querySelector(".control-button");
        if (!panel || !button) return;
        panel.classList.remove("open");
        panel.setAttribute("aria-hidden", "true");
        button.setAttribute("aria-expanded", "false");
    }

    function togglePanel() {
        const panel = shadow?.querySelector(".panel");
        const button = shadow?.querySelector(".control-button");
        if (!panel || !button) return;
        const open = !panel.classList.contains("open");
        panel.classList.toggle("open", open);
        panel.setAttribute("aria-hidden", String(!open));
        button.setAttribute("aria-expanded", String(open));
    }

    function localizePanel() {
        if (!shadow) return;
        i18n.apply(shadow);
        const root = shadow.querySelector('.cr-toolkit-settings');
        root.lang = i18n.locale;
        root.dir = i18n.direction;
        const select = shadow.querySelector('#display-language');
        const option = document.createElement('option');
        option.value = i18n.locale;
        option.textContent = i18n.locales[i18n.locale];
        select.replaceChildren(option);
    }
    i18n.subscribe(localizePanel);

    function createControl() {
        control = document.createElement("div");
        control.className = "nav-horizontal-layout__action-item--KZBne";
        control.setAttribute(CONTROL_ATTRIBUTE, "true");
        control.style.setProperty("display", "flex", "important");
        control.style.setProperty("align-items", "center", "important");
        control.style.setProperty("justify-content", "center", "important");
        control.style.setProperty("align-self", "center", "important");
        control.style.setProperty("line-height", "0", "important");
        shadow = control.attachShadow({ mode: "open" });
        shadow.innerHTML = `<style>${PANEL_CSS}</style><div class="${PANEL_CLASS}">${PANEL_MARKUP}</div>`;

        shadow.querySelector(".control-button").addEventListener("click", event => {
            event.stopPropagation();
            togglePanel();
        });
        shadow.querySelector(".close-button").addEventListener("click", closePanel);
        window.CRToolkit.Popup.init(shadow);
        localizePanel();
    }

    function ensureControl() {
        const headerActions = getHeaderActions();
        if (!headerActions) return;

        if (!control || !control.isConnected) {
            const existing = document.querySelector(`[${CONTROL_ATTRIBUTE}]`);
            if (existing) {
                control = existing;
                shadow = control.shadowRoot;
            } else {
                createControl();
            }
        }

        if (control.parentElement !== headerActions || headerActions.firstElementChild !== control) {
            headerActions.prepend(control);
        }
    }

    function handleDocumentClick(event) {
        if (control && !event.composedPath().includes(control)) closePanel();
    }

    function handleKeydown(event) {
        if (event.key === "Escape") closePanel();
    }

    function initSettingsPanel() {
        if (observer) return;
        document.addEventListener("click", handleDocumentClick, true);
        document.addEventListener("keydown", handleKeydown, true);
        observer = new MutationObserver(ensureControl);
        observer.observe(document.documentElement, { childList: true, subtree: true });
        ensureControl();
    }

    window.CRToolkit = window.CRToolkit || {};
    window.CRToolkit.SettingsPanel = {
        init: initSettingsPanel
    };
})();
