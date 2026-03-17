# JSA Framework - Complete Examples

A collection of production-ready examples demonstrating all JSA v6 features.

---

## 📁 Component Files (5 Components + 2 Composables)

| File | Lines | Features Demonstrated |
|------|-------|----------------------|
| `composables.jsa` | 30 | Reusable logic factories (useStorage, useToggle, useCounter, useModal, useForm, useNotifier) |
| `project-card.jsa` | 52 | Component composition, dynamic classes, transitions, conditional rendering |
| `task-list.jsa` | 49 | List rendering (`each`), filtering, computed values, two-way binding |
| `stats-panel.jsa` | 79 | Dynamic styling, computed values, grid layouts, animations |
| `notification-toast.jsa` | 30 | Transitions, auto-dismiss, list rendering, dynamic icons |
| `dashboard-pro.jsa` | 155 | **Full composition** of all components, scoped CSS, lifecycle hooks, watchers, modals |

---

## 🎯 Features Showcase

### Dashboard Pro (`dashboard-pro.jsa`)

The main example demonstrating **complete component composition**:

```
Dashboard Pro
├── Sidebar (collapsible, transitions)
├── Top Bar (dark mode toggle, notifications)
├── Welcome Banner
├── Stats Panel (composed inline)
├── Project Card (composed inline)
├── Task List (composed inline)
├── Modal (transitions, dynamic content)
└── Notifications (toast component)
```

**Features used:**
- ✅ Component composition (5+ components)
- ✅ 2+ composables (createToggle, createNotifier)
- ✅ Scoped CSS with `style` block
- ✅ Lifecycle hooks (`on mount`, `on destroy`)
- ✅ Watchers (`watch darkMode`)
- ✅ Transitions (`transition = "fade"`, `transition = "slide"`)
- ✅ Conditional rendering (`if = "..."`)
- ✅ List rendering (`each = "..."`)
- ✅ Two-way binding (`bind = "..."`)
- ✅ Dynamic attributes (`:class`, `:style`)
- ✅ Event modifiers (`@click.stop`, `@click.self`)
- ✅ localStorage persistence
- ✅ Unicode emoji support

---

## 🚀 Quick Start

```bash
# From project root
npm run demo

# Or directly
cd examples
npx serve .

# Open http://localhost:3000
```

---

## 📊 Example Breakdown

### 1. Composables (`composables.jsa`) - 30 lines

Reusable logic factories:

```jsa
// Storage composable
fn createStorage = "const key = 'jsa-' + Math.random().toString(36).slice(2,7); return { key, get: () => JSON.parse(localStorage.getItem(key) || 'null'), set: (v) => localStorage.setItem(key, JSON.stringify(v)) }"

// Toggle composable
fn createToggle = "let val = false; return { value: val, toggle: () => { val = !val; return val; }, set: (v) => { val = v; return v; } }"

// Counter composable
fn createCounter = "let val = 0; return { value: val, inc: (by=1) => { val += by; return val; }, dec: (by=1) => { val -= by; return val; }, reset: () => { val = 0; return 0; } }"

// Modal composable
fn createModal = "let isOpen = false; let content = ''; return { isOpen, open: (c='') => { isOpen = true; content = c; }, close: () => { isOpen = false; content = ''; }, toggle: () => { isOpen = !isOpen; } }"

// Form composable
fn createForm = "let data = {}; let errors = {}; return { data, errors, setField: (k,v) => { data[k] = v; }, setError: (k,e) => { errors[k] = e; }, validate: (rules) => { /* validation logic */ }, reset: () => { data = {}; errors = {}; } }"

// Notification composable
fn createNotifier = "let notifications = []; return { notifications, add: (msg, type='info') => { const n = { id: Date.now(), msg, type }; notifications = [...notifications, n]; setTimeout(() => { notifications = notifications.filter(x => x.id !== n.id); }, 3000); }, remove: (id) => { notifications = notifications.filter(n => n.id !== id); } }"
```

---

### 2. Project Card (`project-card.jsa`) - 52 lines

Interactive card with expandable details:

```jsa
let project = { id: 1, name: "Website Redesign", status: "active", progress: 75, team: 5 }
let expanded = false

fn toggleExpand = "setState('expanded', !getState('expanded'))"
fn getStatusColor = "const s = getState('project').status; return s === 'active' ? 'bg-green-500' : s === 'paused' ? 'bg-yellow-500' : 'bg-gray-500'"

div.project-card :class = "bg-white rounded-xl border p-5 cursor-pointer transition-all" @click = "toggleExpand()" transition = "card"
  // Card content with dynamic classes and conditional details
```

