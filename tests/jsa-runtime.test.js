import test from 'node:test';
import assert from 'node:assert';
import { JSA } from '../jsa-runtime.js';

// Setup fake DOM for constructor
const mockContainer = {
    querySelector: () => null,
    innerHTML: '',
    appendChild: () => {},
    setAttribute: () => {},
    removeAttribute: () => {},
    querySelectorAll: () => []
};

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
