(() => {
    const isPath = path => /(^|\/)simulcastcalendar\/?$/i.test(String(path || ""));
    const audioCodes = {
        JAJP: "ja-JP", DEDE: "de-DE", ENUS: "en-US", FRFR: "fr-FR",
        ESES: "es-ES", ESLA: "es-419", ES419: "es-419", PTBR: "pt-BR",
        PTPT: "pt-PT", ITIT: "it-IT", RURU: "ru-RU", ARSA: "ar-SA",
        HIIN: "hi-IN", KOKR: "ko-KR", ZHCN: "zh-CN", ZHTW: "zh-TW",
        PLPL: "pl-PL", THTH: "th-TH", IDID: "id-ID", TATR: "ta-IN",
        TAIN: "ta-IN", TEIN: "te-IN", MSMY: "ms-MY"
    };

    function getAvailability(card) {
        // Use release-specific data. A series can have several separate dub releases.
        const audio = card.getAttribute("data-audio-locale");
        const subtitles = card.getAttribute("data-subtitle-locales");
        let locale = audio || "";
        if (!locale) {
            const urls = [card.getAttribute("data-popover-url"),
                ...Array.from(card.querySelectorAll('a[href*="/watch/"]'), link => link.getAttribute("href"))];
            for (const url of urls) {
                // Only recognize the structured ID format, never a title or random GUID suffix.
                const match = String(url || "").match(/\/(?:watch|popover)\/G[ES]\d{8}([A-Z0-9]{4,5})(?:[/?#]|$)/i);
                if (match && audioCodes[match[1].toUpperCase()]) {
                    locale = audioCodes[match[1].toUpperCase()];
                    break;
                }
            }
        }
        return {
            audioLocales: locale ? [locale] : [],
            subtitleLocales: subtitles ? subtitles.split(/[\s,]+/).filter(Boolean) : [],
            hasDub: locale ? !/^ja(?:-|$)/i.test(locale) : null,
            hasSub: subtitles ? true : null
        };
    }

    window.CRToolkit = window.CRToolkit || {};
    window.CRToolkit.CalendarData = { isPath, getAvailability };
})();
