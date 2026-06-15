const STORAGE_KEY = "cr-better-search-filters";

const LANGUAGES = {
    "": "Alle",
    "de-DE": "Deutsch",
    "en-US": "English",
    "ja-JP": "Japanisch",
    "fr-FR": "Französisch",
    "es-ES": "Spanisch",
    "es-419": "Spanisch (LATAM)",
    "pt-BR": "Portugiesisch",
    "it-IT": "Italienisch",
    "ru-RU": "Russisch",
    "ar-SA": "Arabisch"
};

let dubFilter = "";
let subFilter = "";

function initBetterSearch() {
    loadFilters();
    injectUI();
    observeSearchContainer();
}

function loadFilters() {
    const data = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "{}"
    );

    dubFilter = data.dub || "";
    subFilter = data.sub || "";
}

function saveFilters() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
            dub: dubFilter,
            sub: subFilter
        })
    );
}

function injectUI() {
    if (document.querySelector("#cr-better-search")) {
        return;
    }

    const wrapper = document.querySelector(
        ".search-field-wrapper"
    );

    if (!wrapper) {
        return;
    }

    const container = document.createElement("div");

    container.id = "cr-better-search";

    container.style.marginTop = "12px";
    container.style.display = "flex";
    container.style.gap = "12px";
    container.style.flexWrap = "wrap";

    const dubSelect = createSelect(
        "Dub",
        dubFilter,
        value => {
            dubFilter = value;
            saveFilters();
            reloadSearch();
        }
    );

    const subSelect = createSelect(
        "Subs",
        subFilter,
        value => {
            subFilter = value;
            saveFilters();
            reloadSearch();
        }
    );

    container.appendChild(dubSelect);
    container.appendChild(subSelect);

    wrapper.insertAdjacentElement(
        "afterend",
        container
    );
}

function createSelect(label, selected, onChange) {
    const wrapper = document.createElement("div");

    const text = document.createElement("div");
    text.textContent = label;

    const select = document.createElement("select");

    Object.entries(LANGUAGES).forEach(([code, name]) => {
        const option = document.createElement("option");

        option.value = code;
        option.textContent = name;

        if (code === selected) {
            option.selected = true;
        }

        select.appendChild(option);
    });

    select.addEventListener("change", e => {
        onChange(e.target.value);
    });

    wrapper.appendChild(text);
    wrapper.appendChild(select);

    return wrapper;
}

function observeSearchContainer() {
    const observer = new MutationObserver(() => {
        if (!document.querySelector("#cr-better-search")) {
            injectUI();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function reloadSearch() {
    const input = document.querySelector(
        'input[type="search"]'
    );

    if (!input) {
        return;
    }

    const value = input.value;

    input.dispatchEvent(
        new Event("input", {
            bubbles: true
        })
    );

    setTimeout(() => {
        input.value = value + " ";
        input.dispatchEvent(
            new Event("input", {
                bubbles: true
            })
        );

        setTimeout(() => {
            input.value = value;
            input.dispatchEvent(
                new Event("input", {
                    bubbles: true
                })
            );
        }, 50);
    }, 50);
}

// Fetch + XHR Interceptor speziell für /content/v2/discover/search
(function interceptCrunchyrollSearchAll() {
  const targetPath = "/de/search";

  // --- Fetch interceptor ---
  if (window.fetch) {
    const origFetch = window.fetch.bind(window);
    window.fetch = async function(input, init = {}) {
      const requestUrl = typeof input === "string" ? input : (input && input.url);
      const method = (init && init.method) || (typeof input === "object" && input.method) || "GET";

      // Log outgoing matching request
      if (requestUrl && requestUrl.includes(targetPath)) {
        console.log("[Request sent]", { url: requestUrl, method, init });
      }

      const res = await origFetch(input, init);

      try {
        if (method.toUpperCase() === "GET" && requestUrl && requestUrl.includes(targetPath)) {
          let body;
          try { body = await res.clone().json(); }
          catch (e) { body = await res.clone().text(); }
          const headers = {};
          res.headers.forEach((v, k) => headers[k] = v);
          console.log("[Response received]", { url: requestUrl, status: res.status, headers, body });
        }
      } catch (err) {
        console.error("Fetch interceptor error", err);
      }

      return res;
    };
  }

  // --- XHR interceptor ---
  (function() {
    const XHR = window.XMLHttpRequest;
    if (!XHR) return;
    const origOpen = XHR.prototype.open;
    const origSend = XHR.prototype.send;

    XHR.prototype.open = function(method, url, ...rest) {
      this.__intercept_method = method;
      this.__intercept_url = url;
      return origOpen.call(this, method, url, ...rest);
    };

    XHR.prototype.send = function(body) {
      try {
        const url = this.__intercept_url;
        const method = this.__intercept_method || "GET";
        if (url && url.includes(targetPath)) {
          console.log("[XHR request sent]", { url, method, body });
          this.addEventListener("load", function() {
            try {
              const ct = this.getResponseHeader("content-type") || "";
              let parsed = this.response;
              if (ct.includes("application/json")) {
                try { parsed = JSON.parse(this.responseText); } catch(e){ parsed = this.responseText; }
              }
              console.log("[XHR response received]", { url, status: this.status, response: parsed });
            } catch (e) { console.error("XHR parse error", e); }
          });
          this.addEventListener("error", () => console.error("[XHR error]", { url }));
        }
      } catch (e) { console.error("XHR interceptor setup error", e); }
      return origSend.call(this, body);
    };
  })();

  console.log("Crunchyroll search interceptors installed for path:", targetPath);
})();



window.CRToolkit = window.CRToolkit || {};
window.CRToolkit.initBetterSearch = initBetterSearch;