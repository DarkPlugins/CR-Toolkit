(() => {
    const i18n = window.CRToolkit.I18n;
    function render(locale) {
        document.documentElement.lang = i18n.normalize(locale) || 'en-US';
        i18n.refresh();
        document.documentElement.dir = i18n.direction;
        i18n.apply(document);
    }
    async function init() {
        const cached = await chrome.storage.local.get('displayLocale');
        render(cached.displayLocale);
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (!tab?.id || !/^https?:\/\/www\.crunchyroll\.com\//.test(tab.url || '')) return;
            const response = await chrome.tabs.sendMessage(tab.id, {type: 'CR_TOOLKIT_GET_DISPLAY_LOCALE'});
            render(response?.locale);
        } catch (_) { /* An existing tab may need reloading after extension updates. */ }
    }
    init();
})();
