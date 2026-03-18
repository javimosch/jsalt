import test from 'node:test';
import assert from 'node:assert';
import { JSA } from '../jsa-runtime.js';

// Setup fake DOM for constructor
class MockElement {
    constructor(tag = 'div', type = 1) {
        this.tagName = tag.toUpperCase();
        this.nodeName = tag.toUpperCase();
        this.nodeType = type; // 1: Element, 3: Text
        this.childNodes = [];
        this.attributes = [];
        this.className = '';
        this.classList = {
            add: (...args) => { 
                const current = this.className.split(/\s+/).filter(x => x);
                args.forEach(c => {
                    if (!current.includes(c)) current.push(c);
                });
                this.setAttribute('class', current.join(' '));
            },
            remove: (c) => { 
                const current = this.className.split(/\s+/).filter(x => x && x !== c);
                this.setAttribute('class', current.join(' '));
            },
            contains: (c) => this.className.split(/\s+/).includes(c)
        };
        this._style = {};
        this.style = new Proxy(this._style, {
            get: (target, prop) => {
                if (prop === 'cssText') {
                    return Object.entries(target).map(([k, v]) => `${k}:${v}`).join(';');
                }
                return target[prop];
            },
            set: (target, prop, value) => {
                if (prop === 'cssText') {
                    const parts = value.split(';').filter(x => x);
                    parts.forEach(p => {
                        const pi = p.indexOf(':');
                        if (pi !== -1) {
                            const k = p.slice(0, pi).trim();
                            const v = p.slice(pi + 1).trim();
                            target[k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
                        }
                    });
                } else {
                    target[prop] = value;
                }
                return true;
            }
        });
        this.id = '';
        this._textContent = '';
        this.value = '';
        this.checked = false;
        this._jsaCtx = null;
        this._jsaNode = null;
        this.parentNode = null;
        this.dataset = {};
    }

    get textContent() {
        if (this.nodeType === 3) return this._textContent;
        return this.childNodes.map(c => c.textContent).join('');
    }

    set textContent(val) {
        if (this.nodeType === 3) {
            this._textContent = val;
        } else {
            this.childNodes = [new MockElement('#text', 3)];
            this.childNodes[0]._textContent = val;
            this.childNodes[0].parentNode = this;
        }
    }

    set innerHTML(v) {
        if (v === '') {
            this.childNodes = [];
        } else {
            this.childNodes = [new MockElement('#text', 3)];
            this.childNodes[0]._textContent = v;
            this._innerHTML = v;
        }
    }

    get innerHTML() {
        return this._innerHTML || '';
    }

    appendChild(child) {
        child.parentNode = this;
        this.childNodes.push(child);
    }

    removeChild(child) {
        const idx = this.childNodes.indexOf(child);
        if (idx !== -1) {
            this.childNodes[idx].parentNode = null;
            this.childNodes.splice(idx, 1);
        }
    }

    replaceChild(newChild, oldChild) {
        const idx = this.childNodes.indexOf(oldChild);
        if (idx !== -1) {
            oldChild.parentNode = null;
            newChild.parentNode = this;
            this.childNodes[idx] = newChild;
        }
    }

    setAttribute(name, value) {
        const attr = this.attributes.find(a => a.name === name);
        if (attr) attr.value = String(value);
        else this.attributes.push({ name, value: String(value) });
        if (name === 'class') this.className = String(value);
        if (name === 'id') this.id = String(value);
    }

    getAttributeNames() {
        const names = this.attributes.map(a => a.name);
        if (this.className && !names.includes('class')) names.push('class');
        return names;
    }

    getAttribute(name) {
        if (name === 'class') return this.className || null;
        const attr = this.attributes.find(a => a.name === name);
        return attr ? attr.value : null;
    }

    hasAttribute(name) {
        if (name === 'class') return this.className.length > 0;
        return this.attributes.some(a => a.name === name);
    }

    removeAttribute(name) {
        this.attributes = this.attributes.filter(a => a.name !== name);
        if (name === 'class') this.className = '';
    }

    setAttributeNS(ns, name, value) {
        this.setAttribute(name, value);
    }

    remove() {
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }
    }

