(() => {
    const catalogs = window.CRToolkitMessages;
    const locales = {
        'en-US': 'English (US)', 'id-ID': 'Bahasa Indonesia', 'de-DE': 'Deutsch',
        'es-419': 'Español (América Latina)', 'es-ES': 'Español (España)',
        'fr-FR': 'Français', 'it-IT': 'Italiano', 'pt-BR': 'Português (Brasil)',
        'pt-PT': 'Português (Portugal)', 'ru-RU': 'Русский', 'ar-SA': 'العربية',
        'hi-IN': 'हिंदी', 'ko-KR': '한국어', 'pl-PL': 'Polski', 'th-TH': 'ไทย', 'zh-TW': '中文 (繁體)'
    };
    const aliases = {en: 'en-US', id: 'id-ID', de: 'de-DE', es: 'es-419', 'es-la': 'es-419',
        fr: 'fr-FR', it: 'it-IT', pt: 'pt-BR', ru: 'ru-RU', ar: 'ar-SA', 'ar-me': 'ar-SA',
        hi: 'hi-IN', ko: 'ko-KR', pl: 'pl-PL', th: 'th-TH', zh: 'zh-TW', 'zh-hant': 'zh-TW'};
    function normalize(value) {
        const code = String(value || '').trim().replaceAll('_', '-').toLowerCase();
        return Object.keys(locales).find(locale => locale.toLowerCase() === code) ||
            (Object.hasOwn(aliases, code) ? aliases[code] : null);
    }
    function detect() {
        const html = document.documentElement?.lang;
        const route = location.pathname.split('/')[1];
        // HTML reflects Crunchyroll's display setting. A route can refine a short
        // language tag (e.g. pt + /pt-pt/), but cannot override another language.
        const language = normalize(html);
        const routed = normalize(route);
        if (language) return !html.includes('-') && routed?.split('-')[0] === language.split('-')[0]
            ? routed : language;
        return routed || 'en-US';
    }
    let locale = detect();
    const listeners = new Set();
    let displayNames;
    function t(key, values = {}) {
        const message = catalogs[locale]?.[key] ?? catalogs['en-US'][key] ?? key;
        return message.replace(/\{(\w+)\}/g, (token, name) => String(values[name] ?? token));
    }
    function languageName(code) {
        if (!code) return t('All');
        try {
            displayNames ||= new Intl.DisplayNames([locale], {type: 'language'});
            return displayNames.of(code) || code;
        } catch (_) { return locales[code] || code; }
    }
    function apply(root) {
        const elements = selector => [
            ...(root.matches?.(selector) ? [root] : []), ...root.querySelectorAll(selector)
        ];
        elements('[data-i18n]').forEach(element => {
            const value = t(element.dataset.i18n);
            if (element.textContent !== value) element.textContent = value;
        });
        ['title', 'aria-label', 'placeholder'].forEach(attribute => {
            elements(`[data-i18n-${attribute}]`).forEach(element => {
                const value = t(element.getAttribute(`data-i18n-${attribute}`));
                if (element.getAttribute(attribute) !== value) element.setAttribute(attribute, value);
            });
        });
    }
    function refresh() {
        const next = detect();
        if (next === locale) return;
        locale = next;
        displayNames = null;
        listeners.forEach(listener => listener());
    }
    window.CRToolkit ||= {};
    window.CRToolkit.I18n = {t, apply, normalize, languageName, refresh, locales,
        get locale() { return locale; }, get direction() { return locale === 'ar-SA' ? 'rtl' : 'ltr'; },
        subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
    };
    function observe() {
        if (!document.documentElement) return;
        new MutationObserver(refresh).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});
        refresh();
    }
    if (document.documentElement) observe();
    else document.addEventListener('DOMContentLoaded', observe, {once: true});
    window.addEventListener('popstate', refresh);
    window.addEventListener('pageshow', refresh);
    // Also handles SPA navigation that refines regional routes without changing lang.
    window.setInterval(() => { if (!document.hidden) refresh(); }, 1000);
})();
