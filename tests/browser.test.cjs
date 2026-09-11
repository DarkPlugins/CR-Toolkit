const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

let browser;
const root = path.join(__dirname, '..');
before(async () => {
    browser = await chromium.launch({
        headless: true,
        ...(process.env.CR_TOOLKIT_BROWSER ? { executablePath: process.env.CR_TOOLKIT_BROWSER } : {})
    });
});
after(async () => { await browser?.close(); });

async function fixture(t, { html = '', settings = {}, route = '/watch/episode' } = {}) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', request => request.fulfill({ contentType: 'text/html', body: html }));
    await page.goto(`https://www.crunchyroll.com${route}`);
    await page.evaluate(data => {
        const listeners = [];
        window.storageWrites = [];
        window.settings = data;
        window.chrome = {
            runtime: { sendMessage(message, callback) { callback?.({ records: [] }); } },
            storage: {
                onChanged: { addListener(listener) { listeners.push(listener); } },
                sync: {
                    get(keys, callback) { queueMicrotask(() => callback({ ...window.settings })); },
                    async set(values) {
                        window.storageWrites.push(values);
                        const changes = Object.fromEntries(Object.entries(values).map(([key, newValue]) => [key, {
                            oldValue: window.settings[key], newValue
                        }]));
                        Object.assign(window.settings, values);
                        listeners.forEach(listener => listener(changes, 'sync'));
                    }
                }
            }
        };
    }, settings);
    t.after(async () => {
        await page.close();
        assert.deepEqual(errors, [], 'No uncaught page errors');
    });
    return page;
}

async function feature(page, file, name) {
    await page.addScriptTag({ path: path.join(root, `src/js/features/${file}.js`) });
    if (name) await page.evaluate(name => window.CRToolkit[name].init(), name);
}

test('colors restore browser-normalized declarations without cascading or changing URLs', async t => {
    const page = await fixture(t, {
        html: '<style>#sample { color: #ff640a !important; }</style><div id="sample" style="background-color:#ff640a; width:10px"></div><svg><path id="paint" fill="url(#ff640a)" stroke="#ff640a" /></svg>',
        settings: { color_mappings: [{ from: '#ff640a', to: '#00ff00' }, { from: '#00ff00', to: '#0000ff' }] }
    });
    await feature(page, 'changeColors', 'ChangeColors');
    assert.equal(await page.locator('#sample').evaluate(el => getComputedStyle(el).color), 'rgb(0, 255, 0)');
    await page.evaluate(() => {
        document.getElementById('sample').style.width = '20px';
        document.body.appendChild(document.createElement('div'));
    });
    assert.equal(await page.locator('#sample').evaluate(el => el.style.backgroundColor), 'rgb(0, 255, 0)');
    assert.equal(await page.locator('#paint').getAttribute('fill'), 'url(#ff640a)');
    await page.evaluate(() => chrome.storage.sync.set({ color_mappings: [] }));
    assert.equal(await page.locator('#sample').evaluate(el => getComputedStyle(el).color), 'rgb(255, 100, 10)');
    assert.equal(await page.locator('#sample').evaluate(el => el.style.backgroundColor), 'rgb(255, 100, 10)');
    assert.equal(await page.locator('#sample').evaluate(el => el.style.width), '20px');
    assert.equal(await page.locator('#paint').getAttribute('stroke'), '#ff640a');
});