    addEventListener() {}
    removeEventListener() {}
}

const mockContainer = new MockElement('div');
mockContainer.querySelector = (sel) => {
    if (sel.startsWith('#')) {
        const id = sel.slice(1);
        const findId = (node) => {
            if (node.id === id) return node;
            for (const child of node.childNodes) {
                const found = findId(child);
                if (found) return found;
            }
            return null;
        }
        return findId(mockContainer);
    }
    return null;
};
mockContainer.querySelectorAll = () => [];

global.document = {
    createElement: (tag) => new MockElement(tag),
    createElementNS: (ns, tag) => new MockElement(tag),
    createTextNode: (text) => {
        const el = new MockElement('#text', 3);
        el.textContent = text;
        return el;
    },
    querySelector: (sel) => mockContainer.querySelector(sel),
    head: new MockElement('head')
}
global.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 };
global.queueMicrotask = (fn) => setTimeout(fn, 0);
global.requestAnimationFrame = (fn) => setTimeout(fn, 16);
global.MutationObserver = class { observe() {} disconnect() {} };
global.fetch = async (url) => ({
    text: async () => `div = "Fetched Content"`
});

test('1. parseValue handles primitive types correctly', () => {
    const jsa = new JSA(mockContainer);
    assert.strictEqual(jsa.parseValue('true'), true, 'Should parse true');
    assert.strictEqual(jsa.parseValue('false'), false, 'Should parse false');
    assert.strictEqual(jsa.parseValue('null'), null, 'Should parse null');
    assert.strictEqual(jsa.parseValue('123'), 123, 'Should parse numbers');
    assert.strictEqual(jsa.parseValue('"hello"'), 'hello', 'Should parse strings');
});

test('2. parseElement parses basic tags, classes, and ids', () => {
    const jsa = new JSA(mockContainer);
    const result = jsa.parseElement('div#main.container.active');
    
    assert.strictEqual(result.tag, 'div');
    assert.strictEqual(result.id, 'main');
    assert.deepStrictEqual(result.classes, ['container', 'active']);
});

test('3. parseElement parses directives (if, show, each, bind)', () => {
    const jsa = new JSA(mockContainer);
    const result = jsa.parseElement('div if = "${isVisible}" each = "${items}" bind = "myVar"');
    
    assert.strictEqual(result.if, 'isVisible');
    assert.strictEqual(result.each, 'items');
    assert.strictEqual(result.bind, 'myVar');
});

test('4. parseElement parses dynamic attributes, events and content', () => {
    const jsa = new JSA(mockContainer);
    const result = jsa.parseElement('button :disabled = "${!isValid}" @click.prevent = "submit()" = "Click Me"');
    
    assert.strictEqual(result.attrs['disabled'], '${!isValid}');
    assert.strictEqual(result.events['click.prevent'], 'submit()');
    assert.strictEqual(result.content, 'Click Me');
});

test('5. interpolate replaces variables with state correctly', () => {
    const jsa = new JSA(mockContainer);
    jsa.state = { name: 'World', count: 5 };
    jsa.computedDefs = { doubled: 'count * 2' };
    
    const result = jsa.interpolate('Hello ${name}, ${count} * 2 is ${doubled}', {});
    assert.strictEqual(result, 'Hello World, 5 * 2 is 10');
});

test('6. evaluate calculates expression correctly', () => {
    const jsa = new JSA(mockContainer);
    jsa.state = { points: 100, active: true };
    
    assert.strictEqual(jsa.evaluate('points > 50 && active', {}), true);
    assert.strictEqual(jsa.evaluate('points === 50', {}), false);
    assert.strictEqual(jsa.evaluate('active ? "yes" : "no"', {}), 'yes');
});

