---
skill_name: "pplx_ask_send"
description: "Teach AI agents to build web apps with JSALT framework"
---

## Overview

JSALT/JSA (JS Alternative) is a component-based reactive framework where **HTML + CSS + JS live in one `.jsa` file**.

| Metric | Value |
|--------|-------|
| Runtime size | ~230 lines / ~7KB |
| Counter app | 15 lines |
| Files needed | 1 (`.jsa`) |
| Bundle required | No |

---

## Installation

### Option 1: NPM Package
```bash
npm install jsa-framework
```

### Option 2: CDN (No Install)
```html
<script type="module">
  import { JSA, mount, load } from 'https://esm.sh/jsa-framework';
</script>
```

### Option 3: Local Files
Copy `jsa-runtime.js` to your project:
```html
<script type="module">
  import { JSA } from './jsa-runtime.js';
</script>
```

---

## Project Structure

```
project/
├── jsa-runtime.js   # Framework runtime
├── app.jsa          # Your component
└── index.html       # App shell
```

### NPM Package Structure
```
jsa-framework/
├── jsa-runtime.js   # Published to npm
├── README.md        # Published to npm
├── examples/        # NOT published (demo apps)
└── .agents/         # NOT published (skill docs)
```

---

## Core Concepts

### 1. Reactive State
```jsa
let count = 0
```
Creates a reactive variable. When changed, UI updates automatically.

### 2. Computed Values
```jsa
const doubled = computed(() => count * 2)
```
Auto-updates when dependencies change.

### 3. Functions
```jsa
fn inc = "setState('count', getState('count') + 1)"
fn dec = "setState('count', getState('count') - 1)"
```
Reusable handlers defined inline.

### 4. Elements
```jsa
div#id.class { style: value } @event = "handler" = "content"
```
- `#id` — element ID
- `.class` — CSS class
- `{ style: value }` — inline styles
- `@event = "handler"` — event listener
- `= "content"` — text content

### 5. DOM References
```jsa
$myInput input
```
Access via `refs.myInput` in handlers.

### 6. Interpolation
```jsa
div = "Count: ${count}, Doubled: ${doubled}"
```
State values auto-update in content.

### 7. List Rendering (each loops)
```jsa
let items = [{ id: 1, text: "A" }, { id: 2, text: "B" }]
fn remove = "setState('items', getState('items').filter(i => i.id !== item.id))"

div.item { padding: 8px } each = "${items}"
  span = "${item.text}"
  button @click = "remove()" = "×"
```
- `each = "${array}"` — iterate over array, repeats element + children per item
- `item` — current item in loop (available in interpolation and handlers)
- `idx` — current index (available in interpolation and handlers)

### 8. Functions Can Call Other Functions
```jsa
fn save = "localStorage.setItem('data', JSON.stringify(getState('items')))"
fn add = "setState('items', [...getState('items'), 'new']); save()"
```
All `fn` definitions are available as callable functions inside any handler.

---

## Handler API

Inside `@click`, `@submit`, etc.:

| Function | Description | Example |
|----------|-------------|---------|
| `setState(key, val)` | Update state + re-render | `setState('count', 5)` |
| `getState(key)` | Get current value | `getState('count')` |
| `refs.name` | DOM element reference | `refs.input.value` |
| `el` | Current element | `el.style.color` |
| `update()` | Force re-render | `update()` |
| `item` | Current item in `each` loop | `item.text` |
| `idx` | Current index in `each` loop | `idx` |

---

## Complete Examples

### Counter App (15 lines)

```jsa
// counter.jsa

let count = 0
const doubled = computed(() => count * 2)
fn inc = "setState('count', getState('count') + 1)"
fn dec = "setState('count', getState('count') - 1)"
fn rst = "setState('count', 0)"

div#counter { display: flex; flex-direction: column; align-items: center; gap: 20px }
  h1 = "JSA Counter"
  div.display { font-size: 32px; font-weight: bold } = "${count} (x2: ${doubled})"
  div.buttons { display: flex; gap: 10px }
    button @click = "dec()" = "−"
    button @click = "rst()" = "Reset"
    button @click = "inc()" = "+"
```

### Todo List (16 lines)

