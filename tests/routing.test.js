import test from 'node:test';
import assert from 'node:assert';
import { JSA } from '../jsa-runtime.js';

// Setup Mock DOM
class MockElement {
    constructor(tag = 'div', type = 1) {
        this.tagName = tag.toUpperCase();
        this.nodeName = tag.toUpperCase();
        this.nodeType = type;
        this.childNodes = [];
        this.attributes = [];
        this.className = '';
        this.classList = {
            add: (...args) => { 
                const current = this.className.split(/\s+/).filter(x => x);
                args.forEach(c => { if (!current.includes(c)) current.push(c); });
                this.setAttribute('class', current.join(' '));
            },
            remove: (c) => { 
                const current = this.className.split(/\s+/).filter(x => x && x !== c);
                this.setAttribute('class', current.join(' '));
            },
            contains: (c) => this.className.split(/\s+/).includes(c)
        };
        this.style = { cssText: '' };
        this.id = '';
        this._textContent = '';
        this._innerHTML = '';
        this.value = '';
        this.checked = false;
        this._jsaCtx = null;
        this._jsaNode = null;
        this.parentNode = null;
        this.dataset = {};
    }
    get textContent() { return this.nodeType === 3 ? this._textContent : this.childNodes.map(c => c.textContent).join(''); }
    set textContent(val) {
        if (this.nodeType === 3) this._textContent = val;
        else { this.childNodes = [new MockElement('#text', 3)]; this.childNodes[0]._textContent = val; }
    }
    get innerHTML() { return this._innerHTML; }
    set innerHTML(v) { 
        this._innerHTML = v;
        this.childNodes = [new MockElement('#text', 3)]; 
        this.childNodes[0]._textContent = v; 
    }
    appendChild(child) { child.parentNode = this; this.childNodes.push(child); }
    removeChild(child) { const idx = this.childNodes.indexOf(child); if (idx !== -1) { this.childNodes[idx].parentNode = null; this.childNodes.splice(idx, 1); } }
    replaceChild(n, o) {
        const idx = this.childNodes.indexOf(o);
        if (idx !== -1) {
            n.parentNode = this;
            o.parentNode = null;
            this.childNodes[idx] = n;
        }
    }
    insertBefore(n, b) {
        const idx = b ? this.childNodes.indexOf(b) : -1;
        n.parentNode = this;
        if (idx !== -1) this.childNodes.splice(idx, 0, n);
        else this.childNodes.push(n);
    }
    setAttribute(name, value) { 
        if (name === 'class') this.className = value;
        if (name === 'id') this.id = value;
        const attr = this.attributes.find(a => a.name === name);
        if (attr) attr.value = String(value); else this.attributes.push({ name, value: String(value) });
    }
    getAttribute(name) { const attr = this.attributes.find(a => a.name === name); return attr ? attr.value : null; }
    removeAttribute(name) { this.attributes = this.attributes.filter(a => a.name !== name); }
    addEventListener(ev, cb) { this._events = this._events || {}; this._events[ev] = cb; }
    removeEventListener() {}
    querySelector(s) { return this.querySelectorAll(s)[0] || null; }
    querySelectorAll(s) {
        let results = [];
        const walk = (node) => {
            if (s.startsWith('.') && node.className.split(/\s+/).includes(s.slice(1))) results.push(node);
            else if (s.startsWith('#') && node.id === s.slice(1)) results.push(node);
            else if (node.tagName === s.toUpperCase()) results.push(node);
            node.childNodes.forEach(walk);
        };
        this.childNodes.forEach(walk);
        return results;
    }
}

let hashListeners = [];
global.document = {
    createElement: (tag) => new MockElement(tag),
    createTextNode: (text) => { const el = new MockElement('#text', 3); el._textContent = text; return el; },
    getElementById: (id) => null,
    head: new MockElement('head'),
    querySelector: () => null
};
global.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 };
global.window = { 
    location: { hash: '#/' }, 
    addEventListener: (ev, cb) => { if (ev === 'hashchange') hashListeners.push(cb); },
    removeEventListener: () => {}
};

test('routing: initializes with current hash', (t) => {
    window.location.hash = '#/test';
    const app = new JSA(new MockElement('div'));
    assert.strictEqual(app.state.route, '#/test');
});

test('routing: updates on hashchange', async (t) => {
    const container = new MockElement('div');
    const app = new JSA(container);
    app.render('div if="${route === \'#/docs\'}" = "Docs Page"');
    
    window.location.hash = '#/docs';
    hashListeners.forEach(fn => fn());
    
    await new Promise(r => setTimeout(r, 10));
    assert.strictEqual(app.state.route, '#/docs');
    assert.ok(container.textContent.includes('Docs Page'));
});

test('routing: defaults to #/ if hash is empty', (t) => {
    window.location.hash = '';
    const app = new JSA(new MockElement('div'));
    assert.strictEqual(app.state.route, '#/');
});