test('7. AST parsing finds functions, hooks, and state correctly', () => {
    const jsa = new JSA(mockContainer);
    const code = [
        'let val = 10',
        'fn click = "setState(\'val\', getState(\'val\') + 1)"',
        'on mount = "console.log(\'mounted\')"',
        'div = "${val}"'
    ];
    
    const parsed = jsa.parse(code, 0);
    assert.strictEqual(parsed.defs['val']._type, 'state');
    assert.strictEqual(parsed.defs['val']._val, 10);
    assert.strictEqual(parsed.defs['click']._type, 'fn');
    assert.strictEqual(parsed.meta.hooks.length, 1);
    assert.strictEqual(parsed.meta.hooks[0].phase, 'mount');
    assert.strictEqual(parsed.nodes[0].tag, 'div');
});

test('8. parseElement parses scoped style and refs correctly', () => {
    const jsa = new JSA(mockContainer);
    const result = jsa.parseElement('$myInput input.bg-red { color: red }');
    
    assert.strictEqual(result.ref, 'myInput');
    assert.strictEqual(result.tag, 'input');
    assert.deepStrictEqual(result.classes, ['bg-red']);
    assert.strictEqual(result.styles.color, 'red');
});

test('9. decodeUnicode handles escape sequences', () => {
    const jsa = new JSA(mockContainer);
    assert.strictEqual(jsa.decodeUnicode('Line\\nBreak'), 'Line\nBreak');
    assert.strictEqual(jsa.decodeUnicode('Tab\\tSpace'), 'Tab\tSpace');
    assert.strictEqual(jsa.decodeUnicode('\\u0041'), 'A');
});

test('10. parseElement handles complex event modifiers', () => {
    const jsa = new JSA(mockContainer);
    const result = jsa.parseElement('button @click.stop.prevent = "doIt()"');
    assert.strictEqual(result.events['click.stop.prevent'], 'doIt()');
});

test('11. _patch updates text correctly', () => {
    const jsa = new JSA(mockContainer);
    const oldP = document.createElement('div');
    const oldChild = document.createElement('div');
    oldChild.textContent = 'Old Content';
    oldP.appendChild(oldChild);

    const newP = document.createElement('div');
    const newChild = document.createElement('div');
    newChild.textContent = 'New Content';
    newP.appendChild(newChild);
    
    jsa._patch(oldP, newP);
    assert.strictEqual(oldChild.textContent, 'New Content');
});

test('12. _patch updates attributes correctly', () => {
    const jsa = new JSA(mockContainer);
    const oldP = document.createElement('div');
    const o = document.createElement('div');
    o.setAttribute('title', 'Old Title');
    oldP.appendChild(o);

    const newP = document.createElement('div');
    const n = document.createElement('div');
    n.setAttribute('title', 'New Title');
    n.setAttribute('data-id', '123');
    newP.appendChild(n);
    
    jsa._patch(oldP, newP);
    assert.strictEqual(o.getAttribute('title'), 'New Title');
    assert.strictEqual(o.getAttribute('data-id'), '123');
});

test('13. _patch removes attributes correctly', () => {
    const jsa = new JSA(mockContainer);
    const oldP = document.createElement('div');
    const o = document.createElement('div');
    o.setAttribute('data-temp', 'true');
    oldP.appendChild(o);

    const newP = document.createElement('div');
    const n = document.createElement('div');
    newP.appendChild(n);
    
    jsa._patch(oldP, newP);
    assert.strictEqual(o.hasAttribute('data-temp'), false);
});

test('14. _patch handles class changes via setAttribute', () => {
    const jsa = new JSA(mockContainer);
    const oldP = document.createElement('div');
    const o = document.createElement('div');
    o.setAttribute('class', 'old-class');
    oldP.appendChild(o);

    const newP = document.createElement('div');
    const n = document.createElement('div');
    n.setAttribute('class', 'new-class');
    newP.appendChild(n);
    
    jsa._patch(oldP, newP);
    assert.strictEqual(o.getAttribute('class'), 'new-class');
});