---

### 3. Task List (`task-list.jsa`) - 49 lines

Filterable task list with checkboxes:

```jsa
let tasks = [{ id: 1, title: "Design", status: "done", priority: "high" }, ...]
let filter = "all"
let searchTerm = ""

const filteredTasks = computed(() => {
  let result = getState('tasks');
  if (getState('filter') !== 'all') result = result.filter(t => t.status === getState('filter'));
  const s = getState('searchTerm').toLowerCase();
  if (s) result = result.filter(t => t.title.toLowerCase().includes(s));
  return result;
})

div.task-list
  // Filter buttons
  // Search input with bind
  // Task list with each rendering
```

---

### 4. Stats Panel (`stats-panel.jsa`) - 79 lines

Animated statistics with period selection:

```jsa
let stats = { totalProjects: 24, completedTasks: 156, teamMembers: 12, revenue: 48200 }
let period = "month"

const growthRate = computed(() => {
  const p = getState('period');
  return p === 'week' ? 12.5 : p === 'month' ? 8.1 : 24.3;
})

const completionRate = computed(() => {
  const s = getState('stats');
  return Math.round((s.completedTasks / (s.completedTasks + s.pendingTasks)) * 100);
})

div.stats-panel
  // Period selector buttons
  // Stats grid with dynamic gradients
  // Progress bar with animation
```

---

### 5. Notification Toast (`notification-toast.jsa`) - 30 lines

Auto-dismissing notifications:

```jsa
let notifications = [{ id: 1, message: "Success!", type: "success" }, ...]

fn addNotification = "const msg = '${1}'; const id = Date.now(); setState('notifications', [...getState('notifications'), { id, message: msg, type: '${2}' }]); setTimeout(() => removeNotification(id), 3000)"
fn removeNotification = "const id = ${1}; setState('notifications', getState('notifications').filter(n => n.id !== id))"

div.notifications :class = "fixed top-4 right-4 z-50 space-y-3"
  div.toast each = "${notifications}" transition = "toast"
    // Toast content with dynamic icons
```

---

### 6. Dashboard Pro (`dashboard-pro.jsa`) - 155 lines

Complete dashboard composing all components:

```jsa
let darkMode = false
let sidebarOpen = true
let showModal = false
let currentUser = { name: "John Doe", avatar: "👨‍💼", role: "Admin" }

watch darkMode = "localStorage.setItem('jsa-dark', JSON.stringify(getState('darkMode')))"

on mount = "const saved = localStorage.getItem('jsa-dark'); if(saved) setState('darkMode', JSON.parse(saved))"
on destroy = "console.log('Dashboard destroyed')"

div.dashboard :class = "${darkMode ? 'dark bg-gray-950' : 'bg-gray-50'} min-h-screen"
  // Sidebar with navigation
  // Main content area
  // Stats panel (composed)
  // Project card (composed)
  // Task list (composed)
  // Modal with transitions
  // Notifications (composed)
```

---

## ✅ Validation Results

```
✅ examples/calculator.jsa — S:4, F:6, E:1
✅ examples/composable.jsa — S:2, F:3, E:1
✅ examples/composables.jsa — S:0, F:9, E:0
✅ examples/counter.jsa — S:2, F:3, E:1
✅ examples/dashboard-pro.jsa — S:6, F:5, E:1, W:1, H:2, CSS
✅ examples/dashboard.jsa — S:7, F:4, E:1, CSS
✅ examples/form.jsa — S:5, F:0, E:1, W:1, H:1, CSS
✅ examples/kanban.jsa — S:3, F:4, E:1, H:1
✅ examples/notification-toast.jsa — S:1, F:5, E:1, CSS
✅ examples/project-card.jsa — S:2, F:3, E:1, CSS
✅ examples/stats-panel.jsa — S:2, F:4, E:3, CSS
✅ examples/store.jsa — S:2, F:2, E:1
✅ examples/task-list.jsa — S:3, F:4, E:2, CSS

13/13 files valid
```

---

## 📈 LOC Summary

| Category | Files | Total Lines |
|----------|-------|-------------|
| Components | 5 | 315 |
| Composables | 1 | 30 |
| Other Examples | 7 | 350 |
| **Total** | **13** | **695** |

All files under 200 LOC (well under 500 limit).

---

MIT License