test('color processing skips ordinary stylesheet rescans and handles changed style text', async t => {
    const page = await fixture(t, {
        html: '<style id="sheet">.sample { color: #ff640a; }</style><div class="sample"></div>',
        settings: { color_mappings: [{ from: '#ff640a', to: '#00ff00' }] }
    });
    await page.evaluate(() => {
        const getter = Object.getOwnPropertyDescriptor(Document.prototype, 'styleSheets').get;
        window.sheetReads = 0;
        Object.defineProperty(document, 'styleSheets', { get() { window.sheetReads++; return getter.call(this); } });
    });
    await feature(page, 'changeColors', 'ChangeColors');
    const initialReads = await page.evaluate(() => window.sheetReads);
    await page.evaluate(() => document.body.appendChild(document.createElement('div')));
    await page.waitForTimeout(80);
    assert.equal(await page.evaluate(() => window.sheetReads), initialReads);
    await page.evaluate(() => { document.getElementById('sheet').firstChild.data = '.sample { background-color: #ff640a; }'; });
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.sample')).backgroundColor === 'rgb(0, 255, 0)');
    await page.evaluate(() => {
        window.detached = document.createElement('div');
        window.detached.style.color = '#ff640a';
        document.body.append(window.detached);
    });
    await page.waitForFunction(() => window.detached.style.color === 'rgb(0, 255, 0)');
    await page.evaluate(() => window.detached.remove());
    await page.waitForFunction(() => window.detached.style.color === 'rgb(255, 100, 10)');
});

test('headers cover late DOM elements and restore original styles on toggle and navigation', async t => {
    const page = await fixture(t, { settings: {
        enabled_hide_header: true, enabled_change_header: true, enabled_change_header_logo: true
    } });
    await feature(page, 'hideHeader', 'HideHeader');
    await feature(page, 'changeHeader', 'ChangeHeader');
    await page.evaluate(() => {
        document.body.innerHTML = '<div class="app-layout__header--dynamic" style="position:sticky"><header class="erc-large-header"><span class="header-logo" style="display:flex">Logo</span></header></div>';
    });
    assert.equal(await page.locator('.header-logo').evaluate(el => getComputedStyle(el).display), 'none');
    assert.equal(await page.locator('.erc-large-header').evaluate(el => getComputedStyle(el).pointerEvents), 'none');
    await page.evaluate(() => chrome.storage.sync.set({ enabled_hide_header: false, enabled_change_header: false }));
    assert.equal(await page.locator('.header-logo').evaluate(el => getComputedStyle(el).display), 'flex');
    assert.equal(await page.locator('[class*="app-layout"]').evaluate(el => getComputedStyle(el).position), 'sticky');
    await page.evaluate(async () => {
        await chrome.storage.sync.set({ enabled_hide_header: true });
        history.pushState({}, '', '/browse');
        CRToolkit.HideHeader.apply();
    });
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('cr-hide-header')), false);
});

test('playback header stays usable in dropdowns and resets when leaving the tab', async t => {
    const page = await fixture(t, {
        settings: { enabled_hide_header: true },
        html: `<style>
            body { margin: 0; height: 100vh; }
            .erc-large-header { height: 60px; width: 100vw; background: gray; }
            #menu { position: absolute; top: 60px; left: 20px; width: 200px; height: 200px; }
        </style><header class="erc-large-header"><button>Menu</button>
            <div id="menu"><button id="choice">Choose</button></div>
            <div class="header-actions" style="position:absolute;right:20px;top:10px"></div>
        </header>`
    });
    await page.addScriptTag({ path: path.join(root, 'popup.js') });
    await feature(page, 'settingsPanel', 'SettingsPanel');
    await feature(page, 'hideHeader', 'HideHeader');
    const isVisible = () => page.locator('.erc-large-header').evaluate(el => getComputedStyle(el).pointerEvents === 'auto');

    await page.mouse.move(25, 20);
    assert.equal(await isVisible(), true);
    await page.mouse.move(30, 150);
    await page.waitForTimeout(250);
    assert.equal(await isVisible(), true, 'Dropdown below the reveal area stays interactive');
    await page.locator('#choice').click();
    await page.locator('.control-button').click();
    await page.locator('[data-section="s-appearance"]').hover();
    await page.waitForTimeout(250);
    assert.equal(await isVisible(), true, 'Settings inside the shadow root keep the header visible');
    await page.mouse.move(700, 500);
    await page.waitForFunction(() => !document.documentElement.classList.contains('cr-header-visible'));

    for (const reason of ['mouseleave', 'blur', 'visibilitychange']) {
        await page.mouse.move(25, 20);
        assert.equal(await isVisible(), true);
        await page.evaluate(reason => {
            if (reason === 'visibilitychange') {
                Object.defineProperty(document, 'hidden', { configurable: true, value: true });
            }
            (reason === 'blur' ? window : document).dispatchEvent(new Event(reason));
        }, reason);
        assert.equal(await isVisible(), false, `${reason} clears the reveal state`);
        await page.evaluate(() => { delete document.hidden; });
        await page.mouse.move(700, 500);
    }
});

