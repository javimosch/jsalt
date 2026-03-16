/**
 * JSA Runtime v4 - Reactive with Loops
 */

export class JSA {
  constructor(container = document.body) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.refs = {};
    this.state = {};
    this.fns = {};
    this.template = '';
    this.computedDefs = {};
    this._updatePending = false;
  }

  render(template) {
    if (!this.container) return;
    this.template = template;
    this.container.innerHTML = '';
    this.refs = {};
    this.state = {};
    this.fns = {};
    this.computedDefs = {};

    const lines = template.split('\n').filter(l => l.trim() && !l.trim().startsWith('//'));
    const parsed = this.parse(lines, 0);

    for (const [k, v] of Object.entries(parsed.defs)) {
      if (v._type === 'state') this.state[k] = v._val;
      else if (v._type === 'computed') this.computedDefs[k] = v._expr;
      else if (v._type === 'fn') this.fns[k] = v._code;
    }

    this.recompute();
    this.build(parsed.nodes, this.container, {});
  }

  setState(key, val) {
    this.state[key] = val;
    this._scheduleUpdate();
  }

  getState(key) {
    return this.state[key];
  }

  recompute() {
    for (const [k, expr] of Object.entries(this.computedDefs)) {
      try { this.state[k] = new Function('state', `with(state){return ${expr}}`)(this.state); } catch (e) {}
    }
  }

  update() {
    this._rebuild();
  }

  _scheduleUpdate() {
    if (!this._updatePending) {
      this._updatePending = true;
      queueMicrotask(() => {
        this._updatePending = false;
        this.recompute();
        this._rebuild();
      });
    }
  }

  _rebuild() {
    if (!this.template) return;
    const oldState = { ...this.state };
    this.container.innerHTML = '';
    this.refs = {};

    const lines = this.template.split('\n').filter(l => l.trim() && !l.trim().startsWith('//'));
    const parsed = this.parse(lines, 0);

    for (const [k, v] of Object.entries(parsed.defs)) {
      if (v._type === 'state') {
        this.state[k] = oldState[k] !== undefined ? oldState[k] : v._val;
      } else if (v._type === 'computed') {
        this.computedDefs[k] = v._expr;
      } else if (v._type === 'fn') {
        this.fns[k] = v._code;
      }
    }

    this.recompute();
    this.build(parsed.nodes, this.container, {});
  }

  parse(lines, startIndent) {
    const nodes = [], defs = {};
    let i = 0;

    while (i < lines.length) {
      const line = lines[i], indent = line.search(/\S/);
      if (indent < startIndent) break;

      if (indent === startIndent) {
        const t = line.trim();

        if (t.startsWith('let ')) {
          const m = t.match(/let\s+(\w+)\s*=\s*(.+)/);
          if (m) { defs[m[1]] = { _type: 'state', _val: this.parseValue(m[2]) }; i++; continue; }
        }

        if (t.startsWith('const ') && t.includes('computed')) {
          const m = t.match(/const\s+(\w+)\s*=\s*computed\s*\(\s*\(\s*\)\s*=>\s*(.+)\s*\)/);
          if (m) { defs[m[1]] = { _type: 'computed', _expr: m[2] }; i++; continue; }
        }

        if (t.startsWith('fn ')) {
          const m = t.match(/fn\s+(\w+)\s*=\s*"([^"]+)"/);
          if (m) { defs[m[1]] = { _type: 'fn', _code: m[2] }; i++; continue; }
        }

        const node = this.parseElement(t);
        if (node) {
          nodes.push(node);
          if (i + 1 < lines.length) {
            const ni = lines[i + 1].search(/\S/);
            if (ni > indent) {
              const ch = this.parse(lines.slice(i + 1), ni);
              node.children = ch.nodes;
              let c = 0, j = i + 1;
              while (j < lines.length && lines[j].search(/\S/) > indent) { c++; j++; }
              i += c + 1;
              continue;
            }
          }
        }
      }
      i++;
    }
    return { nodes, defs };
  }

  parseElement(t) {
    const n = { type: 'element', tag: 'div', id: null, classes: [], styles: {}, events: {}, content: null, children: [], ref: null, each: null };
    let r = t;

    const rm = r.match(/^\$([a-zA-Z0-9_-]+)/);
    if (rm) { n.ref = rm[1]; r = r.slice(rm[0].length).trim(); }

    const tm = r.match(/^([a-z]+)?(?:#([a-zA-Z0-9_-]+))?(?:\.([a-zA-Z0-9_.-]+))?/);
    if (tm) {
      if (tm[1]) n.tag = tm[1];
      if (tm[2]) n.id = tm[2];
      if (tm[3]) n.classes = tm[3].split('.');
      r = r.slice(tm[0].length).trim();
    }

    const sm = r.match(/^\{([^}]+)\}/);
    if (sm) {
      sm[1].split(';').forEach(p => {
        const parts = p.split(':');
        const k = parts[0].trim();
        const v = parts.slice(1).join(':').trim();
        if (k && v) n.styles[k.replace(/-([a-z])/g, (m, c) => c.toUpperCase())] = v;
      });
      r = r.slice(sm[0].length).trim();
    }

    const eachMatch = r.match(/\beach\s*=\s*"\$\{([^}]+)\}"/);
    if (eachMatch) {
      n.each = eachMatch[1];
      r = r.replace(eachMatch[0], '').trim();
    }

    const er = /@(\w+)\s*=\s*"([^"]+)"/g;
    let em;
    while ((em = er.exec(r)) !== null) n.events[em[1]] = em[2];
    r = r.replace(/@\w+\s*=\s*"[^"]+"/g, '').trim();

    const cm = r.match(/^=\s*"([^"]*)"/);
    if (cm) n.content = cm[1];

    return n;
  }

  parseValue(v) {
    v = v.trim();
    if (v.startsWith('"') || v.startsWith("'")) return v.slice(1, -1);
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (v === 'null') return null;
    if (!isNaN(v) && v !== '') return Number(v);
    try { return JSON.parse(v); } catch (e) {}
    try { return new Function(`return ${v}`)(); } catch (e) {}
    return v;
  }

  build(nodes, parent, ctx) {
    nodes.forEach(n => this.buildNode(n, parent, ctx));
  }

  buildNode(n, parent, ctx) {
    if (!n) return;

    if (n.each) {
      const arr = this.evaluate(n.each, ctx);
      if (Array.isArray(arr)) {
        arr.forEach((item, idx) => {
          this.buildInstance(n, parent, { ...ctx, item, idx });
        });
      }
      return;
    }

    this.buildInstance(n, parent, ctx);
  }

  buildInstance(n, parent, ctx) {
    const el = document.createElement(n.tag);
    if (n.id) el.id = n.id;
    n.classes.forEach(c => el.classList.add(c));
    Object.assign(el.style, n.styles);
    if (n.ref) this.refs[n.ref] = el;
    if (n.content !== null) el.textContent = this.interpolate(n.content, ctx);

    for (const [ev, h] of Object.entries(n.events)) {
      const loopCtx = { ...ctx };
      el.addEventListener(ev, (e) => this.execHandler(h, e, el, loopCtx));
    }

    if (n.children) this.build(n.children, el, ctx);
    parent.appendChild(el);
  }

  evaluate(expr, ctx) {
    try {
      const scope = { ...this.state, ...ctx };
      return new Function('scope', `with(scope){return ${expr}}`)(scope);
    } catch (e) {
      return undefined;
    }
  }

  interpolate(s, ctx) {
    return s.replace(/\$\{([^}]+)\}/g, (_, expr) => {
      try {
        const scope = { ...this.state, ...ctx };
        for (const [k, e] of Object.entries(this.computedDefs)) {
          try { scope[k] = new Function('s', `with(s){return ${e}}`)(scope); } catch (ex) {}
        }
        const result = new Function('scope', `with(scope){return ${expr}}`)(scope);
        return result !== undefined && result !== null ? result : '';
      } catch (e) {
        return '';
      }
    });
  }

  execHandler(code, e, el, ctx) {
    try {
      const fnDefs = Object.entries(this.fns).map(([name, body]) =>
        `function ${name}() { ${body} }`
      ).join('\n');

      const fn = new Function('state', 'refs', 'el', 'e', 'setState', 'getState', 'update', 'item', 'idx', `
        ${fnDefs}
        with(state) { ${code} }
      `);
      fn(
        this.state, this.refs, el, e,
        (k, v) => this.setState(k, v),
        (k) => this.state[k],
        () => this.update(),
        ctx.item, ctx.idx
      );
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
