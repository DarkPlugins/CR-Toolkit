// Parse simple CSS colors (hex, rgb/rgba). Returns {r,g,b,a} or null.
function parseColor(cssColor) {
  if (!cssColor) return null;
  cssColor = cssColor.trim();
  const rgbMatch = cssColor.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)$/i);
  if (rgbMatch) return { r: +rgbMatch[1], g: +rgbMatch[2], b: +rgbMatch[3], a: rgbMatch[4] !== undefined ? +rgbMatch[4] : 1 };
  const hexMatch = cssColor.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    return { r: parseInt(hex.slice(0,2),16), g: parseInt(hex.slice(2,4),16), b: parseInt(hex.slice(4,6),16), a: 1 };
  }
  return null;
}

// compute saturation to detect grayscale-ish colors
function rgbToSaturation(r,g,b) {
  r/=255; g/=255; b/=255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  if (max === min) return 0;
  const l = (max+min)/2;
  const d = max-min;
  return l > 0.5 ? d/(2-max-min) : d/(max+min);
}

// meaningful color: not transparent/initial/inherit/currentcolor and saturation > threshold
function isMeaningfulColor(cssColor) {
  if (!cssColor) return false;
  cssColor = cssColor.trim().toLowerCase();
  if (cssColor === 'transparent' || cssColor === 'initial' || cssColor === 'inherit' || cssColor === 'currentcolor') return false;
  const p = parseColor(cssColor);
  if (!p) return false;
  if (p.a === 0) return false;
  const s = rgbToSaturation(p.r,p.g,p.b);
  return s > 0.08; // >8% saturation considered non-gray
}

// properties to handle (style properties)
const STYLE_PROPS = [
  {cssProp: 'color', attr: 'data-cr-orig-color'},
  {cssProp: 'background-color', attr: 'data-cr-orig-bg'},
  {cssProp: 'border-top-color', attr: 'data-cr-orig-border-top'},
  {cssProp: 'border-right-color', attr: 'data-cr-orig-border-right'},
  {cssProp: 'border-bottom-color', attr: 'data-cr-orig-border-bottom'},
  {cssProp: 'border-left-color', attr: 'data-cr-orig-border-left'},
  {cssProp: 'outline-color', attr: 'data-cr-orig-outline'}
];

// svg/style attributes to handle
const SVG_PROPS = [
  {attr: 'fill', attrData: 'data-cr-orig-fill'},
  {attr: 'stroke', attrData: 'data-cr-orig-stroke'}
];

// selectors to scan
const selector = [
  'a', 'button', 'input', 'select', 'textarea', 'label',
  '.btn', '.button', '.cr-button', '.action', '.link',
  '[role="button"]', '.badge', '.pill', '.card', '.panel',
  'svg', 'svg *', 'path', 'circle', 'rect', '.icon', '.svg-icon'
].join(',');

let domObserver = null;
let currentAccent = null; // track last applied accent to avoid redundant work

// Replace only properties that previously had meaningful values. Save originals to data attributes for restore.
function replaceAccent(accentColor) {
  if (!accentColor) return;
  // Avoid doing full work if same accent already applied
  if (currentAccent === accentColor) return;
  currentAccent = accentColor;

  const els = Array.from(document.querySelectorAll(selector));
  els.forEach(el => {
    // First handle computed style properties
    let cs;
    try { cs = window.getComputedStyle(el); } catch(e) { cs = null; }
    if (cs) {
      STYLE_PROPS.forEach(p => {
        try {
          const val = cs.getPropertyValue(p.cssProp);
          if (isMeaningfulColor(val)) {
            if (!el.hasAttribute(p.attr)) el.setAttribute(p.attr, val.trim());
            el.style.setProperty(p.cssProp, accentColor, 'important');
          }
        } catch (e) {}
      });
    }

    // Some elements use shorthand 'background' or inline styles - check inline style property directly
    try {
      const inlineBg = el.style && (el.style.background || el.style.backgroundColor);
      if (inlineBg && isMeaningfulColor(inlineBg)) {
        if (!el.hasAttribute('data-cr-orig-bg')) el.setAttribute('data-cr-orig-bg', inlineBg.trim());
        el.style.setProperty('background-color', accentColor, 'important');
      }
    } catch (e) {}

    // Handle SVG attributes and other element attributes (fill/stroke)
    SVG_PROPS.forEach(s => {
      try {
        // Check attribute on element first (e.g., <path fill="#ff640a">)
        const attrVal = el.getAttribute && el.getAttribute(s.attr);
        if (attrVal && isMeaningfulColor(attrVal)) {
          if (!el.hasAttribute(s.attrData)) el.setAttribute(s.attrData, attrVal.trim());
          // set attribute directly so SVG renders instantly
          el.setAttribute(s.attr, accentColor);
          // also set style property to override CSS rules
          el.style.setProperty(s.attr, accentColor, 'important');
        } else {
          // If no attribute, check computed style for fill/stroke
          if (cs) {
            const comp = cs.getPropertyValue(s.attr);
            if (comp && isMeaningfulColor(comp)) {
              if (!el.hasAttribute(s.attrData)) el.setAttribute(s.attrData, comp.trim());
              el.setAttribute(s.attr, accentColor);
              el.style.setProperty(s.attr, accentColor, 'important');
            }
          }
        }
      } catch (e) {}
    });
  });
}