```jsa
// store.jsa

let items = []
fn add = "const t = refs.inp.value; if(!t) return; setState('items', [...getState('items'), {id: Date.now(), text: t}]); refs.inp.value = ''"
fn remove = "setState('items', getState('items').filter(i => i.id !== item.id))"

div#todo { max-width: 500px; margin: 0 auto; padding: 30px; background: white; border-radius: 16px }
  h2 = "JSA Todo Store"
  div.input { display: flex; gap: 10px; margin-bottom: 20px }
    $inp input { flex: 1; padding: 12px; border: 2px solid #eee; border-radius: 8px }
    button @click = "add()" = "Add"
  div.list { min-height: 100px; border-top: 2px solid #eee; padding-top: 10px }
    div.item { display: flex; justify-content: space-between; padding: 10px; margin: 6px 0; background: #f9fafb; border-radius: 6px } each = "${items}"
      span = "${item.text}"
      button @click = "remove()" = "×"
    p.empty { color: #999; text-align: center } = "${items.length === 0 ? 'No items — add one!' : ''}"
```

### Composable Pattern (15 lines)

```jsa
// composable.jsa

let count = 0
const doubled = computed(() => count * 2)
fn dec = "setState('count', getState('count') - 1)"
fn rst = "setState('count', 0)"
fn inc = "setState('count', getState('count') + 1)"

div#counter { display: flex; flex-direction: column; align-items: center; padding: 40px; gap: 24px; background: white; border-radius: 16px }
  h1 = "Composable-style Counter"
  div.display { font-size: 32px; font-weight: bold; color: #3b82f6; padding: 20px } = "${count} (x2: ${doubled})"
  div.buttons { display: flex; gap: 12px }
    button @click = "dec()" = "−"
    button @click = "rst()" = "Reset"
    button @click = "inc()" = "+"
```

### Calculator (50 lines)

```jsa
// calculator.jsa
// Demonstrates: multiple state, operations, grid layout

let display = "0"
let prev = ""
let op = ""
let newNum = true

fn clear = "setState('display', '0'); setState('prev', ''); setState('op', ''); setState('newNum', true)"
fn input = "const d = '1'; if(getState('newNum')) { setState('display', d); setState('newNum', false); } else { setState('display', getState('display') + d); }"
fn operate = "const o = '+'; setState('prev', getState('display')); setState('op', o); setState('newNum', true)"
fn equals = "const a = parseFloat(getState('prev')); const b = parseFloat(getState('display')); setState('display', (a + b).toString()); setState('prev', ''); setState('op', '')"

div#calculator { width: 300px; margin: 40px auto }
  div.screen { background: #333; padding: 20px; text-align: right }
    div.history = "${prev} ${op}"
    div.current { font-size: 48px } = "${display}"
  div.keys { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px }
    button @click = "clear()" = "AC"
    button @click = "input()" = "1"
    button @click = "input()" = "2"
    button @click = "operate()" = "+"
    button @click = "equals()" = "="
```

### Kanban Board (~50 lines)

```jsa
// kanban.jsa
// Demonstrates: each loops, localStorage, fn chaining, array state

let todo = ["Design UI", "Write Tests"]
let doing = ["Build API"]
let done = []

fn save = "localStorage.setItem('kanban', JSON.stringify({todo: getState('todo'), doing: getState('doing'), done: getState('done')}))"
fn addTodo = "const t = refs.t1.value; if(!t) return; setState('todo', [...getState('todo'), t]); refs.t1.value = ''; save()"

div#kanban { background: #1a1a2e; min-height: 100vh; padding: 40px 20px }
  h1 { color: white; text-align: center } = "JSA Kanban"
  div.board { display: flex; gap: 20px; justify-content: center }
    div.col { background: #e2e8f0; border-radius: 12px; padding: 16px; width: 280px }
      h3 = "To Do (${todo.length})"
      div.card { background: white; padding: 12px; border-radius: 8px; margin: 8px 0 } each = "${todo}"
        span = "${item}"
        button @click = "setState('todo', getState('todo').filter((_, i) => i !== idx)); save()" = "×"
      div.add { display: flex; gap: 6px; margin-top: 12px }
        $t1 input { flex: 1; padding: 8px }
        button @click = "addTodo()" = "+"
```

---

## Runtime API

### Import
```js
import { JSA, mount, load } from 'jsa-framework';
```

### Mount Template String
```js
const template = `
let count = 0
div = "${count}"
button @click = "setState('count', getState('count') + 1)" = "+"
`;

mount('#app', template);
```

### Load .jsa File
```js
load('counter.jsa', '#app');
```

### Manual Instance
```js
const app = new JSA('#container');
app.render(template);
```