test('15. _patch handles value and checked properties', () => {
    const jsa = new JSA(mockContainer);
    const oldP = document.createElement('div');
    const oldInput = document.createElement('input');
    oldInput.value = 'old';
    oldP.appendChild(oldInput);
    
    const oldCheckbox = document.createElement('input');
    oldCheckbox.type = 'checkbox';
    oldCheckbox.checked = false;
    oldP.appendChild(oldCheckbox);

    const newP = document.createElement('div');
    const newInput = document.createElement('input');
    newInput.value = 'new';
    newP.appendChild(newInput);
    
    const newCheckbox = document.createElement('input');
    newCheckbox.type = 'checkbox';
    newCheckbox.checked = true;
    newP.appendChild(newCheckbox);
    
    jsa._patch(oldP, newP);
    assert.strictEqual(oldInput.value, 'new');
    assert.strictEqual(oldCheckbox.checked, true);
});

test('16. _patch handles node replacement if tags differ', () => {
    const jsa = new JSA(mockContainer);
    const parent = document.createElement('div');
    const oldChild = document.createElement('span');
    parent.appendChild(oldChild);
    
    const offscreen = document.createElement('div');
    const newChild = document.createElement('p');
    offscreen.appendChild(newChild);
    
    jsa._patch(parent, offscreen);
    assert.strictEqual(parent.childNodes[0].tagName.toLowerCase(), 'p');
});

test('17. parseLines handles style blocks', () => {
    const jsa = new JSA(mockContainer);
    const lines = [
        'style',
        '  .red { color: red }',
        '  .blue { color: blue }',
        'div = "Hello"'
    ];
    const parsed = jsa.parse(lines, 0);
    assert.ok(parsed.meta.style.includes('.red { color: red }'));
    assert.ok(parsed.meta.style.includes('.blue { color: blue }'));
});

test('18. parseElement handles inline style objects', () => {
    const jsa = new JSA(mockContainer);
    const result = jsa.parseElement('div { color: red; font-size: 16px }');
    assert.strictEqual(result.styles.color, 'red');
    assert.strictEqual(result.styles.fontSize, '16px');
});

test('19. _patch preserves event contexts via _jsaCtx', () => {
    const jsa = new JSA(mockContainer);
    const oldP = document.createElement('div');
    const oldEl = document.createElement('div');
    oldEl._jsaCtx = { id: 1 };
    oldP.appendChild(oldEl);

    const newP = document.createElement('div');
    const newEl = document.createElement('div');
    newEl._jsaCtx = { id: 2 };
    newP.appendChild(newEl);
    
    jsa._patch(oldP, newP);
    assert.deepStrictEqual(oldEl._jsaCtx, { id: 2 });
});

test('20. parseValue handles numbers and JSON arrays/objects', () => {
    const jsa = new JSA(mockContainer);
    assert.strictEqual(jsa.parseValue('42'), 42);
    assert.deepStrictEqual(jsa.parseValue('[1, 2, 3]'), [1, 2, 3]);
    assert.deepStrictEqual(jsa.parseValue('{"a": 1}'), { a: 1 });
});

test('21. parse handles multi-line computed blocks', () => {
    const jsa = new JSA(mockContainer);
    const code = [
        'let a = 1',
        'const b = computed(() => {',
        '  return getState(\'a\') * 2;',
        '})',
        'div = "${b}"'
    ];
    jsa.render(code.join('\n'));
    assert.strictEqual(jsa.state.b, 2);
    
    jsa.setState('a', 5);
    // Microtask for update
    return new Promise(resolve => {
        queueMicrotask(() => {
            assert.strictEqual(jsa.state.b, 10);
            resolve();
        });
    });
});

test('22. show directive toggles display: none correctly', () => {
    const jsa = new JSA(mockContainer);
    const code = [
        'let visible = true',
        'div show = "${visible}" = "Content"'
    ];
    jsa.render(code.join('\n'));
    const el = jsa.container.childNodes[0];
    assert.notStrictEqual(el.style.display, 'none');
    
    jsa.setState('visible', false);
    return new Promise(resolve => {
        queueMicrotask(() => {
            assert.strictEqual(el.style.display, 'none');
            resolve();
        });
    });
});