test('an expanded Crunchyroll profile menu keeps the header visible until it closes', async t => {
    const page = await fixture(t, {
        settings: { enabled_hide_header: true },
        html: `<style>
            body { margin: 0; height: 100vh; }
            .erc-large-header { position: relative; z-index: 2; height: 60px; background: gray; }
            #user-menu { position: absolute; top: 60px; width: 200px; height: 200px; }
            #backdrop { position: fixed; inset: 60px 0 0; background: #8888; }
        </style><header class="erc-large-header">
            <div role="button" tabindex="0" aria-label="User Menu" aria-haspopup="menu"
                aria-expanded="false" aria-controls="user-menu">Profile</div>
            <div id="user-menu" role="menu" hidden>Profile settings</div>
        </header><div id="backdrop" hidden></div>`
    });
    await page.evaluate(() => {
        const trigger = document.querySelector('[aria-controls="user-menu"]');
        const setOpen = open => {
            trigger.setAttribute('aria-expanded', String(open));
            document.getElementById('user-menu').hidden = !open;
            document.getElementById('backdrop').hidden = !open;
        };
        trigger.onclick = () => setOpen(trigger.getAttribute('aria-expanded') !== 'true');
        document.getElementById('backdrop').onclick = () => setOpen(false);
        document.addEventListener('keydown', event => { if (event.key === 'Escape') setOpen(false); });
    });
    await feature(page, 'hideHeader', 'HideHeader');
    const isVisible = () => page.locator('.erc-large-header').evaluate(el => getComputedStyle(el).pointerEvents === 'auto');
    for (const closeWith of ['backdrop', 'Escape']) {
        await page.mouse.move(25, 20);
        await page.getByRole('button', { name: 'User Menu' }).click();
        await page.mouse.move(700, 500);
        await page.waitForTimeout(300);
        assert.equal(await isVisible(), true, 'Open profile menu holds the header outside the hover area');
        await page.evaluate(() => document.dispatchEvent(new Event('mouseleave')));
        assert.equal(await isVisible(), true, 'Leaving the viewport does not strand the open menu');
        if (closeWith === 'backdrop') await page.locator('#backdrop').click({ position: { x: 700, y: 440 } });
        else await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.documentElement.classList.contains('cr-header-visible'));
        assert.equal(await isVisible(), false, 'Closing the menu restores auto-hide without another mouse move');
        assert.equal(await page.locator('#backdrop').isVisible(), false);
    }
    // Menu state changes must also reveal a header opened via the keyboard.
    await page.evaluate(() => document.querySelector('[aria-controls="user-menu"]').click());
    await page.waitForFunction(() => document.documentElement.classList.contains('cr-header-visible'));
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    assert.equal(await isVisible(), false);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    assert.equal(await isVisible(), true, 'Returning to the tab restores the still-open menu');
    await page.evaluate(() => document.querySelector('[aria-controls="user-menu"]').remove());
    await page.waitForFunction(() => !document.documentElement.classList.contains('cr-header-visible'));
});