---

## File Structure

```
project/
├── jsa-runtime.js   # Or import from npm
├── index.html       # App shell
├── counter.jsa      # Component 1
├── todo.jsa         # Component 2
└── style.css        # Optional global styles
```

### index.html Template
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>JSA App</title>
  <style>body { font-family: system-ui; }</style>
</head>
<body>
  <nav>
    <button onclick="load('counter.jsa', this)">Counter</button>
    <button onclick="load('todo.jsa', this)">Todo</button>
  </nav>
  <div id="app"></div>
  
  <script type="module">
    import { load } from 'https://esm.sh/jsa-framework';
    
    window.load = (file, btn) => {
      document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
      btn?.classList.add('active');
      load(file, btn || '#app');
    };
    
    load('counter.jsa', document.querySelector('nav button'));
  </script>
</body>
</html>
```

---

## Common Patterns

### Form Handling
```jsa
let email = ""
fn submit = "console.log(getState('email')); setState('email', '')"

form @submit = "submit()"
  $email input[type=email]
  button = "Subscribe"
```

### Conditional Rendering
```jsa
let show = false
fn toggle = "setState('show', !getState('show'))"

button @click = "toggle()" = "Toggle"
div = "${show ? 'Visible!' : 'Hidden'}"
```

### List Rendering (each)
```jsa
let items = ["A", "B", "C"]

ul
  li each = "${items}" = "${item}"

// With objects:
let users = [{name: "Alice"}, {name: "Bob"}]

div each = "${users}"
  span = "${idx + 1}. ${item.name}"
```

### Async Operations
```jsa
let data = ""
fn fetch = "fetch('/api').then(r => r.text()).then(t => setState('data', t))"

button @click = "fetch()" = "Load"
div = "${data}"
```

---

## Best Practices

1. **Keep `.jsa` files small** — One component per file
2. **Use `fn` for handlers** — Reusable and testable
3. **Computed for derived state** — Auto-updates
4. **Refs for DOM access** — Don't querySelector manually
5. **Immutable updates for arrays** — `[...old, new]`
6. **Fns can call other fns** — `fn del = "setState('x', ''); save()"`
7. **State supports arrays/objects** — `let items = []`, `let data = {}`

---

## Debugging

### Check State
```js
// In browser console
const app = new JSA();
app.render(template);
console.log(app.state);
```

### Debug Page
```html
<div id="debug"></div>
<script type="module">
  import { JSA } from 'jsa-framework';
  const app = new JSA('#debug');
  app.render(template);
  console.log('State:', app.state);
  console.log('Functions:', app.fns);
</script>
```

---

## Comparison

| Task | React | Vue | JSA |
|------|-------|-----|-----|
| Counter | 25 lines | 20 lines | 15 lines |
| Files | 2+ | 2+ | 1 |
| Setup | Build | Build | None |
| Reactivity | useState | ref | let |

---

## AST CLI for AI Agents

Validate `.jsa` syntax programmatically:

### Installation
```bash
npm install -g jsa-framework
```

### Commands
```bash
# Validate file
jsa-ast file.jsa

# JSON output (for AI parsing)
jsa-ast file.jsa --json

# Tree output
jsa-ast file.jsa --tree

# Quiet mode (errors only)
jsa-ast file.jsa --quiet
```

### Exit Codes
| Code | Meaning |
|------|---------|
| `0` | Valid syntax |
| `1` | Syntax errors |

### JSON Output Schema
```json
{
  "ast": {
    "type": "program",
    "source": "...",
    "state": [{ "type": "state|computed", "name": "...", "line": 1 }],
    "functions": [{ "type": "function", "name": "...", "handler": "...", "line": 1 }],
    "elements": [{ "type": "element", "tag": "div", "line": 1 }]
  },
  "errors": [{ "line": 1, "message": "..." }],
  "warnings": [{ "line": 1, "message": "..." }]
}
```

---

## Quick Reference

```jsa
// State
let name = "World"

// Computed
const greeting = computed(() => "Hello " + name)

// Functions
fn update = "setState('name', 'New')"

// Elements
div#app.container { color: blue }
  h1 = "${greeting}"
  button @click = "update()" = "Click"
  $ref input
```

---

## Next Steps

1. Copy `jsa-runtime.js` or install via npm
2. Create `counter.jsa` with the example above
3. Create `index.html` shell
4. Open in browser
5. Iterate!

---

**MIT License** — Build something amazing.
