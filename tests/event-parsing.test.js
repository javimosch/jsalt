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
    }
}
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
    addEventListener: () => {},
    removeEventListener: () => {}
};

test('event parsing: strips ${} from handlers if present', (t) => {
  const jsa = new JSA();
  const template = 'a @click="${setState(\'s\', \'v\')}"';
  const node = jsa.parseElement(template);
  
  assert.strictEqual(node.events.click, "setState('s', 'v')");
});

test('event parsing: handles complex handlers', (t) => {
  const jsa = new JSA();
  const template = 'a @click="setState(\'docSection\', \'intro\')"';
  const node = jsa.parseElement(template);
  
  assert.strictEqual(node.events.click, "setState('docSection', 'intro')");
});
