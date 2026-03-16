---
skill_name: "pplx_ask_send"
description: "Teach AI agents to build web apps with JSALT framework"
---

## Overview

JSALT/JSA (JS Alternative) is a component-based reactive framework where **HTML + CSS + JS live in one `.jsa` file**.

| Metric | Value |
|--------|-------|
| Runtime size | ~300 lines / ~9KB |
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

## Core Concepts

### 1. Reactive State
```jsa
let count = 0
let items = []
let name = "World"
```
Creates reactive variables. Arrays/objects supported via JSON.

### 2. Computed Values
```jsa
const doubled = computed(() => count * 2)
const valid = computed(() => name.length > 0 && email.includes('@'))
```
Auto-updates when dependencies change.

### 3. Functions
```jsa
fn inc = "setState('count', getState('count') + 1)"
fn save = "localStorage.setItem('data', JSON.stringify(getState('items')))"
fn add = "setState('items', [...getState('items'), 'new']); save()"
```
Reusable handlers. Functions can call other functions.

### 4. Elements
```jsa
div#id.class { style: value } @event = "handler" = "content"
```
- `#id` — element ID
- `.class` — CSS class (`.a.b` for multiple)
- `{ style: value }` — inline styles (semicolon-separated)
- `@event = "handler"` — event listener
- `= "content"` — text content with `${interpolation}`

### 5. DOM References
```jsa
$myInput input
```
Access via `refs.myInput` in handlers.

### 6. Interpolation
```jsa
div = "Count: ${count}, Doubled: ${doubled}"
div = "${items.length === 0 ? 'Empty' : items.length + ' items'}"
```
Expressions inside `${}` are evaluated with full state access.

### 7. List Rendering — `each`
```jsa
let items = [{id: 1, text: "A"}, {id: 2, text: "B"}]
fn remove = "setState('items', getState('items').filter(i => i.id !== item.id))"

div.item each = "${items}"
  span = "${idx + 1}. ${item.text}"
  button @click = "remove()" = "×"
```
- `each = "${array}"` — iterate over array
- `item` — current item in loop
- `idx` — current index in loop

### 8. Conditional Rendering — `if` / `show`
```jsa
let loggedIn = false

div.welcome if = "${loggedIn}" = "Welcome back!"
div.login if = "${!loggedIn}" = "Please sign in"

div.panel show = "${expanded}" = "Details here"
```
- `if = "${expr}"` — removes element from DOM when falsy
- `show = "${expr}"` — hides element with `display:none` when falsy
- No `else` keyword — use `if = "${!expr}"` (explicit, agent-friendly)

### 9. Two-Way Binding — `bind`
```jsa
let name = ""
let agree = false

input :type = "text" bind = "name"
input :type = "checkbox" bind = "agree"
select bind = "color"
textarea bind = "notes"
```
- `bind = "stateKey"` — syncs input value with state
- Text/email/etc → updates on `input` event
- Checkbox/radio → updates on `change` event, uses `.checked`
- Select → updates on `change` event
- Cursor position preserved on re-render

### 10. Dynamic Attributes — `:attr`
```jsa
button :disabled = "${!valid}" = "Submit"
img :src = "${imageUrl}" :alt = "${title}"
input :type = "${showPw ? 'text' : 'password'}"
a :href = "${link}" :target = "_blank" = "Open"
```
- `:attr = "value"` — set attribute dynamically
- `${expr}` — evaluated as expression (boolean attrs toggled)
- Literal strings without `${}` passed as-is
- Boolean attrs (`disabled`, `checked`, `hidden`, `readonly`, `required`): removed when falsy

