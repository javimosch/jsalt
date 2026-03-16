# JSA Framework Examples

Demo applications showcasing JSA capabilities.

---

## Run Examples

### Option 1: NPM
```bash
npm install jsa-framework
npm run demo
# Open http://localhost:3000
```

### Option 2: Local
```bash
cd examples
npx serve .
# Open http://localhost:3000
```

### Option 3: Python
```bash
cd examples
python3 -m http.server 3000
# Open http://localhost:3000
```

---

## Examples

### Counter (`counter.jsa`) — 15 lines
Basic reactive counter with increment, decrement, and reset.

**Features:**
- Reactive state (`let count = 0`)
- Computed values (`const doubled = computed(...)`)
- Functions (`fn inc = "..."`)

### Calculator (`calculator.jsa`) — 44 lines
Full-featured calculator with basic arithmetic operations.

**Features:**
- Multiple state variables
- Complex event handlers
- Grid layout
- History display

### Kanban (`kanban.jsa`) — 73 lines
Full-featured Kanban board with columns, cards, and localStorage persistence.

**Features:**
- List rendering with `each` attribute
- localStorage persistence
- Multiple columns (Todo, In Progress, Done)
- Add/delete cards
- Move cards between columns
- Card count per column
- Dynamic card rendering from arrays

**Syntax:**
```jsa
let columns = { todo: [{ id: 1, text: "Task 1" }], progress: [], done: [] }

div.card each = "${columns.todo}"
  div = "${item.text}"
  button @click = "moveToProgress()" = "→"
```

### Todo (`store.jsa`) — 12 lines
Simple todo list demonstrating array state management.

**Features:**
- Array state
- Immutable updates
- DOM references

### Composable (`composable.jsa`) — 15 lines
Reusable logic pattern similar to Vue/React composables.

**Features:**
- `use()` pattern
- Encapsulated state
- Reusable functions

---

## File Structure

```
examples/
├── index.html         # Demo shell
├── counter.jsa        # Counter app
├── calculator.jsa     # Calculator app
├── store.jsa          # Todo app
└── composable.jsa     # Composable pattern
```

---

## Create Your Own

1. Copy any example file
2. Modify the `.jsa` content
3. Add a button in `index.html` or create your own HTML shell

```html
<script type="module">
  import { load } from '../jsa-runtime.js';
  load('my-app.jsa', '#app');
</script>
```