test('23. buildInstance handles multiple classes correctly', () => {
    const container = new MockElement('div');
    const jsa = new JSA(container);
    const node = { 
        tag: 'div', classes: ['foo', 'bar'], attrs: {}, styles: {}, events: {},
        if: null, show: null, each: null, ref: null, bind: null, content: null, html: null
    };
    jsa.build([node], container, {});
    const el = container.childNodes[container.childNodes.length-1];
    assert.ok(el.className.includes('foo'));
    assert.ok(el.className.includes('bar'));
});

test('24. evaluate handles context items in expressions', () => {
    const jsa = new JSA(mockContainer);
    const ctx = { item: { val: 100 } };
    assert.strictEqual(jsa.evaluate('item.val + 50', ctx), 150);
});

test('25. decodeUnicode handles multiple sequences in one string', () => {
    const jsa = new JSA(mockContainer);
    assert.strictEqual(jsa.decodeUnicode('\\u0041 and \\u0042'), 'A and B');
});

test('26. lifecycle hooks run correctly', () => {
    const container = new MockElement('div');
    const jsa = new JSA(container);
    jsa.render(`on mount = "setState('mounted', true)"
on destroy = "setState('destroyed', true)"`);
    
    return new Promise(resolve => {
        setTimeout(() => {
            assert.strictEqual(jsa.state.mounted, true);
            jsa.destroy();
            assert.strictEqual(jsa.state.destroyed, true);
            resolve();
        }, 50);
    });
});

test('27. watch directive triggers handler', () => {
    const container = new MockElement('div');
    const jsa = new JSA(container);
    jsa.render(`let count = 0
watch count = "setState('watched', getState('count'))"`);
    
    jsa.setState('count', 42);
    return new Promise(resolve => {
        setTimeout(() => {
            assert.strictEqual(jsa.state.watched, 42);
            resolve();
        }, 50);
    });
});

test('28. scoped styles are injected', () => {
    const container = new MockElement('div');
    const jsa = new JSA(container);
    jsa.render(`style
  .box { color: red }
div.box = "Styled"`);
    assert.ok(jsa._scopeId);
    assert.ok(container.hasAttribute('data-jsa-' + jsa._scopeId));
});

test('29. fn definitions are callable in handlers', () => {
    const container = new MockElement('div');
    const jsa = new JSA(container);
    jsa.render(`let val = 0
fn inc = "setState('val', getState('val') + 1)"
button @click = "inc()" = "Add"`);
    
    const btn = container.childNodes.find(c => c.tagName === 'BUTTON');
    assert.ok(btn, 'Button should exist');
    jsa.execHandler(btn._jsaNode.events['click'], {}, btn, {});
    assert.strictEqual(jsa.state.val, 1);
});

test('30. event modifier .once works', () => {
    const container = new MockElement('div');
    const jsa = new JSA(container);
    jsa.render(`let count = 0
button @click.once = "setState('count', getState('count') + 1)" = "Click"`);
    const btn = container.childNodes.find(c => c.tagName === 'BUTTON');
    assert.ok(btn && btn._jsaNode.events['click.once']);
});

test('31. mount function works', async () => {
    const { mount } = await import('../jsa-runtime.js');
    const app = mount(mockContainer, 'div = "Mounted"');
    assert.ok(app instanceof JSA);
});

test('32. load function works (mocked fetch)', async () => {
    const { load } = await import('../jsa-runtime.js');
    const app = await load('fake.jsa', mockContainer);
    assert.ok(app instanceof JSA);
});

test('33. _patch handles null/falsy attribute values', () => {
    const jsa = new JSA(mockContainer);
    const oldP = document.createElement('div');
    const o = document.createElement('div');
    o.setAttribute('title', 'Visible');
    oldP.appendChild(o);

    const newP = document.createElement('div');
    const n = document.createElement('div');
    newP.appendChild(n);
    
    jsa._patch(oldP, newP);
    assert.strictEqual(o.hasAttribute('title'), false);
});

