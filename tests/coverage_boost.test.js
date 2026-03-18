import test from 'node:test';
import assert from 'node:assert';
import { JSA } from '../jsa-runtime.js';

// Minimal Mock DOM for coverage boosting
global.window = {
    location: { hash: '#/' },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {}
};
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.document = {
    createElement: (tag) => new MockElement(tag),
    createTextNode: (txt) => new MockElement('#text', 3, txt),
    head: { appendChild: () => {}, removeChild: () => {} },
    body: { appendChild: () => {} }
};

class MockElement {
    constructor(tag = 'div', type = 1, txt = '') {
        this.tagName = tag.toUpperCase();
        this.nodeType = type;
        this.childNodes = [];
        this.className = '';
        this.classList = {
            add: (c) => {
                if (!c || c === 'undefined' || c === 'null' || c === 'false') return;
                const parts = this.className.split(/\s+/).filter(x => x);
                if (!parts.includes(c)) parts.push(c);
                this.className = parts.join(' ');
            },
            remove: (c) => {
                this.className = this.className.split(/\s+/).filter(x => x !== c).join(' ');
            }
        };
        this.style = {};
        this.id = '';
        this.attributes = {};
        this._textContent = txt;
        this.addEventListener = (name, cb) => {
            this._listeners = this._listeners || {};
            this._listeners[name] = this._listeners[name] || [];
            this._listeners[name].push(cb);
        };
    }
    setAttribute(n, v) { this.attributes[n] = v; if (n === 'class') this.className = v; }
    getAttribute(n) { return this.attributes[n]; }
    appendChild(c) { this.childNodes.push(c); c.parentNode = this; }
    get textContent() { return this._textContent; }
    set textContent(v) { this._textContent = v; }
    set innerHTML(v) { this._textContent = v; }
    dispatchEvent(ev) {
        if (this._listeners && this._listeners[ev.type]) {
            this._listeners[ev.type].forEach(cb => cb(ev));
        }
    }
}

test('Coverage Boost: parseValue terminal return', () => {
    const jsa = new JSA();
    // String that doesn't match any special type
    assert.strictEqual(jsa.parseValue('just-a-string'), 'just-a-string');
});

test('Coverage Boost: buildInstance :class edge cases', () => {
    const jsa = new JSA();
    const parent = new MockElement();
    const node = {
        tag: 'div', classes: [], styles: {}, attrs: { class: '${"a " + undefined + " b null false"}' },
        events: {}, children: [], if: null, show: null, each: null, html: null, content: null
    };
    jsa.buildInstance(node, parent, {});
    const el = parent.childNodes[0];
    // Should filter out undefined, null, false strings
    assert.ok(el.className.includes('a'));
    assert.ok(el.className.includes('b'));
    assert.ok(!el.className.includes('undefined'));
    assert.ok(!el.className.includes('null'));
});

test('Coverage Boost: buildInstance :style edge cases', () => {
    const jsa = new JSA();
    const parent = new MockElement();
    const node = {
        tag: 'div', classes: [], styles: {}, attrs: { style: '${"color: red; margin-top: 10px; invalid"}' },
        events: {}, children: [], if: null, show: null, each: null, html: null, content: null
    };
    jsa.buildInstance(node, parent, {});
    const el = parent.childNodes[0];
    assert.strictEqual(el.style.color, 'red');
    assert.strictEqual(el.style.marginTop, '10px');
});

test('Coverage Boost: event modifiers and keys', () => {
    const jsa = new JSA();
    const parent = new MockElement();
    let count = 0;
    const node = {
        tag: 'div', classes: [], styles: {}, attrs: {},
        events: { 
            'click.prevent.stop.self': 'count++',
            'keydown.enter': 'count++',
            'keydown.esc': 'count++'
        },
        children: [], if: null, show: null, each: null, html: null, content: null
    };
    jsa.state = { count: 0 };
    jsa.buildInstance(node, parent, {});
    const el = parent.childNodes[0];

    // .self check
    const evSelf = { type: 'click', target: {}, preventDefault: () => {}, stopPropagation: () => {} };
    el.dispatchEvent(evSelf);
    assert.strictEqual(jsa.state.count, 0); // Target mismatch

    evSelf.target = el;
    el.dispatchEvent(evSelf);
    assert.strictEqual(jsa.state.count, 1);

    // key check
    const evKey = { type: 'keydown', key: 'Tab' };
    el.dispatchEvent(evKey);
    assert.strictEqual(jsa.state.count, 1); // Not enter

    evKey.key = 'Enter';
    el.dispatchEvent(evKey);
    assert.strictEqual(jsa.state.count, 2);
});

test('Coverage Boost: decodeUnicode and terminal parse lines', () => {
    const jsa = new JSA();
    // Hit decodeUnicode directly if needed, but it should be hit by interpolate
    assert.strictEqual(jsa.decodeUnicode('abc'), 'abc');
    
    // Terminal lines of parse (the catch blocks or missing definitions)
    const template = `
let x = 1
style
  div { color: red }
div = "hi"
`;
    const ast = jsa.parse(template);
    assert.ok(ast.elements.length > 0);
});
