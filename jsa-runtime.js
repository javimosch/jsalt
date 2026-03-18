/**
 * JSA Runtime v7 - AI-First Reactive SPA Framework
 * Signals · VirtualDOM · Hash Routing · Scoped CSS · Transitions
 * Non-human first: minimal tokens, predictable syntax, error codes
 */

export class JSA {
  constructor(container = document.body) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.refs = {}; this.state = {}; this.fns = {}; this.template = '';
    this.computedDefs = {}; this.watchers = {}; this.hooks = { mount: [], destroy: [] };
    this._scopeId = null; this._styleEl = null;
    this._updatePending = false; this._preUpdateState = null;
    this._transitioned = new WeakSet();
    this._initRouting();
  }

  _initRouting() {
    if (typeof window === 'undefined') return;
    this.state.route = window.location.hash || '#/';
    window.addEventListener('hashchange', () => this.setState('route', window.location.hash || '#/'));
  }

  render(template) {
    if (!this.container) return;
    this._runHooks('destroy'); this._removeStyles();
    const curRoute = this.state.route;
    this.template = template;
    this.container.innerHTML = '';
    this.refs = {}; this.state = { route: curRoute };
    this.fns = {}; this.computedDefs = {}; this.watchers = {};
    this.hooks = { mount: [], destroy: [] };
    this._scopeId = null; this._transitioned = new WeakSet();
    const { nodes, defs, meta } = this._parseTemplate(template);
    this._applyDefs(defs, meta, false);
    this.recompute();
    this.build(nodes, this.container, {});
    setTimeout(() => this._runHooks('mount'), 0);
  }

  _parseTemplate(t) {
    const lines = t.split('\n').filter(l => l.trim() && !l.trim().startsWith('//'));
    return this.parse(lines, 0);
  }

  _applyDefs(defs, meta, preserve) {
    for (const [k, v] of Object.entries(defs)) {
      if (v._type === 'state') this.state[k] = preserve && this.state[k] !== undefined ? this.state[k] : v._val;
      else if (v._type === 'computed') this.computedDefs[k] = v._expr;
      else if (v._type === 'fn') this.fns[k] = v._code;
    }
    if (!preserve) {
      for (const [k, c] of Object.entries(meta.watchers)) this.watchers[k] = c;
      for (const h of meta.hooks) this.hooks[h.phase].push(h.code);
    }
    if (meta.style && !this._scopeId) {
      this._scopeId = 'j' + Math.random().toString(36).slice(2, 6);
      this.container.setAttribute('data-jsa-' + this._scopeId, '');
      this._injectStyles(meta.style);
    }
  }

  setState(key, val) {
    if (!this._updatePending) this._preUpdateState = { ...this.state };
    this.state[key] = val;
    this._scheduleUpdate();
  }

  getState(key) { return this.state[key]; }

  destroy() {
    this._runHooks('destroy'); this._removeStyles();
    if (this.container) this.container.innerHTML = '';
  }

  recompute() {
    for (const [k, e] of Object.entries(this.computedDefs)) {
      try { this.state[k] = new Function('s', 'getState', 'setState', `with(s){return ${e}}`)(this.state, k => this.state[k], (k, v) => this.setState(k, v)); } catch (_) {}
    }
  }

  update() { this._rebuild(); }

  _scheduleUpdate() {
    if (this._updatePending) return;
    this._updatePending = true;
    queueMicrotask(() => {
      this._updatePending = false;
      const old = this._preUpdateState || {};
      this._preUpdateState = null;
      this.recompute(); this._rebuild();
      for (const [k, code] of Object.entries(this.watchers)) {
        if (JSON.stringify(this.state[k]) !== JSON.stringify(old[k]))
          this.execHandler(code, null, this.container, {});
      }
    });
  }

  _rebuild() {
    if (!this.template) return;
    const { nodes, defs, meta } = this._parseTemplate(this.template);
    for (const [k, v] of Object.entries(defs)) {
      if (v._type === 'state') this.state[k] = this.state[k] !== undefined ? this.state[k] : v._val;
      else if (v._type === 'computed') this.computedDefs[k] = v._expr;
      else if (v._type === 'fn') this.fns[k] = v._code;
    }
    this.recompute();
    const off = document.createElement('div');
    if (this._scopeId) off.setAttribute('data-jsa-' + this._scopeId, '');
    this.refs = {};
    this.build(nodes, off, {});
    this._patch(this.container, off);
  }

  _patch(o, n) {
    const oc = Array.from(o.childNodes), nc = Array.from(n.childNodes);
    for (let i = 0; i < Math.max(oc.length, nc.length); i++) {
      const a = oc[i], b = nc[i];
      if (!a) { o.appendChild(b); this._triggerTransition(b); }
      else if (!b) { o.removeChild(a); }
      else if (a.nodeType === Node.TEXT_NODE && b.nodeType === Node.TEXT_NODE) {
        if (a.textContent !== b.textContent) a.textContent = b.textContent;
      } else if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) {
        o.replaceChild(b, a); this._triggerTransition(b);
      } else {
        if (a.id !== b.id) a.id = b.id;
        const bc = b.getAttribute('class');
        if (a.getAttribute('class') !== bc) bc !== null ? a.setAttribute('class', bc) : a.removeAttribute('class');
        if (a.attributes && b.attributes) {
          for (let j = a.attributes.length - 1; j >= 0; j--) { const nm = a.attributes[j].name; if (nm !== 'class' && !b.hasAttribute(nm)) a.removeAttribute(nm); }
          for (let j = 0; j < b.attributes.length; j++) { const { name: nm, value: v } = b.attributes[j]; if (nm !== 'class' && a.getAttribute(nm) !== v) a.setAttribute(nm, v); }
        }
        if (a.style?.cssText !== b.style?.cssText) a.style.cssText = b.style?.cssText || '';
        if ('value' in a && a.value !== b.value) a.value = b.value;
        if ('checked' in a && a.checked !== b.checked) a.checked = b.checked;
        a._jsaCtx = b._jsaCtx; a._jsaNode = b._jsaNode;
        for (const [k, r] of Object.entries(this.refs)) if (r === b) this.refs[k] = a;
        this._patch(a, b);
      }
    }
  }

  _triggerTransition(el) {
    if (el.nodeType !== Node.ELEMENT_NODE) return;
    const n = el._jsaNode;
    if (!n?.transition || this._transitioned.has(el)) return;
    const nm = n.transition;
    this._transitioned.add(el);
    el.classList.add(`${nm}-enter-from`, `${nm}-enter-active`);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.classList.remove(`${nm}-enter-from`); el.classList.add(`${nm}-enter-to`);
      const done = () => { el.classList.remove(`${nm}-enter-active`, `${nm}-enter-to`); el.removeEventListener('transitionend', done); };
      el.addEventListener('transitionend', done); setTimeout(done, 1000);
    }));
  }

  _runHooks(phase) { for (const c of this.hooks[phase] || []) this.execHandler(c, null, this.container, {}); }
  _injectStyles(css) { this._styleEl = document.createElement('style'); this._styleEl.textContent = this._scopeCSS(css); document.head.appendChild(this._styleEl); }
  _removeStyles() {
    if (this._styleEl) { this._styleEl.remove(); this._styleEl = null; }
    if (this._scopeId && this.container) this.container.removeAttribute('data-jsa-' + this._scopeId);
  }

  _scopeCSS(css) {
    if (!this._scopeId) return css;
    const attr = `[data-jsa-${this._scopeId}]`;
    return css.replace(/([^{}]+)\{/g, (m, sel) => {
      const s = sel.trim();
      if (!s || s.startsWith('@') || /^\d/.test(s) || s === 'from' || s === 'to') return m;
      return s.split(',').map(p => `${attr} ${p.trim()}`).join(', ') + ' {';
    });
  }

  parse(lines, startIndent) {
    const nodes = [], defs = {}, meta = { watchers: {}, hooks: [], style: '' };
    let i = 0, m;
    while (i < lines.length) {
      const line = lines[i], indent = line.search(/\S/);
      if (indent < startIndent) break;
      if (indent === startIndent) {
        const t = line.trim();
        if (t.startsWith('let ') && (m = t.match(/let\s+(\w+)\s*=\s*(.+)/)))
          { defs[m[1]] = { _type: 'state', _val: this.parseValue(m[2]) }; i++; continue; }
        if (t.startsWith('const ') && t.includes('computed')) {
          if ((m = t.match(/const\s+(\w+)\s*=\s*computed\s*\(\s*\(\s*\)\s*=>\s*(.+)\s*\)/)))
            { defs[m[1]] = { _type: 'computed', _expr: m[2] }; i++; continue; }
          if ((m = t.match(/const\s+(\w+)\s*=\s*computed\s*\(\s*\(\s*\)\s*=>\s*\{/))) {
            let expr = '', j = i + 1, depth = 1;
            while (j < lines.length && depth > 0) {
              const l = lines[j];
              if (l.includes('{')) depth++; if (l.includes('}')) depth--;
              expr += (depth > 0 ? l.trim() : l.split('}')[0].trim()) + ' '; j++;
            }
            defs[m[1]] = { _type: 'computed', _expr: `(() => { ${expr.trim()} })()` }; i = j; continue;
          }
        }
        if (t.startsWith('fn ') && (m = t.match(/fn\s+(\w+)\s*=\s*"([^"]+)"/)))
          { defs[m[1]] = { _type: 'fn', _code: m[2] }; i++; continue; }
        if (t.startsWith('watch ') && (m = t.match(/watch\s+(\w+)\s*=\s*"([^"]+)"/)))
          { meta.watchers[m[1]] = m[2]; i++; continue; }
        if (t.startsWith('on ') && (m = t.match(/on\s+(mount|destroy)\s*=\s*"([^"]+)"/)))
          { meta.hooks.push({ phase: m[1], code: m[2] }); i++; continue; }
        if (t === 'style' || t.startsWith('style ')) {
          if (t === 'style') { let css = '', j = i + 1; while (j < lines.length && lines[j].search(/\S/) > indent) { css += lines[j].trim() + ' '; j++; } meta.style += css.trim(); i = j; continue; }
          if ((m = t.match(/style\s*=\s*"(.+)"/))) { meta.style += m[1]; i++; continue; }
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
              i += c + 1; continue;
            }
          }
        }
      }
      i++;
    }
    return { nodes, defs, meta };
  }

  // Unwrap ${...} expression shorthand
  _expr(v) { return v.match(/^\$\{(.+)\}$/)?.[1] || v; }

  parseElement(t) {
    const n = { type: 'element', tag: 'div', id: null, classes: [], styles: {}, events: {}, attrs: {}, content: null, children: [], ref: null, each: null, if: null, show: null, bind: null, html: null, transition: null };
    let r = t, m;
    if ((m = r.match(/^\$([a-zA-Z0-9_-]+)/))) { n.ref = m[1]; r = r.slice(m[0].length).trim(); }
    if ((m = r.match(/^([a-z][a-z0-9]*)?(?:#([a-zA-Z0-9_-]+))?(?:\.([a-zA-Z0-9_.:-]+))?/))) {
      if (m[1]) n.tag = m[1]; if (m[2]) n.id = m[2]; if (m[3]) n.classes = m[3].split('.');
      r = r.slice(m[0].length).trim();
    }
    if ((m = r.match(/^\{([^}]+)\}/))) {
      m[1].split(';').forEach(p => { const ci = p.indexOf(':'); if (ci < 0) return; const k = p.slice(0, ci).trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v = p.slice(ci + 1).trim(); if (k && v) n.styles[k] = v; });
      r = r.slice(m[0].length).trim();
    }
    const atRe = /(?:^|\s+)([:a-zA-Z][\w-:]*)\s*=\s*"((?:[^"\\]|\\.)*)"/g;
    atRe.lastIndex = 0;
    while ((m = atRe.exec(r)) !== null) {
      const [, key, val] = m;
      if (key === 'if') n.if = this._expr(val);
      else if (key === 'show') n.show = this._expr(val);
      else if (key === 'each') n.each = this._expr(val);
      else if (key === 'transition') n.transition = val;
      else if (key === 'bind') n.bind = val;
      else if (key === 'html') n.html = this.parseValue('"' + val + '"');
      else if (key.startsWith(':')) n.attrs[key.slice(1)] = val;
      else n.attrs[key] = this.parseValue('"' + val + '"');
    }
    r = r.replace(/(?:^|\s+)([:a-zA-Z][\w-:]*)\s*=\s*"((?:[^"\\]|\\.)*)"/g, '').trim();
    const evRe = /(?:^|\s+)@(\w+(?:\.\w+)*)\s*=\s*"((?:[^"\\]|\\.)*)"/g;
    evRe.lastIndex = 0;
    while ((m = evRe.exec(r)) !== null) n.events[m[1]] = this._expr(m[2]);
    r = r.replace(/(?:^|\s+)@\w+(?:\.\w+)*\s*=\s*"((?:[^"\\]|\\.)*)"/g, '').trim();
    if ((m = r.match(/=\s*"((?:[^"\\]|\\.)*)"/))) {
      n.content = this.parseValue('"' + m[1] + '"'); r = r.replace(m[0], '').trim();
    } else if (r.length > 0 && !r.includes('@') && !r.includes('=')) n.content = r;
    return n;
  }

  parseValue(v) {
    v = v.trim();
    if (v.startsWith('"') || v.startsWith("'")) {
      return v.slice(1, -1)
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t')
        .replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\$/g, '$').replace(/\\\\/g, '\\');
    }
    if (v === 'true') return true; if (v === 'false') return false; if (v === 'null') return null;
    if (!isNaN(v) && v !== '') return Number(v);
    try { return JSON.parse(v); } catch (_) {}
    try { return new Function(`return ${v}`)(); } catch (_) {}
    return v;
  }

  build(nodes, parent, ctx) { nodes.forEach(n => this.buildNode(n, parent, ctx)); }

  buildNode(n, parent, ctx) {
    if (!n) return;
    if (n.if !== null && !this.evaluate(n.if, ctx)) return;
    if (n.each) {
      const arr = this.evaluate(n.each, ctx);
      if (Array.isArray(arr) && arr.length > 0) arr.forEach((item, idx) => this.buildInstance(n, parent, { ...ctx, item, idx }));
      return;
    }
    this.buildInstance(n, parent, ctx);
  }

  evaluate(expr, ctx) {
    try { return new Function('scope', `with(scope){return ${expr}}`)({ ...this.state, ...ctx }); } catch (_) { return undefined; }
  }

  _resolveAttr(val, ctx) {
    const m = val.match(/^\$\{(.+)\}$/);
    return m ? this.evaluate(m[1], ctx) : this.interpolate(val, ctx);
  }

  buildInstance(n, parent, ctx) {
    const el = document.createElement(n.tag);
    el._jsaCtx = ctx; el._jsaNode = n;
    if (n.id) el.id = n.id;
    n.classes.forEach(c => el.classList.add(c));
    Object.assign(el.style, n.styles);
    if (this._scopeId) el.setAttribute('data-jsa-' + this._scopeId, '');
    if (n.attrs.class) {
      const r = this._resolveAttr(n.attrs.class, ctx);
      if (r) String(r).split(/\s+/).forEach(c => { if (c && c !== 'undefined' && c !== 'null' && c !== 'false') el.classList.add(c); });
    }
    if (n.attrs.style) {
      const r = this._resolveAttr(n.attrs.style, ctx);
      if (r) String(r).split(';').forEach(p => { const ci = p.indexOf(':'); if (ci < 0) return; el.style[p.slice(0,ci).trim().replace(/-([a-z])/g,(_,c)=>c.toUpperCase())] = p.slice(ci+1).trim(); });
    }
    if (n.show !== null && !this.evaluate(n.show, ctx)) el.style.display = 'none';
    if (n.ref) this.refs[n.ref] = el;
    const BOOL = new Set(['disabled','checked','hidden','readonly','required','selected','multiple','autofocus']);
    for (const [attr, val] of Object.entries(n.attrs)) {
      if (attr === 'class' || attr === 'style') continue;
      const r = this._resolveAttr(val, ctx);
      if (BOOL.has(attr)) { if (r) el.setAttribute(attr, ''); }
      else if (r !== null && r !== undefined && r !== false) el.setAttribute(attr, String(r));
    }
    if (n.bind) {
      const key = n.bind, isC = el.type === 'checkbox' || el.type === 'radio';
      isC ? el.checked = !!this.state[key] : el.value = this.state[key] ?? '';
      el.dataset.jsaBind = key;
      el.addEventListener(isC || n.tag === 'select' ? 'change' : 'input', () => this.setState(key, isC ? el.checked : el.value));
    }
    if (n.html !== null) el.innerHTML = this.interpolate(n.html, ctx);
    else if (n.content !== null) el.textContent = this.interpolate(n.content, ctx);
    const KEYS = { enter:'Enter', esc:'Escape', tab:'Tab', space:' ', delete:'Delete', up:'ArrowUp', down:'ArrowDown', left:'ArrowLeft', right:'ArrowRight' };
    for (const [evName, h] of Object.entries(n.events)) {
      const lCtx = { ...ctx }, pts = evName.split('.'), ev = pts[0], mods = new Set(pts.slice(1));
      el.addEventListener(ev, e => {
        if (mods.has('prevent')) e.preventDefault();
        if (mods.has('stop')) e.stopPropagation();
        if (mods.has('self') && e.target !== el) return;
        for (const [mk, key] of Object.entries(KEYS)) if (mods.has(mk) && e.key !== key) return;
        this.execHandler(h, e, el, el._jsaCtx || lCtx);
      }, { once: mods.has('once') });
    }
    if (n.children) this.build(n.children, el, ctx);
    parent.appendChild(el);
  }

  decodeUnicode(s) {
    return s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
  }

  interpolate(s, ctx) {
    return s.replace(/\$\{([^}]+)\}/g, (_, expr) => {
      try {
        const scope = { ...this.state, ...ctx };
        for (const [k, e] of Object.entries(this.computedDefs)) { try { scope[k] = new Function('s', `with(s){return ${e}}`)(scope); } catch (_) {} }
        const r = new Function('s', `with(s){return ${expr}}`)(scope);
        return r !== undefined && r !== null ? this.decodeUnicode(String(r)) : '';
      } catch (_) { return ''; }
    });
  }

  execHandler(code, e, el, ctx) {
    try {
      const fns = Object.entries(this.fns).map(([nm, b]) => `function ${nm}() { ${b} }`).join('\n');
      new Function('state','refs','el','e','setState','getState','update','item','idx',
        `${fns}\nwith(state){(function(){${code}})();}`)
        (this.state, this.refs, el, e, (k,v) => this.setState(k,v), k => this.state[k], () => this.update(), ctx?.item, ctx?.idx);
    } catch (err) { console.error(`JSA E001: handler — ${err.message}`, { code }); }
  }
}

export function mount(container, template) { const a = new JSA(container); a.render(template); return a; }

export async function load(url, container) {
  if (container?.tagName === 'BUTTON') container = '#app';
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return;
  try { const t = await fetch(url).then(r => r.text()); const a = new JSA(el); a.render(t); return a; }
  catch (err) { console.error('JSA: Failed to load', url, err); }
}
