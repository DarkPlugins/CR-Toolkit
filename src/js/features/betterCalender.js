(() => {
    let initialized = false;
    let settings = {};
    const keys = ["color_mappings", "popup_accent_color", "enabled_better_calender"];
    const originalLinks = new Map();
    const isCalendar = () => /(^|\/)simulcastcalendar\/?$/i.test(location.pathname);
    const css = `
        html.cr-calendar { color-scheme: dark; }
        html.cr-calendar body,
        html.cr-calendar #template_scroller,
        html.cr-calendar #template_container,
        html.cr-calendar #template_body {
            background: var(--cr-calendar-background) !important;
            color: var(--cr-calendar-text) !important;
        }
        html.cr-calendar body { margin: 0; font-family: Lato, Arial, sans-serif; }
        html.cr-calendar #template_container { width: 100%; max-width: 1600px; }
        html.cr-calendar #template_scroller { margin: 0; padding: 24px clamp(12px, 3vw, 48px); }
        html.cr-calendar #header_beta {
            background: var(--cr-calendar-header) !important;
            color: var(--cr-calendar-text); border: 0; box-shadow: none;
        }
        html.cr-calendar #header_container { width: auto; max-width: none; padding: 0 24px; }
        html.cr-calendar #header_container .header-navigation { display: flex; align-items: center; padding: 0; }
        html.cr-calendar #header_userpanel_beta { display: flex; align-items: center; margin-left: auto; }
        html.cr-calendar #header_userpanel_beta > ul { display: flex; align-items: center; }
        html.cr-calendar #header_container li,
        html.cr-calendar #header_container .header-icon { background: transparent !important; }
        html.cr-calendar #header_container a,
        html.cr-calendar #header_container .caption { color: var(--cr-calendar-muted) !important; }
        html.cr-calendar #header_container a:hover { color: var(--cr-calendar-accent) !important; }
        html.cr-calendar #header_container svg { fill: currentColor; }
        html.cr-calendar #home_link {
            display: block; background-color: var(--cr-calendar-accent);
            mask: url('/i/svg/logo.svg') center / contain no-repeat;
            -webkit-mask: url('/i/svg/logo.svg') center / contain no-repeat;
        }
        html.cr-calendar #home_link img { opacity: 0; }
        html.cr-calendar .simulcast-calendar { padding-top: 12px; }
        html.cr-calendar .simulcast-calendar .calendar { font-family: inherit; color: var(--cr-calendar-muted); }
        html.cr-calendar .simulcast-calendar .mode-button {
            background: var(--cr-calendar-surface); color: var(--cr-calendar-accent);
            border-radius: 4px; border: 1px solid var(--cr-calendar-border);
        }
        html.cr-calendar .simulcast-calendar .mode-button svg { fill: currentColor; }
        html.cr-calendar .simulcast-calendar .mode-button.active {
            background: var(--cr-calendar-accent); color: var(--cr-calendar-background); border-color: transparent;
        }
        html.cr-calendar .simulcast-calendar .filter-toggle,
        html.cr-calendar .simulcast-calendar .premium-message { color: var(--cr-calendar-muted); }
        html.cr-calendar .simulcast-calendar .premium-message { background: var(--cr-calendar-surface); text-shadow: none; }
        html.cr-calendar .simulcast-calendar input { accent-color: var(--cr-calendar-accent); }
        html.cr-calendar .simulcast-calendar a { color: var(--cr-calendar-text); }
        html.cr-calendar .simulcast-calendar a:hover { color: var(--cr-calendar-accent); }
        html.cr-calendar .calendar > .viewport { overflow-x: auto; padding: 0; }
        html.cr-calendar .calendar .days { display: table; border-spacing: 8px 0; }
        html.cr-calendar .calendar .day { min-width: 155px; padding: 0; background: transparent; }
        html.cr-calendar .calendar .day.active { min-width: 190px; }
        html.cr-calendar .calendar .calendar-day { background: transparent; }
        html.cr-calendar .calendar .day-date {
            background: var(--cr-calendar-surface); color: var(--cr-calendar-text);
            border-bottom: 2px solid var(--cr-calendar-border); border-radius: 4px 4px 0 0;
            margin-bottom: 12px; padding: 12px 6px;
        }
        html.cr-calendar .calendar .today .day-date { border-color: var(--cr-calendar-accent); }
        html.cr-calendar .calendar .day-name { color: var(--cr-calendar-text); }
        html.cr-calendar .calendar .specific-date { color: var(--cr-calendar-muted); }
        html.cr-calendar .calendar .release {
            margin: 0 0 10px; padding: 12px; background: var(--cr-calendar-surface);
            border: 1px solid var(--cr-calendar-border); border-radius: 4px;
        }
        html.cr-calendar .calendar .release:hover { border-color: var(--cr-calendar-accent); }
        html.cr-calendar .calendar .release::before,
        html.cr-calendar .calendar .release::after { display: none; }
        html.cr-calendar .calendar .day-content { padding: 0 0 24px; }
        html.cr-calendar .calendar .season-name { font-size: 13px; line-height: 1.45; text-transform: none; }
        html.cr-calendar .calendar cite { font-style: normal; }
        html.cr-calendar .calendar .season-name a { color: var(--cr-calendar-text); }
        html.cr-calendar .calendar .available-time,
        html.cr-calendar .calendar .availability,
        html.cr-calendar .calendar .availability a { color: var(--cr-calendar-muted); font-size: 12px; }
        html.cr-calendar .calendar .available-time { margin-bottom: 6px; }
        html.cr-calendar .calendar .poster-image,
        html.cr-calendar .calendar .thumbnail { max-width: 100%; border-radius: 3px; }
        html.cr-calendar .calendar .featured-episode { border-color: var(--cr-calendar-border); }
        html.cr-calendar .calendar .upcoming .episode-info,
        html.cr-calendar .calendar progress { background: var(--cr-calendar-header); color: var(--cr-calendar-muted); }
        html.cr-calendar .calendar progress::-webkit-progress-value { background: var(--cr-calendar-accent); }
        html.cr-calendar .calendar .pagination-arrow { background: var(--cr-calendar-surface); box-shadow: none; }
        html.cr-calendar .calendar .pagination-arrow svg,
        html.cr-calendar .calendar .queue-flag { fill: var(--cr-calendar-accent); }
        html.cr-calendar .calendar .pagination-arrow:hover { background: var(--cr-calendar-header); }
        html.cr-calendar .simulcast-calendar-footer,
        html.cr-calendar #footer_menu { background: var(--cr-calendar-surface); color: var(--cr-calendar-muted); }
        html.cr-calendar #footer_menu a { color: var(--cr-calendar-muted); }
        html.cr-calendar #footer_menu h6 { color: var(--cr-calendar-text); }
        html.cr-calendar .qtip,
        html.cr-calendar .qtip-content,
        html.cr-calendar .season-popover-content {
            background: var(--cr-calendar-surface); color: var(--cr-calendar-text); border-color: var(--cr-calendar-border);
        }
        html.cr-calendar .season-popover-content a { color: var(--cr-calendar-text); }
        html.cr-calendar.cr-better-search-modal-open [data-cr-toolkit-control] { visibility: hidden; }
        html.cr-calendar [data-cr-calendar-hidden] { display: none !important; }
        #cr-calendar-filter-status { margin: 12px 0; color: var(--cr-calendar-muted, #a0a0a0); font: 13px/1.5 Arial, sans-serif; }
        @media (max-width: 700px) {
            html.cr-calendar #header_container { padding: 0 8px; }
            html.cr-calendar #header_container .header-navigation { flex-wrap: wrap; }
            html.cr-calendar #template_scroller { padding: 16px 8px; }
        }
    `;

    function applyColors() {
        const mappings = Array.isArray(settings.color_mappings) ? settings.color_mappings : [];
        const mapped = color => mappings.find(item => item?.from?.toLowerCase() === color)?.to || color;
        const colors = {
            background: mapped("#000000"), header: mapped("#23252b"),
            surface: mapped("#141519"), text: mapped("#ffffff"),
            muted: mapped("#a0a0a0"), border: mapped("#2f3138"),
            accent: mapped("#ff640a")
        };
        // An explicit site-orange mapping wins; otherwise share the Toolkit accent setting.
        if (colors.accent === "#ff640a" && /^#[\da-f]{6}$/i.test(settings.popup_accent_color || "")) {
            colors.accent = settings.popup_accent_color;
        }
        for (const [name, value] of Object.entries(colors)) {
            if (/^#[\da-f]{6}$/i.test(value)) document.documentElement.style.setProperty(`--cr-calendar-${name}`, value);
        }
    }

    function apply() {
        const active = isCalendar() && settings.enabled_better_calender !== false;
        document.documentElement.classList.toggle("cr-calendar", active);
        if (!active) {
            for (const [link, {original, applied}] of originalLinks) {
                if (link.getAttribute("href") === applied) link.setAttribute("href", original);
            }
            originalLinks.clear();
            return;
        }
        // The legacy pagination points at the unlocalized route. Keep locale, filter and date.
        const prefix = location.pathname.replace(/\/simulcastcalendar\/?$/i, "");
        document.querySelectorAll('.simulcast-calendar a[href]').forEach(link => {
            const url = new URL(link.href, location.href);
            if (url.origin !== location.origin || !/^(?:\/[a-z]{2}(?:-[a-z\d]+)*)?\/simulcastcalendar\/?$/i.test(url.pathname)) return;
            const path = `${prefix}/simulcastcalendar${url.search}${url.hash}`;
            if (link.getAttribute("href") !== path) {
                const previous = originalLinks.get(link);
                originalLinks.set(link, {original: previous?.original ?? link.getAttribute("href"), applied: path});
                link.setAttribute("href", path);
            }
        });
        for (const link of originalLinks.keys()) if (!link.isConnected) originalLinks.delete(link);
    }

    function init() {
        if (initialized) return;
        initialized = true;
        const style = document.createElement("style");
        style.id = "cr-calendar-style";
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
        applyColors();
        chrome.storage.sync.get(keys, data => { settings = data; applyColors(); apply(); });
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== "sync") return;
            for (const key of keys) if (changes[key]) settings[key] = changes[key].newValue;
            if (keys.some(key => changes[key])) applyColors();
            if (changes.enabled_better_calender) apply();
        });
        new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true });
        window.addEventListener("cr-toolkit-route-change", apply);
        window.addEventListener("popstate", apply);
        apply();
    }
    window.CRToolkit = window.CRToolkit || {};
    window.CRToolkit.BetterCalender = { init, apply };
})();
