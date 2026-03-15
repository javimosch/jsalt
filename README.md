# JSA Framework — JS Alternative

**HTML + CSS + JS in one `.jsa` file** — designed for AI agents to generate code with minimal boilerplate.

---

## Quick Start

```bash
# Copy these files to your server:
# - jsa-runtime.js
# - index.html  
# - counter.jsa
# - todo.jsa

# Then serve the directory
npx serve .
# Open http://localhost:3000
```

---

## Syntax

### State
```jsa
let count = 0
let name = "World"
```

### Elements
```jsa
div#id.class1.class2 { style: value } @event = "handler" = "content"
```

### References (DOM access)
```jsa
$myRef input { ... }
```

### Children (indentation-based)
```jsa
div
  span = "child 1"
  span = "child 2"
```

---

## Complete Example

```jsa
// Counter Component

let count = 0

div#app { display: flex; gap: 10px }
  h1 = "Count: ${count}"
  button @click = "setState('count', get('count') - 1)" = "−"
  button @click = "setState('count', get('count') + 1)" = "+"
```

---

## Handler Context

Inside `@click`, `@submit`, etc., you have access to:

| Variable | Description |
|----------|-------------|
| `state` | Component state object |
| `refs` | DOM element references |
| `el` | Current element |
| `e` | Event object |
| `setState(key, value)` | Update state and re-render |
| `get(key)` | Get state value |

---

## API

```js
import { mount, load } from './jsa-runtime.js';

// Mount template string
mount('#container', templateString);

// Load .jsa file
load('component.jsa', '#container');
```

---

## Files

```
jsalt/
├── jsa-runtime.js   # Core runtime (202 lines)
├── index.html       # Shell (32 lines)
├── counter.jsa      # Counter (15 lines)
└── todo.jsa         # Todo (13 lines)
```

**Total: 262 lines** for a complete component-based framework.

---

## Why JSA?

| Framework | Lines for Counter | Files |
|-----------|------------------|-------|
| React | ~40 | 2+ |
| Vue | ~35 | 2+ |
| Svelte | ~30 | 2+ |
| **JSA** | **15** | **1** |

**AI-Agent Optimized:**
- 🌳 Tree structure = easy generation
- ❌ No closing tags
- 📦 Full encapsulation
- ⚡ Zero boilerplate

---

MIT — Build something amazing.