test('colors detect CSSOM rule insertion without a DOM mutation', async t => {
    const page = await fixture(t, {
        html: '<style id="sheet"></style><div id="sample"></div>',
        settings: { color_mappings: [{ from: '#ff640a', to: '#00ff00' }] }
    });
    await page.clock.install();
    await feature(page, 'changeColors', 'ChangeColors');
    await page.evaluate(() => document.getElementById('sheet').sheet.insertRule('#sample { color: #ff640a; }'));
    await page.clock.runFor(2100);
    assert.equal(await page.locator('#sample').evaluate(el => getComputedStyle(el).color), 'rgb(0, 255, 0)');
    await page.evaluate(() => chrome.storage.sync.set({ color_mappings: [] }));
    assert.equal(await page.locator('#sample').evaluate(el => getComputedStyle(el).color), 'rgb(255, 100, 10)');
});

test('auto-skip cancels delayed clicks when disabled', async t => {
    const page = await fixture(t, { html: '<button data-testid="skip-intro-button">Skip</button>', settings: { enabled_auto_skip: true } });
    await page.clock.install();
    await page.evaluate(() => {
        window.clicks = 0;
        document.querySelector('button').onclick = () => window.clicks++;
    });
    await feature(page, 'autoSkip', 'AutoSkip');
    await page.clock.runFor(1000);
    await page.evaluate(() => chrome.storage.sync.set({ enabled_auto_skip: false }));
    await page.clock.runFor(5000);
    assert.equal(await page.evaluate(() => window.clicks), 0);
    await page.evaluate(() => chrome.storage.sync.set({ enabled_auto_skip: true }));
    await page.clock.runFor(2100);
    assert.equal(await page.evaluate(() => window.clicks), 1);
});

test('auto-skip releases play listeners after a paused-video timeout', async t => {
    const page = await fixture(t, { html: '<video></video><button data-testid="skip-intro-button">Skip</button>' });
    await page.clock.install();
    await page.evaluate(() => {
        const video = document.querySelector('video');
        const add = video.addEventListener.bind(video);
        const remove = video.removeEventListener.bind(video);
        window.playListeners = 0;
        video.addEventListener = (type, ...args) => { window.playListeners++; add(type, ...args); };
        video.removeEventListener = (type, ...args) => { window.playListeners--; remove(type, ...args); };
    });
    await feature(page, 'autoSkip', 'AutoSkip');
    await page.clock.runFor(3400);
    assert.equal(await page.evaluate(() => window.playListeners), 0);
});

test('keyboard seeking respects modifier keys, sliders, and editable targets', async t => {
    const page = await fixture(t, { html: '<button data-testid="jump-forward-button">Seek</button><input type="range"><div contenteditable>Text</div>' });
    await feature(page, 'keyboardSeek', 'KeyboardSeek');
    const result = await page.evaluate(() => {
        let clicks = 0;
        document.querySelector('button').onclick = () => clicks++;
        const press = (target, options = {}) => target.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true, ...options }));
        press(document.body, { ctrlKey: true });
        press(document.querySelector('input'));
        press(document.querySelector('[contenteditable]'));
        const before = clicks;
        const allowed = press(document.body);
        return { before, clicks, allowed };
    });
    assert.deepEqual(result, { before: 0, clicks: 1, allowed: false });
});

test('extension popup points users to the inline Crunchyroll settings', async t => {
    const html = readFileSync(path.join(root, 'popup.html'), 'utf8');
    const page = await fixture(t, { html, route: '/popup' });

    assert.equal(await page.locator('.logo').isVisible(), true);
    assert.match(await page.locator('.info-text').textContent(), /header actions/i);
    assert.equal(
        await page.locator('.github-link').getAttribute('href'),
        'https://github.com/darkplugins/cr-toolkit'
    );
    assert.match(await page.locator('.footer').textContent(), /Made with.*DarkPlugins/s);
});