test('34. evaluate handles complex math', () => {
    const jsa = new JSA(mockContainer);
    jsa.state = { a: 10, b: 20 };
    assert.strictEqual(jsa.evaluate('(a + b) * 2 / 5', {}), 12);
});

test('35. buildNode handles null node', () => {
    const jsa = new JSA(mockContainer);
    jsa.buildNode(null, mockContainer, {});
    assert.ok(true);
});

test('36. render with nested indentation', () => {
    const container = new MockElement('div');
    const jsa = new JSA(container);
    jsa.render(`div.outer
  span.inner = "Hello"`);
    const outer = container.childNodes.find(c => c.tagName === 'DIV');
    assert.strictEqual(outer.childNodes[0].tagName, 'SPAN');
    assert.strictEqual(outer.childNodes[0].textContent, 'Hello');
});

test('37. _patch preserves state during rebuild', () => {
    const container = new MockElement('div');
    const jsa = new JSA(container);
    jsa.render(`let val = 1
div = "val: \${val}"`);
    assert.strictEqual(container.textContent, 'val: 1');
    
    jsa.setState('val', 2);
    return new Promise(resolve => {
        setTimeout(() => {
            assert.strictEqual(container.textContent, 'val: 2');
            resolve();
        }, 50);
    });
});

test('38. attributes resolution with context', () => {
    const jsa = new JSA(mockContainer);
    const ctx = { active: true, color: 'red' };
    assert.strictEqual(jsa._resolveAttr('${active ? "yes" : "no"}', ctx), 'yes');
    assert.strictEqual(jsa._resolveAttr('bg-${color}', ctx), 'bg-red');
});

test('39. destroy removes styles from head', () => {
    document.head.childNodes = []; // Clear for isolation
    const container = new MockElement('div');
    const jsa = new JSA(container);
    jsa.render(`style
  .test { color: green }
div = "Test"`);
    assert.strictEqual(document.head.childNodes.length, 1);
    jsa.destroy();
    assert.strictEqual(document.head.childNodes.length, 0);
});

test('41. load function handles fetch error', async () => {
    const originalFetch = global.fetch;
    global.fetch = () => Promise.reject('Network Error');
    try {
        const app = await (await import('../jsa-runtime.js')).load('error.jsa', mockContainer);
        assert.strictEqual(app, undefined);
    } finally {
        global.fetch = originalFetch;
    }
});

test('42. execHandler logs error on invalid code', () => {
    const container = new MockElement('div');
    const jsa = new JSA(container);
    const originalLog = console.error;
    let logged = false;
    console.error = () => { logged = true; };
    jsa.execHandler('!!! invalid code !!!', null, container, {});
    console.error = originalLog;
    assert.ok(logged);
});

test('43. _patch adds and removes children', () => {
    const container = new MockElement('div');
    const jsa = new JSA(container);
    jsa.render('div = "1"');
    assert.strictEqual(container.childNodes.length, 1);
    
    jsa.render('span = "1"\nspan = "2"');
    // Filter out text nodes if any accidentally added
    const elements = container.childNodes.filter(c => c.nodeType === 1);
    assert.strictEqual(elements.length, 2);
    assert.strictEqual(elements[0].tagName, 'SPAN');
});

test('44. transition triggers and handles end', () => {
    const container = new MockElement('div');
    const jsa = new JSA(container);
    jsa.template = 'div = "1"';
    jsa.render(jsa.template);
    
    // Now trigger a patch that adds a node with transition
    jsa.template = 'div = "1"\ndiv transition="fade" = "Show"';
    jsa.update();
    
    const div = container.childNodes[1];
    assert.ok(div && div.className.includes('fade-enter-active'));
});