// Restore saved originals (used before re-applying or on disable)
function restoreOriginals() {
  const map = {
    'data-cr-orig-color': 'color',
    'data-cr-orig-bg': 'background-color',
    'data-cr-orig-border-top': 'border-top-color',
    'data-cr-orig-border-right': 'border-right-color',
    'data-cr-orig-border-bottom': 'border-bottom-color',
    'data-cr-orig-border-left': 'border-left-color',
    'data-cr-orig-outline': 'outline-color',
    'data-cr-orig-fill': 'fill',
    'data-cr-orig-stroke': 'stroke'
  };
  const selectorAttrs = Object.keys(map).map(a => '['+a+']').join(',');
  const els = Array.from(document.querySelectorAll(selectorAttrs));
  els.forEach(el => {
    for (const attr in map) {
      if (el.hasAttribute(attr)) {
        const orig = el.getAttribute(attr);
        if (orig) {
          try {
            // For SVG attributes prefer setAttribute, for CSS props use style
            if (map[attr] === 'fill' || map[attr] === 'stroke') {
              el.setAttribute(map[attr], orig);
              el.style.removeProperty(map[attr]);
            } else {
              el.style.setProperty(map[attr], orig, 'important');
            }
          } catch (e) {}
        } else {
          try {
            el.style.removeProperty(map[attr]);
            if (map[attr] === 'fill' || map[attr] === 'stroke') el.removeAttribute(map[attr]);
          } catch (e) {}
        }
        el.removeAttribute(attr);
      }
    }
  });
  currentAccent = null;
}

// Player resize style management
function applyPlayerResize(enabled) {
  let style = document.getElementById("cr-player-resize-style");
  if (enabled) {
    if (!style) {
      style = document.createElement("style");
      style.id = "cr-player-resize-style";
      style.textContent = `
        .erc-watch-episode .video-player-wrapper {
          height: 90vh !important;
          transition: height 0.3s ease;
        }
        .erc-watch-episode .erc-current-media-info {
          display: none !important;
        }
        body.scrolled .erc-watch-episode .erc-current-media-info {
          display: block !important;
        }
      `;
      document.head.appendChild(style);
    }
  } else {
    if (style) style.remove();
  }
}

window.addEventListener("scroll", () => {
  if (window.scrollY > 50) document.body.classList.add("scrolled");
  else document.body.classList.remove("scrolled");
});

// Debounced apply helper for DOM mutation-driven re-apply
let applyTimer = null;
function scheduleApplyAccent(accent) {
  if (applyTimer) clearTimeout(applyTimer);
  applyTimer = setTimeout(() => {
    try {
      // Only restore when re-applying a different accent; restoreOriginals resets currentAccent so replace will proceed
      restoreOriginals();
      replaceAccent(accent);
    } catch (e) {}
    applyTimer = null;
  }, 100);
}

// Observe DOM mutations and reapply where new elements appear
function ensureDomObserver(accent) {
  if (domObserver) return;
  domObserver = new MutationObserver((mutations) => {
    // If nodes were added, schedule a reapply (keeps work minimal)
    let added = false;
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length) { added = true; break; }
      // attributes change may affect color too (e.g., SVG fill attribute changed)
      if (m.type === 'attributes' && (m.attributeName === 'fill' || m.attributeName === 'stroke' || m.attributeName === 'style')) {
        added = true; break;
      }
    }
    if (added) scheduleApplyAccent(accent);
  });
  domObserver.observe(document.documentElement || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['fill','stroke','style'] });
}

// Initial apply once DOM is ready and storage value loaded
function initApply() {
  chrome.storage.sync.get(["enabled"], (data) => {
    applyPlayerResize(data.enabled);
  });
  chrome.storage.sync.get(["accentColor"], (data) => {
    const accent = data.accentColor || "#FF640A";
    // Apply immediately (synchronous) to avoid initial orange flash
    try {
      restoreOriginals();
      replaceAccent(accent);
    } catch (e) {}
    // Start observing DOM to apply for dynamically added content
    ensureDomObserver(accent);
  });
}

// React to storage changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) applyPlayerResize(changes.enabled.newValue);
  if (changes.accentColor) {
    const accent = changes.accentColor.newValue || "#FF640A";
    // Immediately restore & apply new accent to prevent brief original/orange rendering
    try {
      restoreOriginals();
      replaceAccent(accent);
    } catch (e) {}
    // reconnect observer so it uses latest accent for scheduled re-applies
    if (domObserver) {
      domObserver.disconnect();
      domObserver = null;
    }
    ensureDomObserver(accent);
  }
});

// Run on load; if document already loaded, init immediately.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApply);
} else {
  initApply();
}
