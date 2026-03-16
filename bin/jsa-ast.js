#!/usr/bin/env node
/**
 * JSA AST CLI v5 - Parse and validate .jsa files
 * Usage: jsa-ast <file.jsa> [--json] [--tree] [--quiet]
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

class JSAParser {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  parse(template) {
    this.errors = [];
    this.warnings = [];

    if (!template || typeof template !== 'string') {
      this.errors.push({ line: 0, message: 'Empty or invalid template' });
      return { ast: null, errors: this.errors, warnings: this.warnings };
    }

    const lines = template.split('\n');
    const ast = {
      type: 'program',
      source: template.substring(0, 100) + (template.length > 100 ? '...' : ''),
      state: [],
      functions: [],
      watchers: [],
      hooks: [],
      style: null,
      elements: [],
      refs: []
    };

    const parsed = this.parseLines(lines, 0);
    ast.state = parsed.state;
    ast.functions = parsed.fns;
    ast.watchers = parsed.watchers;
    ast.hooks = parsed.hooks;
    ast.style = parsed.style || null;
    ast.elements = parsed.nodes;
    ast.refs = this.collectRefs(parsed.nodes);

    this.validate(ast);
    return { ast, errors: this.errors, warnings: this.warnings };
  }

  parseLines(lines, startIndent) {
    const nodes = [], state = [], fns = [], watchers = [], hooks = [];
    let style = '';
    let i = 0;

    while (i < lines.length) {
      const line = lines[i], indent = line.search(/\S/);
      if (indent < 0) { i++; continue; }
      if (indent < startIndent) break;

      if (indent === startIndent) {
        const t = line.trim();
        if (t.startsWith('//')) { i++; continue; }

        // let name = value
        if (t.startsWith('let ')) {
          const m = t.match(/let\s+(\w+)\s*=\s*(.+)/);
          if (m) {
            state.push({ type: 'state', name: m[1], value: m[2], line: i + 1 });
          } else {
            this.errors.push({ line: i + 1, message: 'Invalid let syntax: ' + t });
          }
          i++; continue;
        }

        // const name = computed(() => expr)
        if (t.startsWith('const ') && t.includes('computed')) {
          const m = t.match(/const\s+(\w+)\s*=\s*computed\s*\(\s*\(\s*\)\s*=>\s*(.+)\s*\)/);
          if (m) {
            state.push({ type: 'computed', name: m[1], expression: m[2], line: i + 1 });
          } else {
            this.warnings.push({ line: i + 1, message: 'Computed syntax may be incorrect' });
          }
          i++; continue;
        }

        // fn name = "code"
        if (t.startsWith('fn ')) {
          const m = t.match(/fn\s+(\w+)\s*=\s*"([^"]+)"/);
          if (m) {
            fns.push({ type: 'function', name: m[1], handler: m[2], line: i + 1 });
          } else {
            this.errors.push({ line: i + 1, message: 'Invalid fn syntax: ' + t });
          }
          i++; continue;
        }

        // watch key = "code"
        if (t.startsWith('watch ')) {
          const m = t.match(/watch\s+(\w+)\s*=\s*"([^"]+)"/);
          if (m) {
            watchers.push({ type: 'watcher', key: m[1], handler: m[2], line: i + 1 });
          } else {
            this.errors.push({ line: i + 1, message: 'Invalid watch syntax: ' + t });
          }
          i++; continue;
        }

        // on mount|destroy = "code"
        if (t.startsWith('on ')) {
          const m = t.match(/on\s+(mount|destroy)\s*=\s*"([^"]+)"/);
          if (m) {
            hooks.push({ type: 'hook', phase: m[1], handler: m[2], line: i + 1 });
          } else {
            const bad = t.match(/on\s+(\w+)/);
            if (bad && bad[1] !== 'mount' && bad[1] !== 'destroy') {
              this.errors.push({ line: i + 1, message: `Invalid lifecycle phase "${bad[1]}". Use "mount" or "destroy"` });
            } else {
              this.errors.push({ line: i + 1, message: 'Invalid on syntax: ' + t });
            }
          }
          i++; continue;
        }

        // style = "css" or style (indented block)
        if (t === 'style' || t.startsWith('style ')) {
          if (t === 'style') {
            let css = '', j = i + 1;
            while (j < lines.length) {
              const ni = lines[j].search(/\S/);
              if (ni < 0) { j++; continue; }
              if (ni <= indent) break;
              css += lines[j].trim() + ' ';
              j++;
            }
            style += css.trim();
            i = j; continue;
          }
          const m = t.match(/style\s*=\s*"(.+)"/);
          if (m) { style += m[1]; i++; continue; }
        }

        // Element
        const elem = this.parseElement(t, i + 1);
        if (elem) {
          nodes.push(elem);
          if (i + 1 < lines.length) {
            const ni = lines[i + 1].search(/\S/);
            if (ni > indent) {
              const ch = this.parseLines(lines.slice(i + 1), ni);
              elem.children = ch.nodes;
              let c = 0, j = i + 1;
              while (j < lines.length) {
                const ind = lines[j].search(/\S/);
                if (ind >= 0 && ind <= indent) break;
                c++; j++;
              }
              i += c + 1;
              continue;
            }
          }
        }
      }
      i++;
    }

    return { nodes, state, fns, watchers, hooks, style: style || null };
  }

  parseElement(t, lineNum) {
    const elem = {
      type: 'element', tag: 'div', id: null, classes: [], styles: {},
      events: {}, attrs: {}, content: null, ref: null,
      each: null, if: null, show: null, bind: null,
      line: lineNum, children: []
    };

    let r = t;

    // $ref
    const rm = r.match(/^\$([a-zA-Z0-9_-]+)/);
    if (rm) { elem.ref = rm[1]; r = r.slice(rm[0].length).trim(); }

    // tag#id.class (supports h1, h2, p, br, etc.)
    const tm = r.match(/^([a-z][a-z0-9]*)?(?:#([a-zA-Z0-9_-]+))?(?:\.([a-zA-Z0-9_.-]+))?/);
    if (tm) {
      if (tm[1]) elem.tag = tm[1];
      if (tm[2]) elem.id = tm[2];
      if (tm[3]) elem.classes = tm[3].split('.');
      r = r.slice(tm[0].length).trim();
    }

    // { inline styles }
    const sm = r.match(/^\{([^}]+)\}/);
    if (sm) {
      sm[1].split(';').forEach(p => {
        const parts = p.split(':');
        const k = parts[0].trim();
        const v = parts.slice(1).join(':').trim();
        if (k && v) elem.styles[k] = v;
      });
      r = r.slice(sm[0].length).trim();
    }

    // if = "${expr}"
    const ifM = r.match(/\bif\s*=\s*"\$\{([^}]+)\}"/);
    if (ifM) { elem.if = ifM[1]; r = r.replace(ifM[0], '').trim(); }

    // show = "${expr}"
    const showM = r.match(/\bshow\s*=\s*"\$\{([^}]+)\}"/);
    if (showM) { elem.show = showM[1]; r = r.replace(showM[0], '').trim(); }

    // each = "${expr}"
    const eachM = r.match(/\beach\s*=\s*"\$\{([^}]+)\}"/);
    if (eachM) { elem.each = eachM[1]; r = r.replace(eachM[0], '').trim(); }

    // bind = "stateKey"
    const bindM = r.match(/\bbind\s*=\s*"(\w+)"/);
    if (bindM) { elem.bind = bindM[1]; r = r.replace(bindM[0], '').trim(); }

    // :attr = "value"
    const attrRe = /:([a-zA-Z][\w-]*)\s*=\s*"([^"]+)"/g;
    let am;
    while ((am = attrRe.exec(r)) !== null) elem.attrs[am[1]] = am[2];
    r = r.replace(/:[\w-]+\s*=\s*"[^"]+"/g, '').trim();

    // @event = "handler"
    const er = /@(\w+)\s*=\s*"([^"]+)"/g;
    let em;
    while ((em = er.exec(r)) !== null) elem.events[em[1]] = em[2];
    r = r.replace(/@\w+\s*=\s*"[^"]+"/g, '').trim();

    // = "content"
    const cm = r.match(/^=\s*"([^"]*)"/);
    if (cm) elem.content = cm[1];

    return elem;
  }

  collectRefs(nodes) {
    const refs = [];
    const walk = (list) => {
      for (const n of list) {
        if (n.ref) refs.push(n.ref);
        if (n.children) walk(n.children);
      }
    };
    walk(nodes);
    return refs;
  }

  validate(ast) {
    if (ast.elements.length === 0 && ast.state.length === 0 && ast.functions.length === 0) {
      this.warnings.push({ line: 0, message: 'No state, functions, or elements found' });
    }

    const stateNames = new Set();
    for (const s of ast.state) {
      if (stateNames.has(s.name)) {
        this.errors.push({ line: s.line, message: `Duplicate state variable: ${s.name}` });
      }
      stateNames.add(s.name);
    }

    const fnNames = new Set();
    for (const f of ast.functions) {
      if (fnNames.has(f.name)) {
        this.errors.push({ line: f.line, message: `Duplicate function: ${f.name}` });
      }
      fnNames.add(f.name);
    }

    const watchKeys = new Set();
    for (const w of ast.watchers) {
      if (watchKeys.has(w.key)) {
        this.warnings.push({ line: w.line, message: `Duplicate watcher for key "${w.key}"` });
      }
      watchKeys.add(w.key);
      if (!stateNames.has(w.key)) {
        this.warnings.push({ line: w.line, message: `Watcher key "${w.key}" not found in state` });
      }
    }

    const walkElements = (nodes) => {
      for (const el of nodes) {
        if (el.bind && !stateNames.has(el.bind)) {
          this.warnings.push({ line: el.line, message: `Bind key "${el.bind}" not found in state` });
        }
        if (el.children) walkElements(el.children);
      }
    };
    walkElements(ast.elements);
  }
}

// CLI
const args = process.argv.slice(2);
const flags = {
  json: args.includes('--json'),
  tree: args.includes('--tree'),
  quiet: args.includes('--quiet'),
  help: args.includes('--help') || args.includes('-h')
};

const files = args.filter(a => !a.startsWith('--'));

if (flags.help || files.length === 0) {
  console.log(`
JSA AST Parser v5 - Validate .jsa syntax

Usage: jsa-ast <file.jsa> [options]

Options:
  --json    Output AST as JSON
  --tree    Output formatted AST tree
  --quiet   Only show errors (no success message)
  --help    Show this help

Examples:
  jsa-ast counter.jsa
  jsa-ast counter.jsa --json
  jsa-ast counter.jsa --tree
  jsa-ast *.jsa
`);
  process.exit(flags.help ? 0 : 1);
}

let totalErrors = 0, totalFiles = 0, validFiles = 0;

for (const filePath of files) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const parser = new JSAParser();
    const result = parser.parse(content);
    totalFiles++;

    if (flags.json && files.length === 1) {
      console.log(JSON.stringify(result, null, 2));
    } else if (flags.tree && files.length === 1) {
      printTree(result.ast);
    }

    if (result.errors.length > 0) {
      console.error(`\n❌ ${filePath}:`);
      result.errors.forEach(e => console.error(`  Line ${e.line}: ${e.message}`));
      totalErrors += result.errors.length;
    } else {
      validFiles++;
      if (!flags.quiet) {
        const parts = [
          `S:${result.ast.state.length}`,
          `F:${result.ast.functions.length}`,
          `E:${result.ast.elements.length}`
        ];
        if (result.ast.watchers.length) parts.push(`W:${result.ast.watchers.length}`);
        if (result.ast.hooks.length) parts.push(`H:${result.ast.hooks.length}`);
        if (result.ast.style) parts.push('CSS');
        if (result.ast.refs.length) parts.push(`R:${result.ast.refs.length}`);

        if (files.length === 1) {
          console.log(`\n✅ ${filePath} is valid JSA v5 syntax`);
          console.log(`   ${parts.join(', ')}`);
        } else {
          console.log(`✅ ${filePath} — ${parts.join(', ')}`);
        }
      }
    }

    if (result.warnings.length > 0 && !flags.quiet) {
      result.warnings.forEach(w => console.error(`  ⚠️  Line ${w.line}: ${w.message}`));
    }
  } catch (err) {
    console.error(`❌ Error reading ${filePath}: ${err.message}`);
    totalErrors++;
  }
}

if (files.length > 1 && !flags.quiet) {
  console.log(`\n${validFiles}/${totalFiles} files valid`);
}

process.exit(totalErrors > 0 ? 1 : 0);

function printTree(obj, indent = 0) {
  const pre = '  '.repeat(indent);
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => { console.log(`${pre}[${i}]`); printTree(item, indent + 1); });
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;
      if (Array.isArray(value) && value.length === 0) continue;
      if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) continue;
      if (key === 'children' || key === 'elements' || key === 'state' || key === 'functions' ||
          key === 'watchers' || key === 'hooks') {
        if (Array.isArray(value) && value.length > 0) {
          console.log(`${pre}${key}:`);
          printTree(value, indent + 1);
        }
      } else if (typeof value !== 'object') {
        console.log(`${pre}${key}: ${value}`);
      } else {
        console.log(`${pre}${key}:`);
        printTree(value, indent + 1);
      }
    }
  }
}
