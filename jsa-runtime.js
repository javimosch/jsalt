/**
 * JSA Runtime v2 - Component-based framework
 */

export class JSA {
  constructor(container = document.body) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    this.state = {};
    this.refs = {};
    this.template = '';
  }

  render(template) {
    if (!this.container) return;
    this.template = template;
    this.container.innerHTML = '';
    const lines = template.split('\n').filter(l => l.trim() && !l.trim().startsWith('//'));
    const parsed = this.parse(lines, 0);
    this.state = parsed.state;
    this.refs = {};
    this.build(parsed.nodes, this.container);
  }

  update() {
    // Re-render preserving current state
    const oldState = { ...this.state };
    const lines = this.template.split('\n').filter(l => l.trim() && !l.trim().startsWith('//'));
    const parsed = this.parse(lines, 0);
    // Merge old state with parsed state (old state takes precedence)
    this.state = { ...parsed.state, ...oldState };
    this.container.innerHTML = '';
    this.refs = {};
    this.build(parsed.nodes, this.container);
  }

  parse(lines, startIndent) {
    const nodes = [];
    const state = {};
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const indent = line.search(/\S/);

      if (indent < startIndent) break;
      if (indent === startIndent) {
        const trimmed = line.trim();

        if (trimmed.startsWith('let ')) {
          const match = trimmed.match(/let\s+(\w+)\s*=\s*(.+)/);
          if (match) {
            state[match[1]] = this.parseValue(match[2]);
            i++;
            continue;
          }
        }

        const node = this.parseElement(line);
        if (node) {
          nodes.push(node);
          if (i + 1 < lines.length) {
            const nextIndent = lines[i + 1].search(/\S/);
            if (nextIndent > indent) {
              const childResult = this.parse(lines.slice(i + 1), nextIndent);
              node.children = childResult.nodes;
              let childCount = 0;
              let j = i + 1;
              while (j < lines.length) {
                const ind = lines[j].search(/\S/);
                if (ind <= indent) break;
                childCount++;
                j++;
              }
              i += childCount + 1;
              continue;
            }
          }
        }
      }
      i++;
    }

    return { nodes, state };
  }

  parseElement(line) {
    const trimmed = line.trim();
    const node = {
      type: 'element', tag: 'div', id: null, classes: [],
      styles: {}, events: {}, content: null, children: [], ref: null
    };

    let rest = trimmed;

    const refMatch = rest.match(/^\$([a-zA-Z0-9_-]+)/);
    if (refMatch) { node.ref = refMatch[1]; rest = rest.slice(refMatch[0].length).trim(); }

    const tagMatch = rest.match(/^([a-z]+)?(?:#([a-zA-Z0-9_-]+))?(?:\.([a-zA-Z0-9_.-]+))?/);
    if (tagMatch) {
      if (tagMatch[1]) node.tag = tagMatch[1];
      if (tagMatch[2]) node.id = tagMatch[2];
      if (tagMatch[3]) node.classes = tagMatch[3].split('.');
      rest = rest.slice(tagMatch[0].length).trim();
    }

    const styleMatch = rest.match(/^\{([^}]+)\}/);
    if (styleMatch) {
      node.styles = this.parseStyles(styleMatch[1]);
      rest = rest.slice(styleMatch[0].length).trim();
    }

    const eventRegex = /@(\w+)\s*=\s*"([^"]+)"/g;
    let eventMatch;
    while ((eventMatch = eventRegex.exec(rest)) !== null) {
      node.events[eventMatch[1]] = eventMatch[2];
    }
    rest = rest.replace(/@\w+\s*=\s*"[^"]+"/g, '').trim();

    const contentMatch = rest.match(/^=\s*"([^"]+)"/);
    if (contentMatch) { node.content = contentMatch[1]; }

    return node;
  }

  parseStyles(content) {
    const styles = {};
    content.split(';').forEach(pair => {
      const [key, val] = pair.split(':').map(s => s.trim());
      if (key && val) styles[key.replace(/-([a-z])/g, (m, c) => c.toUpperCase())] = val;
    });
    return styles;
  }

  parseValue(val) {
    val = val.trim();
    if (val.startsWith('"') || val.startsWith("'")) return val.slice(1, -1);
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (!isNaN(val) && val !== '') return Number(val);
    return val;
  }

  build(nodes, parent) {
    nodes.forEach(node => this.buildNode(node, parent));
  }

  buildNode(node, parent) {
    if (!node) return;
    const el = document.createElement(node.tag);
    if (node.id) el.id = node.id;
    node.classes.forEach(c => el.classList.add(c));
    Object.assign(el.style, node.styles);
    if (node.ref) this.refs[node.ref] = el;
    if (node.content) el.textContent = this.interpolate(node.content);
    for (const [event, handler] of Object.entries(node.events)) {
      el.addEventListener(event, (e) => this.execHandler(handler, e, el));
    }
    if (node.children) this.build(node.children, el);
    parent.appendChild(el);
  }

  interpolate(str) {
    return str.replace(/\$\{(\w+)\}/g, (_, name) => this.state[name] ?? '');
  }

  execHandler(code, event, el) {
    const ctx = { state: this.state, refs: this.refs, el, e: event, app: this };
    try {
      const fn = new Function('ctx', `
        const { state, refs, el, e, app } = ctx;
        const setState = (k, v) => { state[k] = v; app.update(); };
        const get = (k) => state[k];
        ${code}
      `);
      fn(ctx);
    } catch (err) {
      console.error('JSA handler error:', err);
    }
  }
}

export function mount(container, template) {
  const app = new JSA(container);
  app.render(template);
  return app;
}

export async function load(url, container) {
  if (container && container.tagName === 'BUTTON') container = '#app';
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return;
  try {
    const template = await fetch(url).then(r => r.text());
    const app = new JSA(el);
    app.render(template);
    return app;
  } catch (err) {
    console.error('JSA: Failed to load', url, err);
  }
}