test('inline settings panel is inserted first and stores its accent color', async t => {
    const page = await fixture(t, {
        html: '<div class="header-actions"><button id="profile">Profile</button></div>',
        settings: { active_popup_section: 'removed-section' }
    });
    await page.addScriptTag({ path: path.join(root, 'popup.js') });
    await page.addScriptTag({ path: path.join(root, 'src/js/features/settingsPanel.js') });
    await page.evaluate(() => CRToolkit.SettingsPanel.init());
    await page.waitForFunction(() => Boolean(
        document.querySelector('.header-actions')?.firstElementChild?.matches('[data-cr-toolkit-control]')
    ));

    const panelState = await page.evaluate(() => {
        const control = document.querySelector('[data-cr-toolkit-control]');
        const button = control.shadowRoot.querySelector('.control-button');
        button.click();
        return {
            isFirst: control.parentElement.firstElementChild === control,
            hasHeaderActionClass: control.classList.contains('nav-horizontal-layout__action-item--KZBne'),
            ariaLabel: button.getAttribute('aria-label'),
            panelOpen: control.shadowRoot.querySelector('.panel').classList.contains('open'),
            logoCentered: control.shadowRoot.querySelector('.panel-logo')?.getAttribute('alt') === 'CR Toolkit',
            noDuplicateHeadings: control.shadowRoot.querySelectorAll('.page-heading').length === 0
        };
    });
    assert.deepEqual(panelState, {
        isFirst: true,
        hasHeaderActionClass: true,
        ariaLabel: 'Open CR Toolkit settings',
        panelOpen: true,
        logoCentered: true,
        noDuplicateHeadings: true
    });

    await page.evaluate(() => {
        const input = document.querySelector('[data-cr-toolkit-control]').shadowRoot.querySelector('#accent-color');
        input.value = '#123456';
        input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    assert.equal(await page.evaluate(() => window.settings.popup_accent_color), '#123456');

    await page.evaluate(() => {
        document.querySelector('[data-cr-toolkit-control]').shadowRoot.querySelector('#reset-accent-color').click();
    });
    assert.equal(await page.evaluate(() => window.settings.popup_accent_color), '#ff6f00');
});

test('Appearance toggles keep the popup layout and scroll position stable', async t => {
    const page = await fixture(t, {
        route: '/browse',
        html: '<div class="header-actions" style="position:fixed;top:8px;right:60px"></div>',
        settings: { enabled_change_header: true, active_popup_section: 's-appearance' }
    });
    await page.setViewportSize({ width: 460, height: 600 });
    await page.addScriptTag({ path: path.join(root, 'popup.js') });
    await feature(page, 'settingsPanel', 'SettingsPanel');
    await feature(page, 'changeHeader', 'ChangeHeader');
    await page.locator('.control-button').click();
    await page.waitForTimeout(250);
    await page.locator('#s-appearance').evaluate(el => { el.scrollTop = el.scrollHeight; });
    const layout = () => page.evaluate(() => {
        const shadow = document.querySelector('[data-cr-toolkit-control]').shadowRoot;
        return ['.panel', '.panel-inner', '.navbar', '.section-container', '#s-appearance'].map(selector => {
            const el = shadow.querySelector(selector);
            return { selector, top: el.getBoundingClientRect().top, scrollTop: el.scrollTop };
        });
    });
    const before = await layout();
    for (const name of ['store', 'news', 'games', 'store']) {
        await page.locator(`label[for="toggle-change-header-${name}"]`).click();
        assert.deepEqual(await layout(), before, `Clicking ${name} preserves the popup layout`);
    }
    assert.equal(await page.evaluate(() => window.settings.enabled_change_header_store), false);
    assert.equal(await page.evaluate(() => window.settings.enabled_change_header_news), true);
    // Keyboard focus must scroll only the Appearance list, never its outer containers.
    await page.locator('#toggle-change-header').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space');
    assert.equal(await page.evaluate(() => window.settings.enabled_change_header_logo), true);
    assert.deepEqual((await layout()).slice(0, 4), before.slice(0, 4));
});

test('all isolated content scripts initialize together without global collisions', async t => {
    const page = await fixture(t);
    const manifest = JSON.parse(readFileSync(path.join(root, 'manifest.json'), 'utf8'));
    for (const file of manifest.content_scripts.find(entry => entry.world !== 'MAIN').js) {
        await page.addScriptTag({ path: path.join(root, file) });
    }
    assert.equal(await page.locator('#cr-player-resize-style').count(), 1);
    assert.match(await page.locator('#cr-player-resize-style').textContent(), /90vh/);
    await page.evaluate(() => chrome.storage.sync.set({ enabled_hide_header: true }));
    assert.match(await page.locator('#cr-player-resize-style').textContent(), /100vh/);
});

async function searchFixture(t) {
    const page = await fixture(t, { route: '/search?q=hero', html: `
        <article data-t="search-series-card" id="first"><a href="/series/one"><h3>Hero</h3></a><span>Dubbed</span></article>
        <article data-t="search-series-card" id="second"><a href="/series/two"><h3>Another</h3></a></article>
    ` });
    await page.evaluate(() => {
        localStorage.setItem('cr-better-search-filters', JSON.stringify({ dub: 'de-DE', onlyDub: true }));
        window.payload = { data: [
            { id: 'one', title: 'Hero' },
            { id: 'two', title: 'Another', audio_locales: ['en-US'] }
        ] };
        window.fetch = () => Promise.resolve(new Response(JSON.stringify(window.payload)));
        window.XMLHttpRequest = class extends EventTarget {
            open() {}
            send() { this.dispatchEvent(new Event('load')); }
        };
    });
    await feature(page, 'betterSearch');
    // The toolkit's language input precedes the site's late-rendered search box.
    await page.evaluate(() => {
        const input = document.createElement('input');
        input.type = 'search';
        input.value = 'hero';
        input.id = 'site-search';
        document.body.append(input);
    });
    return page;
}

test('search retains unknown availability and ignores its own language input', async t => {
    const page = await searchFixture(t);
    await page.evaluate(() => fetch('/content/v2/discover/search?q=hero'));
    await page.waitForFunction(() => document.getElementById('second').style.display === 'none');
    assert.equal(await page.locator('#first').isVisible(), true);
    assert.equal(await page.locator('#first [data-cr-toolkit]').textContent(), 'Dubbed');
    await page.evaluate(() => {
        document.getElementById('first').querySelector('a').href = '/series/two';
        document.getElementById('first').querySelector('h3').textContent = 'Another';
    });
    await page.waitForFunction(() => document.getElementById('first').style.display === 'none');
    await page.evaluate(() => window.postMessage({ source: 'CRToolkit', type: 'CR_BETTER_SEARCH_ENABLED', enabled: false }, '*'));
    await page.waitForFunction(() => !document.getElementById('cr-better-search'));
    assert.equal(await page.locator('#first').isVisible(), true);
    assert.equal(await page.locator('[data-cr-toolkit]').count(), 0);
});

test('search does not inspect the DOM for unrelated fetch requests', async t => {
    const page = await searchFixture(t);
    const count = await page.evaluate(async () => {
        const query = document.querySelectorAll.bind(document);
        let queries = 0;
        document.querySelectorAll = (...args) => { queries++; return query(...args); };
        await fetch('/unrelated-resource');
        document.querySelectorAll = query;
        return queries;
    });
    assert.equal(count, 0);
});

test('search handles JSON XHR responses and reuse without stale listeners', async t => {
    const page = await searchFixture(t);
    await page.evaluate(() => {
        window.request = new XMLHttpRequest();
        request.open('GET', '/content/v2/discover/search?q=hero');
        request.responseType = 'json';
        request.response = window.payload;
        request.send();
    });
    await page.waitForFunction(() => document.getElementById('second').style.display === 'none');
    const messages = await page.evaluate(() => {
        let messages = 0;
        const post = window.postMessage.bind(window);
        window.postMessage = (...args) => { messages++; return post(...args); };
        request.open('GET', '/other');
        request.send();
        window.postMessage = post;
        return messages;
    });
    assert.equal(messages, 0);
});
