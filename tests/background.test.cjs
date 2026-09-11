const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function loadBackground() {
    const local = {};
    let onMessage;
    const context = vm.createContext({
        console,
        chrome: {
            runtime: {
                onInstalled: { addListener() {} },
                onMessage: { addListener(listener) { onMessage = listener; } }
            },
            storage: {
                local: {
                    get(key, callback) { queueMicrotask(() => callback(structuredClone(local))); },
                    set(value, callback) {
                        Object.assign(local, structuredClone(value));
                        queueMicrotask(callback);
                    }
                }
            }
        }
    });
    vm.runInContext(readFileSync(path.join(__dirname, '../background.js'), 'utf8'), context);
    return { context, local, onMessage };
}

function record(id, audioLocales = []) {
    return { ids: [id], titles: [], audioLocales, subtitleLocales: [], hasDub: null, hasSub: null };
}

test('cache merges normalized identities and ignores malformed records', () => {
    const { context } = loadBackground();
    const merged = context.mergeRecords([null, record('SERIES')], [
        record(' series ', ['DE-de']), null, {}, record('')
    ]);
    assert.equal(merged.length, 1);
    assert.deepEqual(Array.from(merged[0].audioLocales), ['de-de']);
    assert.equal(merged[0].ids[0], 'series');
});

test('cache removes invalid timestamps and enforces its record limit', () => {
    const { context } = loadBackground();
    const state = context.cleanCacheState({ tabs: {
        invalid: { records: [], updatedAt: 'invalid' },
        future: { records: [], updatedAt: Date.now() + 60000 },
        expired: { records: [], updatedAt: Date.now() - 660000 },
        valid: { records: [null, record('a')], updatedAt: Date.now() }
    } });
    assert.deepEqual(Object.keys(state.tabs), ['valid']);
    assert.equal(state.tabs.valid.records.length, 1);
    assert.equal(context.mergeRecords([], Array.from({ length: 600 }, (_, i) => record(String(i)))).length, 500);
});

test('concurrent cache messages do not lose records and remain isolated by tab', async () => {
    const { onMessage } = loadBackground();
    const send = (tab, type, extra = {}) => new Promise(resolve => {
        assert.equal(onMessage({ type, ...extra }, { tab: { id: tab } }, resolve), true);
    });
    await Promise.all([
        send(1, 'CR_BETTER_SEARCH_SAVE_CACHE', { records: [record('one')] }),
        send(1, 'CR_BETTER_SEARCH_SAVE_CACHE', { records: [record('two')] }),
        send(2, 'CR_BETTER_SEARCH_SAVE_CACHE', { records: [record('other')] })
    ]);
    const first = await send(1, 'CR_BETTER_SEARCH_GET_CACHE');
    assert.deepEqual(Array.from(first.records, value => value.ids[0]), ['one', 'two']);
    const second = await send(2, 'CR_BETTER_SEARCH_GET_CACHE');
    assert.equal(second.records[0].ids[0], 'other');
    await send(1, 'CR_BETTER_SEARCH_ROUTE', { isSearch: false });
    assert.equal((await send(1, 'CR_BETTER_SEARCH_GET_CACHE')).records.length, 0);
});

test('malformed message types are ignored', () => {
    const { onMessage } = loadBackground();
    assert.equal(onMessage({ type: {} }, {}, () => {}), false);
});