test('45. bind directive handles input and change', () => {
    const container = new MockElement('div');
    const jsa = new JSA(container);
    jsa.render('let text = ""\ninput bind="text"');
    const input = container.childNodes[0];
    assert.strictEqual(input.dataset.jsaBind, 'text');
});

test('46. parseValue handles JSON and complex types', () => {
    const jsa = new JSA(mockContainer);
    assert.deepStrictEqual(jsa.parseValue('[1, 2, 3]'), [1, 2, 3]);
    assert.deepStrictEqual(jsa.parseValue('{"a":1}'), { a: 1 });
    assert.strictEqual(jsa.parseValue('() => 42')(), 42);
});

test('47. buildInstance handles show and bool attrs', () => {
    const container = new MockElement('div');
    const jsa = new JSA(container);
    jsa.render('let visible = false\ndiv show="${visible}" :checked="${!visible}" :disabled="${visible}"');
    const div = container.childNodes[0];
    assert.strictEqual(div.style.display, 'none');
    assert.ok(div.hasAttribute('checked'));
    assert.ok(!div.hasAttribute('disabled'));
});

test('48. event modifiers: prevent, stop, self, keys', () => {
    const container = new MockElement('div');
    const jsa = new JSA(container);
    jsa.render('button @click.prevent.stop.self = "1" @keyup.enter = "2"');
    const btn = container.childNodes[0];
    assert.ok(btn._jsaNode.events['click.prevent.stop.self']);
    assert.ok(btn._jsaNode.events['keyup.enter']);
});

test('49. buildInstance handles html attribute', () => {
    const container = new MockElement('div');
    const jsa = new JSA(container);
    jsa.render('div html="<b>Bold</b>"');
    assert.strictEqual(container.childNodes[0].innerHTML, '<b>Bold</b>');
});

test('50. _scopeCSS edge cases', () => {
    const jsa = new JSA(mockContainer);
    jsa._scopeId = 'test';
    // Expecting nested scoping based on current implementation behavior
    assert.strictEqual(jsa._scopeCSS('@media { .x {} }'), '@media {[data-jsa-test] .x {} }');
    assert.strictEqual(jsa._scopeCSS('.a, .b { color: red }'), '[data-jsa-test] .a, [data-jsa-test] .b { color: red }');
});

test('51. load handles button target and missing element', async () => {
    const { load } = await import('../jsa-runtime.js');
    const btn = new MockElement('button');
    // Button target should fallback to querySelector('#app')
    // We need to ensure querySelector('#app') returns something in our mock global
    const appEl = new MockElement('div');
    appEl.id = 'app';
    mockContainer.childNodes = [appEl]; // mockContainer is used by global.document.querySelector
    
    const app = await load('fake.jsa', btn);
    assert.ok(app);
    
    const app2 = await load('fake.jsa', '.non-existent');
    assert.strictEqual(app2, undefined);
});

test('52. attribute resolution with falsy/null values', () => {
    const jsa = new JSA(mockContainer);
    assert.strictEqual(jsa._resolveAttr('${null}', {}), null);
    assert.strictEqual(jsa._resolveAttr('${undefined}', {}), undefined);
    assert.strictEqual(jsa._resolveAttr('${false}', {}), false);
});

test('53. evaluate handles syntax errors', () => {
    const jsa = new JSA(mockContainer);
    assert.strictEqual(jsa.evaluate('!!!', {}), undefined);
});

test('54. buildInstance preserves refs during patch', () => {
    const container = new MockElement('div');
    const jsa = new JSA(container);
    jsa.render('div $myRef = "Old"');
    const oldEl = jsa.refs.myRef;
    jsa.render('div $myRef = "New"');
    assert.strictEqual(jsa.refs.myRef, oldEl); // Preserved via patch
});

test('55. parseElement handles inline style objects', () => {
     const jsa = new JSA(mockContainer);
     const node = jsa.parseElement('div { color: red; background-color: blue }');
     assert.strictEqual(node.styles.color, 'red');
     assert.strictEqual(node.styles.backgroundColor, 'blue');
});

