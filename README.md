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

// Mount template
mount('#app', `
  let count = 0
  div = "${count}"
  button @click = "setState('count', getState('count') + 1)" = "+"
`);

// Or load .jsa file
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

Run the demo:
```bash
npm run demo
# Open http://localhost:3000
```

**Examples included:**
- `examples/counter.jsa` — Basic counter (15 lines)
- `examples/calculator.jsa` — Full calculator (44 lines)
- `examples/kanban.jsa` — Kanban board with composition + localStorage (80 lines)
- `examples/store.jsa` — Todo list (12 lines)
- `examples/composable.jsa` — Reusable logic (15 lines)

---

## Syntax

```jsa
// State
let count = 0
const doubled = computed(() => count * 2)

// Functions
fn inc = "setState('count', getState('count') + 1)"

// UI
div#app { display: flex }
  h1 = "Count: ${count}"
  button @click = "inc()" = "+"
```

---

## AST CLI

Validate `.jsa` syntax for AI agents:

```bash
# Install globally
npm install -g jsa-framework

# Validate a file
jsa-ast counter.jsa

# Output as JSON (for AI parsing)
jsa-ast counter.jsa --json

# Output as tree
jsa-ast counter.jsa --tree

# Quiet mode (errors only)
jsa-ast counter.jsa --quiet
```

**Exit codes:**
- `0` - Valid syntax
- `1` - Syntax errors found

---

## Handler API

| Function | Description |
|----------|-------------|
| `setState(key, val)` | Update state + re-render |
| `getState(key)` | Get current value |
| `refs.name` | DOM element reference |
| `update()` | Force re-render |

---

## Project Structure

```
jsa-framework/
├── jsa-runtime.js       # Core runtime (published to npm)
├── package.json         # NPM config
├── README.md            # This file
├── examples/            # Demo apps (not published)
│   ├── index.html
│   ├── counter.jsa
│   ├── calculator.jsa
│   ├── store.jsa
│   └── composable.jsa
└── .agents/             # AI agent skills (not published)
    └── skills/
        └── jsalt-usage/
            └── SKILL.md
```

---

## NPM Package

Only these files are published:
- `jsa-runtime.js` — Core runtime (~8KB)
- `README.md` — Documentation

Examples and skill docs are **not** included in the npm package.

---

## License

MIT
