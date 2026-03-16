#!/usr/bin/env node
/**
 * JSA AST CLI - Parse and validate .jsa files
 * Usage: jsa-ast <file.jsa> [--json] [--tree] [--quiet]
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import JSA parser
const __dirname = dirname(fileURLToPath(import.meta.url));

// Minimal JSA parser for AST validation
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
      elements: [],
      refs: []
    };

    const parsed = this.parseLines(lines, 0);
    ast.state = parsed.state;
    ast.functions = parsed.fns;
    ast.elements = parsed.nodes;

    // Validate
    this.validate(ast);

    return { ast, errors: this.errors, warnings: this.warnings };
  }

  parseLines(lines, startIndent) {
    const nodes = [], state = [], fns = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i], indent = line.search(/\S/);
      if (indent < 0) { i++; continue; }
      if (indent < startIndent) break;

      if (indent === startIndent) {
        const t = line.trim();

        // Skip comments
        if (t.startsWith('//')) { i++; continue; }

        // Parse let declarations
        if (t.startsWith('let ')) {
          const m = t.match(/let\s+(\w+)\s*=\s*(.+)/);
          if (m) {
            state.push({ type: 'state', name: m[1], value: m[2], line: i + 1 });
          } else {
            this.errors.push({ line: i + 1, message: 'Invalid let syntax: ' + t });
          }
          i++;
          continue;
        }

        // Parse const computed
        if (t.startsWith('const ') && t.includes('computed')) {
          const m = t.match(/const\s+(\w+)\s*=\s*computed\s*\(\s*\(\s*\)\s*=>\s*(.+)\s*\)/);
          if (m) {
            state.push({ type: 'computed', name: m[1], expression: m[2], line: i + 1 });
          } else {
            this.warnings.push({ line: i + 1, message: 'Computed syntax may be incorrect' });
          }
          i++;
          continue;
        }

        // Parse fn declarations
        if (t.startsWith('fn ')) {
          const m = t.match(/fn\s+(\w+)\s*=\s*"([^"]+)"/);
          if (m) {
            fns.push({ type: 'function', name: m[1], handler: m[2], line: i + 1 });
          } else {
            this.errors.push({ line: i + 1, message: 'Invalid fn syntax: ' + t });
          }
          i++;
          continue;
        }

        // Parse element
        const elem = this.parseElement(t, i + 1);
        if (elem) {
          nodes.push(elem);
          
          // Check for children
          if (i + 1 < lines.length) {
            const ni = lines[i + 1].search(/\S/);
            if (ni > indent) {
              const ch = this.parseLines(lines.slice(i + 1), ni);
              elem.children = ch.nodes;
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

    return { nodes, state, fns };
  }

  parseElement(t, lineNum) {
    const elem = {
      type: 'element',
      tag: 'div',
      id: null,
      classes: [],
      styles: {},
      events: {},
      content: null,
      ref: null,
      line: lineNum
    };

    let r = t;

    // Extract ref
    const rm = r.match(/^\$([a-zA-Z0-9_-]+)/);
    if (rm) {
      elem.ref = rm[1];
      r = r.slice(rm[0].length).trim();
    }

    // Extract tag#id.classes
    const tm = r.match(/^([a-z]+)?(?:#([a-zA-Z0-9_-]+))?(?:\.([a-zA-Z0-9_.-]+))?/);
    if (tm) {
      if (tm[1]) elem.tag = tm[1];
      if (tm[2]) elem.id = tm[2];
      if (tm[3]) elem.classes = tm[3].split('.');
      r = r.slice(tm[0].length).trim();
    }

    // Extract styles
    const sm = r.match(/^\{([^}]+)\}/);
    if (sm) {
      sm[1].split(';').forEach(p => {
        const [k, v] = p.split(':').map(s => s.trim());
        if (k && v) elem.styles[k] = v;
      });
      r = r.slice(sm[0].length).trim();
    }

    // Extract events
    const er = /@(\w+)\s*=\s*"([^"]+)"/g;
    let em;
    while ((em = er.exec(r)) !== null) {
      elem.events[em[1]] = em[2];
    }
    r = r.replace(/@\w+\s*=\s*"[^"]+"/g, '').trim();

    // Extract content - handle both quoted and remaining text
    const cm = r.match(/^=\s*"([^"]+)"/);
    if (cm) {
      elem.content = cm[1];
    } else if (r.startsWith('=')) {
      // Handle = text without quotes
      elem.content = r.slice(1).trim();
    }

    return elem;
  }

  validate(ast) {
    // Check for required elements
    if (ast.elements.length === 0 && ast.state.length === 0 && ast.functions.length === 0) {
      this.warnings.push({ line: 0, message: 'No state, functions, or elements found' });
    }

    // Check for duplicate state names
    const stateNames = new Set();
    for (const s of ast.state) {
      if (stateNames.has(s.name)) {
        this.errors.push({ line: s.line, message: `Duplicate state variable: ${s.name}` });
      }
      stateNames.add(s.name);
    }

    // Check for duplicate function names
    const fnNames = new Set();
    for (const f of ast.functions) {
      if (fnNames.has(f.name)) {
        this.errors.push({ line: f.line, message: `Duplicate function: ${f.name}` });
      }
      fnNames.add(f.name);
    }

    // Check for common handler issues
    for (const s of ast.state) {
      if (s.type === 'state') {
        // Warn if state looks like it should be computed
        if (s.value.includes('computed')) {
          this.warnings.push({ line: s.line, message: `State "${s.name}" uses "computed" - consider using const ${s.name} = computed(...)` });
        }
      }
    }
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
JSA AST Parser - Validate .jsa syntax

Usage: jsa-ast <file.jsa> [options]

Options:
  --json    Output AST as JSON
  --tree    Output formatted AST tree
  --quiet   Only show errors (no success message)
  --help    Show this help

Examples:
  jsa-ast counter.jsa
  jsa-ast counter.jsa --json
  jsa-ast counter.jsa --tree --quiet
  jsa-ast *.jsa  # Validate multiple files
`);
  process.exit(flags.help ? 0 : 1);
}

// Process each file
let totalErrors = 0;
let totalFiles = 0;
let validFiles = 0;

for (const filePath of files) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const parser = new JSAParser();
    const result = parser.parse(content);
    totalFiles++;

    if (flags.json && files.length === 1) {
      console.log(JSON.stringify(result, null, 2));
    } else if (flags.tree && files.length === 1) {
      function printTree(obj, indent = 0) {
        const prefix = '  '.repeat(indent);
        if (Array.isArray(obj)) {
          obj.forEach((item, i) => {
            console.log(`${prefix}[${i}]`);
            printTree(item, indent + 1);
          });
        } else if (typeof obj === 'object' && obj !== null) {
          for (const [key, value] of Object.entries(obj)) {
            if (key === 'children' && Array.isArray(value)) {
              console.log(`${prefix}${key}:`);
              printTree(value, indent + 1);
            } else if (typeof value !== 'object' || value === null) {
              console.log(`${prefix}${key}: ${value}`);
            }
          }
        }
      }
      printTree(result.ast);
    }

    if (result.errors.length > 0) {
      console.error(`\n❌ ${filePath}:`);
      result.errors.forEach(e => {
        console.error(`  Line ${e.line}: ${e.message}`);
      });
      totalErrors += result.errors.length;
    } else {
      validFiles++;
      if (!flags.quiet && files.length > 1) {
        console.log(`✅ ${filePath} - State: ${result.ast.state.length}, Functions: ${result.ast.functions.length}, Elements: ${result.ast.elements.length}`);
      } else if (!flags.quiet) {
        console.log(`\n✅ ${filePath} is valid JSA syntax`);
        console.log(`   State: ${result.ast.state.length}, Functions: ${result.ast.functions.length}, Elements: ${result.ast.elements.length}`);
      }
    }

    if (result.warnings.length > 0 && !flags.quiet) {
      console.error('\n⚠️  Warnings:');
      result.warnings.forEach(w => {
        console.error(`  Line ${w.line}: ${w.message}`);
      });
    }

  } catch (err) {
    console.error(`❌ Error reading ${filePath}: ${err.message}`);
    totalErrors++;
  }
}

// Summary for multiple files
if (files.length > 1 && !flags.quiet) {
  console.log(`\n${validFiles}/${totalFiles} files valid`);
}

// Exit code
process.exit(totalErrors > 0 ? 1 : 0);