test('56. interpolate handles computed errors', () => {
    const jsa = new JSA(mockContainer);
    jsa.computedDefs = { bad: 'throw new Error()' };
    // Should not throw, just return empty string for that part
    const res = jsa.interpolate('${bad}', {});
    assert.strictEqual(res, '');
});

test('57. load returns early if container not found', async () => {
    const { load } = await import('../jsa-runtime.js');
    const app = await load('fake.jsa', '#non-existent-id');
    assert.strictEqual(app, undefined);
});
test('58. _patch removes extra children', () => {
    const container = new MockElement('div');
    const jsa = new JSA(container);
    jsa.render('div = "1"\ndiv = "2"');
    assert.strictEqual(container.childNodes.length, 2);
    jsa.render('div = "Only One"');
    assert.strictEqual(container.childNodes.length, 1);
});

test('59. _patch removes class attribute if missing in new node', () => {
    const container = new MockElement('div');
    const jsa = new JSA(container);
    jsa.render('div.foo = "1"');
    assert.ok(container.childNodes[0].hasAttribute('class'));
    jsa.render('div = "1"');
    assert.ok(!container.childNodes[0].hasAttribute('class'));
});

test('60. destroy removes scopeId attribute', () => {
    const container = new MockElement('div');
    const jsa = new JSA(container);
    jsa.render('style\n  .x { color: blue }\ndiv = "Scoped"');
    const sid = jsa._scopeId;
    assert.ok(container.hasAttribute('data-jsa-' + sid));
    jsa.destroy();
    assert.ok(!container.hasAttribute('data-jsa-' + sid));
});

test('61. parse skipping children indentation', () => {
    const jsa = new JSA(mockContainer);
    const code = [
        'div.parent',
        '  span.child',
        '    b.grandchild',
        'div.sibling'
    ];
    const parsed = jsa.parse(code, 0);
    assert.strictEqual(parsed.nodes.length, 2);
    assert.strictEqual(parsed.nodes[0].children.length, 1);
    assert.strictEqual(parsed.nodes[0].children[0].children.length, 1);
});

test('62. rebuild preserves fns and computed', () => {
    const container = new MockElement('div');
    const jsa = new JSA(container);
    jsa.render('let x=1\nconst y=computed(() => x*2)\nfn t="x=10"\ndiv = "${y}"');
    jsa.update();
    assert.ok(jsa.computedDefs.y);
    assert.ok(jsa.fns.t);
});

test('40. rebuild handles changing template fns', () => {
    const container = new MockElement('div');
    const jsa = new JSA(container);
    jsa.template = 'let x = 1\nfn test = "x=2"\ndiv = "${x}"';
    jsa.render(jsa.template);
    jsa.template = 'let x = 1\nfn test = "x=100"\ndiv = "${x}"';
    jsa.update();
    assert.ok(jsa.fns.test.includes('x=100'));
});

test('63. single line style syntax', () => {
    const container = new MockElement('div');
    const jsa = new JSA(container);
    jsa.render('style = ".x { color: red }"');
    assert.ok(jsa._scopeId);
});

test('64. manual _patch coverage for id and more', () => {
    const jsa = new JSA(mockContainer);
    const op = new MockElement('div');
    const o = new MockElement('div');
    o.setAttribute('title', 'old');
    op.appendChild(o);
    
    const np = new MockElement('div');
    const n = new MockElement('div');
    n.setAttribute('title', 'new');
    np.appendChild(n);
    
    jsa._patch(op, np);
    assert.strictEqual(o.getAttribute('title'), 'new');
});

test('65. buildNode with null parent', () => {
    const jsa = new JSA(mockContainer);
    const node = jsa.buildNode({ tag: 'div', attrs: {}, children: [], classes: [], styles: {}, events: {} }, null, {});
    assert.strictEqual(node, undefined);
});

test('66. evaluate with default state', () => {
    const jsa = new JSA(mockContainer);
    assert.strictEqual(jsa.evaluate('1+1'), 2);
});
