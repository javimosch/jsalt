# JSA Framework

**JSA (JS Alternative)** — A minimal reactive framework where **HTML + CSS + JS live in one `.jsa` file**.

<img width="512" height="512" src="./logo.jpg" alt="JSA Logo"/>

---

## Quick Start

### Install
```bash
npm install jsa-framework
```

### Usage
```js
import { JSA, mount, load } from 'jsa-framework';

mount('#app', `
  let count = 0
  div = "Count: ${count}"
  button @click = "setState('count', getState('count') + 1)" = "+"
`);

// Or load a .jsa file
load('counter.jsa', '#app');
```

### CDN (No Install)
```html
<script type="module">
  import { JSA } from 'https://esm.sh/jsa-framework';
</script>
```

---

## Examples

```bash
npm run demo
# Open http://localhost:3000
```

**Included:**
- `examples/counter.jsa` — Basic counter with computed values
- `examples/calculator.jsa` — Full calculator (grid layout)
- `examples/kanban.jsa` — Kanban board (each loops, localStorage, lifecycle)
- `examples/store.jsa` — Todo list (bind, each, conditionals)
- `examples/form.jsa` — Form demo (bind, :attrs, if/show, watch, scoped CSS)
- `examples/composable.jsa` — Reusable function pattern

---

## Syntax

```jsa
// State & Computed
let count = 0
let items = []
const doubled = computed(() => count * 2)

// Functions
fn inc = "setState('count', getState('count') + 1)"

// Watchers & Lifecycle
watch count = "console.log('count changed')"
on mount = "console.log('ready')"

// Scoped CSS
style
  .card { background: white; border-radius: 8px }
  .card:hover { transform: translateY(-2px) }

// UI with conditionals, loops, binding, dynamic attrs
div#app { display: flex }
  h1 = "Count: ${count}"
  div.list if = "${items.length > 0}"
    div.item each = "${items}" = "${item.text}"
  button @click = "inc()" = "+"
```

---

## v5 Features

| Feature | Syntax | Vue 3 Equivalent |
|---------|--------|-------------------|
| Conditional | `if = "${expr}"` | `v-if` |
| Toggle | `show = "${expr}"` | `v-show` |
| Loop | `each = "${array}"` | `v-for` |
| Binding | `bind = "key"` | `v-model` |
| Attrs | `:disabled = "${!ok}"` | `v-bind` |
| Watch | `watch key = "code"` | `watch()` |
| Mount | `on mount = "code"` | `onMounted()` |
| Destroy | `on destroy = "code"` | `onUnmounted()` |
| Scoped CSS | `style` block | `<style scoped>` |

---

## Handler API

| Function | Description |
|----------|-------------|
| `setState(key, val)` | Update state + re-render |
| `getState(key)` | Get current value |
| `refs.name` | DOM element reference |
| `update()` | Force re-render |
| `item` / `idx` | Current item/index in `each` loop |

---

## AST CLI

Validate `.jsa` syntax for AI agents:

```bash
jsa-ast counter.jsa           # Validate
jsa-ast counter.jsa --json    # JSON AST
jsa-ast counter.jsa --tree    # Tree view
jsa-ast *.jsa                 # Batch validate
```

**Exit codes:** `0` = valid, `1` = errors

---

## Project Structure

```
jsa-framework/
├── jsa-runtime.js       # Core runtime (~280 lines, published)
├── bin/jsa-ast.js       # AST CLI (published)
├── package.json         # NPM config
├── README.md            # This file (published)
├── examples/            # Demo apps (not published)
│   ├── index.html
│   ├── counter.jsa
│   ├── calculator.jsa
│   ├── kanban.jsa
│   ├── store.jsa
│   ├── form.jsa
│   └── composable.jsa
└── .agents/             # AI agent skills (not published)
```

---

## License

MIT
