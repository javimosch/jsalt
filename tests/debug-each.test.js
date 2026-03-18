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
    set innerHTML(v) { this.childNodes = [new MockElement('#text', 3)]; this.childNodes[0]._textContent = v; }
    appendChild(child) { child.parentNode = this; this.childNodes.push(child); }
    removeChild(child) { const idx = this.childNodes.indexOf(child); if (idx !== -1) { this.childNodes[idx].parentNode = null; this.childNodes.splice(idx, 1); } }
    setAttribute(name, value) { 
        if (name === 'class') this.className = value;
        if (name === 'id') this.id = value;
        const attr = this.attributes.find(a => a.name === name);
        if (attr) attr.value = String(value); else this.attributes.push({ name, value: String(value) });
    }
    getAttribute(name) { const attr = this.attributes.find(a => a.name === name); return attr ? attr.value : null; }
    removeAttribute(name) { this.attributes = this.attributes.filter(a => a.name !== name); }
    addEventListener() {}
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

global.document = {
    createElement: (tag) => new MockElement(tag),
    createTextNode: (text) => { const el = new MockElement('#text', 3); el._textContent = text; return el; },
    getElementById: (id) => null,
    head: new MockElement('head'),
    querySelector: () => null
};
global.window = { location: { hash: '#/' }, addEventListener: () => {} };

test('debug: each directive with basic classes', async (t) => {
  const container = new MockElement('div');
  const app = new JSA(container);
  const template = `
let items = [{n:'a', h:'#/a'}, {n:'b', h:'#/b'}]
div.nav
  a.link each="\${items}" :href="\${item.h}" = "\${item.n}"
`;
  app.render(template);
  await new Promise(r => setTimeout(r, 10));
  const links = container.querySelectorAll('a');
  assert.strictEqual(links.length, 2, 'Should render 2 links');
});

test('debug: each directive with class-only tag', async (t) => {
  const container = new MockElement('div');
  const app = new JSA(container);
  const template = `
let navLinks = [{name:'Link1', hash:'#/1'}]
div.navbar
  a.sidebar-link each="\${navLinks}" :href="\${item.hash}" = "\${item.name}"
`;
  app.render(template);
  await new Promise(r => setTimeout(r, 10));
  const links = container.querySelectorAll('a');
  assert.strictEqual(links.length, 1, 'Should render 1 link');
});

test('debug: each directive with complex Navbar link', async (t) => {
  const container = new MockElement('div');
  const app = new JSA(container);
  const template = `
let navLinks = [{name:'Docs', hash:'#/docs'}]
div.navbar
  a.sidebar-link.transition.font-medium each="\${navLinks}" :href="\${item.hash}" = "\${item.name}"
`;
  app.render(template);
  await new Promise(r => setTimeout(r, 10));
  const links = container.querySelectorAll('a');
  assert.strictEqual(links.length, 1, 'Should render 1 link with multiple classes');
  assert.ok(links[0].className.includes('sidebar-link'), 'Should have sidebar-link class');
  assert.ok(links[0].className.includes('transition'), 'Should have transition class');
  assert.ok(links[0].className.includes('font-medium'), 'Should have font-medium class');
});
