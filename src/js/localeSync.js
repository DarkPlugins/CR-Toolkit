// Extension-only bridge for the small toolbar popup. The in-page UI always
// resolves its own tab's current display language; this cache never overrides it.
(() => {
    const i18n = window.CRToolkit.I18n;
    const remember = () => chrome.storage.local.set({displayLocale: i18n.locale}).catch(() => {});
    remember();
    i18n.subscribe(remember);
    chrome.runtime.onMessage.addListener((message, sender, respond) => {
        if (message.type !== 'CR_TOOLKIT_GET_DISPLAY_LOCALE') return;
        i18n.refresh();
        respond({locale: i18n.locale});
    });
})();