### 10a. `:class` Merging (Tailwind-friendly)
```jsa
div.container :class = "bg-blue-500 text-white p-4 rounded-lg"
div :class = "${active ? 'bg-blue-600 ring-2' : 'bg-gray-200'} hover:scale-105 transition-all"
button.btn :class = "${valid ? 'opacity-100' : 'opacity-40 cursor-not-allowed'}"
```
- `:class` merges with static `.classes` (doesn't replace)
- Split by spaces, each token added via `classList.add()`
- Falsy values (`false`, `null`, `undefined`) filtered out
- Works with Tailwind CDN — classes detected via MutationObserver

### 10b. `:style` Dynamic
```jsa
div :style = "width: ${progress}%"
div :style = "transform: translateX(${offset}px); opacity: ${visible ? 1 : 0}"
```
- `:style` merges with static `{ }` styles
- Parsed as `key: value;` pairs, camelCase converted
- Values with colons (e.g. URLs) handled correctly

### 11. Watchers — `watch`
```jsa
let items = []
watch items = "localStorage.setItem('items', JSON.stringify(getState('items')))"

let search = ""
watch search = "fetch('/api?q=' + getState('search')).then(r => r.json()).then(d => setState('results', d))"
```
- `watch key = "code"` — runs when state key changes
- Runs after DOM rebuild (in microtask)
- Has full handler context (setState, getState, refs, etc.)
- Uses deep comparison for arrays/objects

### 12. Lifecycle Hooks — `on mount` / `on destroy`
```jsa
let data = []
on mount = "fetch('/api').then(r => r.json()).then(d => setState('data', d))"
on mount = "console.log('Component ready, refs:', Object.keys(refs))"
on destroy = "console.log('Cleaning up')"
```
- `on mount = "code"` — runs after initial render (DOM ready, refs available)
- `on destroy = "code"` — runs when component is replaced/destroyed
- Multiple hooks of same type allowed
- Mount hooks run via `setTimeout(0)` so DOM is painted

### 14. Raw HTML — `html`
```jsa
div html = "<svg viewBox='0 0 24 24'><path d='M12 2L2 22h20z'/></svg>"
p html = "Bold <strong>text</strong> and <em>italic</em>"
span html = "${item.up ? '↑' : '↓'} ${item.value}%"
```
- `html = "content"` — sets innerHTML (vs `= "content"` which sets textContent)
- Supports `${}` interpolation inside HTML
- Use single quotes for HTML attributes inside double-quoted value
- If both `html` and `= "content"` present, `html` takes precedence

### 15. Event Modifiers
```jsa
button @click.prevent = "submit()"
input @keydown.enter = "search()"
form @submit.prevent = "save()"
div @click.stop = "toggle()"
button @click.once = "init()"
input @keydown.esc = "cancel()"
div @click.self = "closeModal()"
```
- `.prevent` — calls `e.preventDefault()`
- `.stop` — calls `e.stopPropagation()`
- `.self` — only fires if `e.target === el`
- `.once` — listener removed after first trigger
- Key modifiers: `.enter`, `.esc`, `.tab`, `.space`, `.delete`, `.up`, `.down`, `.left`, `.right`
- Chain multiple: `@keydown.enter.prevent = "submit()"`

### 16. Enter Transitions
```jsa
div.card transition = "fade"
div.toast transition = "slide"
```
- `transition = "name"` — applies CSS class lifecycle on element creation
- Sequence: `{name}-enter-from` + `{name}-enter-active` → next frame removes `enter-from`, adds `enter-to` → on `transitionend` removes all
- Define transition classes in a `style` block:
```jsa
style
  .fade-enter-from { opacity: 0; transform: scale(0.95); }
  .fade-enter-active { transition: all 0.2s ease-out; }
  .fade-enter-to { opacity: 1; transform: scale(1); }
```
- Works great with `if` for show/hide animations
- Pairs naturally with Tailwind CDN for utility-based transitions

### 17. Scoped CSS — `style`
```jsa
style
  .card { background: white; border-radius: 8px; padding: 16px }
  .card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15) }
  button { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer }
  button:disabled { opacity: 0.4; cursor: not-allowed }
  @media (max-width: 768px) { .card { padding: 8px } }
```
Or inline: `style = ".card { background: white } button { cursor: pointer }"`
- CSS automatically scoped to component via `data-jsa-*` attribute
- Supports pseudo-selectors (`:hover`, `:focus`, `:disabled`)
- Supports `@media` queries
- Indented block form recommended (no quote escaping needed)

---

## Handler API

Inside `@event`, `fn`, `watch`, and `on` handlers:

| Function | Description | Example |
|----------|-------------|---------|
| `setState(key, val)` | Update state + re-render | `setState('count', 5)` |
| `getState(key)` | Get current value | `getState('count')` |
| `refs.name` | DOM element reference | `refs.input.value` |
| `el` | Current element | `el.style.color = 'red'` |
| `e` | Event object | `e.preventDefault()` |
| `update()` | Force re-render | `update()` |
| `item` | Current item in `each` loop | `item.text` |
| `idx` | Current index in `each` loop | `idx` |

**Note:** Event modifiers (`.prevent`, `.stop`, `.self`, `.once`, key filters) are handled automatically before the handler runs.

---

## Element Parse Order

```
$ref → tag#id.class → { styles } → if → show → each → transition → bind → html → :attrs → @events(.mods) → = "content"
```

All directives can coexist on one line:
```jsa
$ref input.field { padding: 8px } if = "${editing}" :type = "text" :placeholder = "Name" bind = "name" @keydown.enter = "save()" = "default"
```

---

## Complete Examples

### Counter (15 lines)
```jsa
let count = 0
const doubled = computed(() => count * 2)
fn dec = "setState('count', getState('count') - 1)"
fn rst = "setState('count', 0)"
fn inc = "setState('count', getState('count') + 1)"

div#counter { display: flex; flex-direction: column; align-items: center; gap: 20px }
  h1 = "JSA Counter"
  div.display { font-size: 32px; font-weight: bold } = "${count} (x2: ${doubled})"
  div.buttons { display: flex; gap: 10px }
    button @click = "dec()" = "−"
    button @click = "rst()" = "Reset"
    button @click = "inc()" = "+"
```

### Todo List with Bind (14 lines)
```jsa
let items = []
let newText = ""
fn add = "const t = getState('newText'); if(!t) return; setState('items', [...getState('items'), {id: Date.now(), text: t}]); setState('newText', '')"
fn remove = "setState('items', getState('items').filter(i => i.id !== item.id))"

div#todo { max-width: 500px; margin: 0 auto; padding: 30px }
  h2 = "JSA Todo"
  div.input { display: flex; gap: 10px }
    input :placeholder = "Add a todo..." bind = "newText"
    button @click = "add()" = "Add"
  div.list
    div.item each = "${items}"
      span = "${item.text}"
      button @click = "remove()" = "×"
    p if = "${items.length === 0}" = "No items — add one!"
```

### Form with Validation
```jsa
let name = ""
let email = ""
let agree = false
let submitted = false
const valid = computed(() => name.length > 0 && email.includes('@') && agree)

watch submitted = "if(getState('submitted')) setTimeout(() => setState('submitted', false), 3000)"

style
  .form { max-width: 420px; margin: 40px auto; padding: 32px; background: white; border-radius: 16px }
  .field { margin-bottom: 16px }
  button:disabled { opacity: 0.4; cursor: not-allowed }

div.form
  h2 = "Contact Form"
  div.success show = "${submitted}" = "✓ Submitted!"
  div if = "${!submitted}"
    div.field
      label = "Name"
      input :type = "text" bind = "name" @keydown.enter = "if(getState('valid')) setState('submitted', true)"
    div.field
      label = "Email"
      input :type = "email" bind = "email"
    div.check { display: flex; gap: 8px }
      input :type = "checkbox" bind = "agree"
      span = "I agree"
    button :disabled = "${!valid}" @click = "setState('submitted', true)" = "Submit"
```

### Dashboard with Tailwind CDN (v6 showcase)
```jsa
let dark = false
let search = ""
let modal = false
let toast = ""
let progress = 68
let activities = [{name: "Alice", action: "Deployed v2.4", time: "2m ago", type: "success"}, ...]
const filtered = computed(() => activities.filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase())))

fn toggleDark = "setState('dark', !getState('dark'))"
fn openModal = "setState('modal', true)"
fn closeModal = "setState('modal', false)"

style
  .fade-enter-from { opacity: 0; transform: scale(0.95); }
  .fade-enter-active { transition: all 0.2s ease-out; }
  .fade-enter-to { opacity: 1; transform: scale(1); }

div :class = "${dark ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'} min-h-screen"
  nav :class = "${dark ? 'bg-gray-900' : 'bg-white'} border-b px-6 h-16 flex items-center justify-between"
    h1 :class = "text-xl font-bold" = "Dashboard"
    input :class = "..." bind = "search" @keydown.esc = "setState('search', '')"
  div :class = "grid grid-cols-1 lg:grid-cols-4 gap-5"
    div :class = "..." html = "<svg ...>...</svg>"   // SVG icons via html
  div :class = "..." each = "${filtered}"              // :class + each
    p = "${item.name}: ${item.action}"
  div :class = "..." :style = "width: ${progress}%"    // :style dynamic
  div :class = "..." if = "${modal}" @click.self = "closeModal()"  // event modifiers
    div transition = "fade"                             // enter transition
  div if = "${toast}" transition = "slide" = "${toast}" // toast animation
```

### Kanban Board (with on mount)
```jsa
let todo = ["Design UI"]
let doing = ["Build API"]
let done = []

fn save = "localStorage.setItem('kanban', JSON.stringify({todo: getState('todo'), doing: getState('doing'), done: getState('done')}))"
on mount = "const s = localStorage.getItem('kanban'); if(s) { const d = JSON.parse(s); setState('todo', d.todo||[]); setState('doing', d.doing||[]); setState('done', d.done||[]); }"
fn addTodo = "const t = refs.t1.value; if(!t) return; setState('todo', [...getState('todo'), t]); refs.t1.value = ''; save()"

div#kanban { display: flex; gap: 20px; padding: 40px }
  div.col { background: #e2e8f0; border-radius: 12px; padding: 16px; width: 280px }
    h3 = "To Do (${todo.length})"
    div.card { background: white; padding: 12px; border-radius: 8px; margin: 8px 0 } each = "${todo}"
      span = "${item}"
      button @click = "setState('todo', getState('todo').filter((_, i) => i !== idx)); save()" = "×"
    div.add { display: flex; gap: 6px }
      $t1 input { flex: 1; padding: 8px }
      button @click = "addTodo()" = "+"
```

---

## Runtime API

### Import
```js
import { JSA, mount, load } from 'jsa-framework';
```

### Mount Template
```js
const app = mount('#app', template);
```

### Load .jsa File
```js
const app = await load('counter.jsa', '#app');
```

### Manual Instance
```js
const app = new JSA('#container');
app.render(template);
app.destroy(); // cleanup
```

---

## AST CLI

Validate `.jsa` syntax for AI agents:

```bash
jsa-ast file.jsa           # Validate
jsa-ast file.jsa --json    # JSON AST output
jsa-ast file.jsa --tree    # Tree view
jsa-ast file.jsa --quiet   # Errors only
jsa-ast *.jsa              # Batch validate
```

### JSON Output Schema
```json
{
  "ast": {
    "type": "program",
    "state": [{ "type": "state|computed", "name": "...", "line": 1 }],
    "functions": [{ "type": "function", "name": "...", "handler": "...", "line": 1 }],
    "watchers": [{ "type": "watcher", "key": "...", "handler": "...", "line": 1 }],
    "hooks": [{ "type": "hook", "phase": "mount|destroy", "handler": "...", "line": 1 }],
    "style": "scoped CSS string or null",
    "elements": [{ "type": "element", "tag": "div", "each": null, "if": null, "show": null, "bind": null, "html": null, "transition": null, "attrs": {}, "events": {}, "line": 1 }],
    "refs": ["inputName"]
  },
  "errors": [],
  "warnings": []
}
```

---

## Common Patterns

### Conditional Content
```jsa
let show = false
fn toggle = "setState('show', !getState('show'))"

button @click = "toggle()" = "${getState('show') ? 'Hide' : 'Show'}"
div if = "${show}" = "Now you see me!"
div show = "${show}" = "I'm hidden but still in DOM"
```

### Form with Bind
```jsa
let email = ""
let subscribed = false

div.form
  input :type = "email" :placeholder = "Email" bind = "email"
  button :disabled = "${!email.includes('@')}" @click = "setState('subscribed', true)" = "Subscribe"
  p show = "${subscribed}" = "Thanks!"
```

### Auto-Save with Watch
```jsa
let notes = ""
watch notes = "localStorage.setItem('notes', getState('notes'))"
on mount = "const s = localStorage.getItem('notes'); if(s) setState('notes', s)"

textarea bind = "notes" :placeholder = "Start typing..."
p = "${notes.length} characters — auto-saved"
```

### Async Data Loading
```jsa
let data = []
let loading = false
on mount = "setState('loading', true); fetch('/api').then(r => r.json()).then(d => { setState('data', d); setState('loading', false) })"

p if = "${loading}" = "Loading..."
div.list if = "${!loading}"
  div each = "${data}" = "${item.name}"
```

---

## Best Practices

1. **One component per `.jsa` file** — keep files small
2. **Use `fn` for handlers** — reusable and composable
3. **Use `computed` for derived state** — auto-updates
4. **Use `bind` for forms** — cleaner than refs for input values
5. **Use `if` to remove, `show` to hide** — `if` is more efficient, `show` preserves state
6. **Use `watch` for side effects** — localStorage, API calls, logging
7. **Use `on mount` for initialization** — data loading, timers, etc.
8. **Use scoped `style` blocks** — hover states, transitions, media queries
9. **Immutable array updates** — `[...old, new]`, `.filter()`, `.map()`
10. **Refs for DOM-only access** — prefer `bind` over refs for input values
11. **Use `:class` for Tailwind** — merges with static `.classes`
12. **Use `html` for rich content** — SVG icons, formatted text, badges
13. **Use event modifiers** — cleaner than `e.preventDefault()` in handler
14. **Use `transition` with `if`** — enter animations for modals, toasts
15. **Use `:style` for dynamic values** — progress bars, positioning, transforms

---

## Feature Comparison with Vue 3

| Vue 3 | JSA v5 | Example |
|-------|--------|---------|
| `v-if` | `if = "${expr}"` | `div if = "${show}"` |
| `v-show` | `show = "${expr}"` | `div show = "${open}"` |
| `v-for` | `each = "${arr}"` | `li each = "${items}"` |
| `v-model` | `bind = "key"` | `input bind = "name"` |
| `v-bind` | `:attr = "val"` | `:disabled = "${!ok}"` |
| `v-on` | `@event = "code"` | `@click = "inc()"` |
| `v-html` | `html = "content"` | `div html = "<b>bold</b>"` |
| `.prevent` | `@event.prevent` | `@submit.prevent = "..."` |
| `.stop` | `@event.stop` | `@click.stop = "..."` |
| `.self` | `@event.self` | `@click.self = "close()"` |
| `.once` | `@event.once` | `@click.once = "init()"` |
| `key` modifiers | `@event.key` | `@keydown.enter = "..."` |
| `<Transition>` | `transition = "name"` | `div transition = "fade"` |
| `ref()` | `let x = 0` | `let count = 0` |
| `computed()` | `computed(() => ...)` | `const d = computed(...)` |
| `watch()` | `watch key = "code"` | `watch items = "save()"` |
| `onMounted()` | `on mount = "code"` | `on mount = "load()"` |
| `onUnmounted()` | `on destroy = "code"` | `on destroy = "cleanup()"` |
| `<style scoped>` | `style` block | `style\n  .x { ... }` |

---

## Common Patterns (v6)

### Tailwind + Dark Mode
```jsa
let dark = false
fn toggle = "setState('dark', !getState('dark'))"

div :class = "${dark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} min-h-screen transition-colors"
  button :class = "${dark ? 'bg-gray-800' : 'bg-gray-100'} p-2 rounded-lg" @click = "toggle()" = "${dark ? '☀️' : '🌙'}"
```

### Modal with Transition + Backdrop Click
```jsa
let open = false
style
  .fade-enter-from { opacity: 0; transform: scale(0.95); }
  .fade-enter-active { transition: all 0.2s ease-out; }
  .fade-enter-to { opacity: 1; transform: scale(1); }

button @click = "setState('open', true)" = "Open"
div :class = "fixed inset-0 bg-black/50 flex items-center justify-center" if = "${open}" @click.self = "setState('open', false)"
  div :class = "bg-white rounded-xl p-6" transition = "fade"
    h2 = "Modal Content"
    button @click = "setState('open', false)" = "Close"
```

### Progress Bar with :style
```jsa
let pct = 45
div :class = "bg-gray-200 rounded-full h-3 overflow-hidden"
  div :class = "bg-blue-500 h-full rounded-full transition-all" :style = "width: ${pct}%"
```

### SVG Icons via html
```jsa
span html = "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' class='w-5 h-5'><path d='M5 13l4 4L19 7'/></svg>"
```

### Form with Enter Key
```jsa
let query = ""
fn search = "console.log('Searching:', getState('query'))"

input bind = "query" @keydown.enter = "search()" @keydown.esc = "setState('query', '')"
button @click = "search()" = "Search"
```

---

**MIT License** — Build something amazing.
