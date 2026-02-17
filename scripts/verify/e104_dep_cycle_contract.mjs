#!/usr/bin/env node
// E104-D1: Dependency Cycle Detection - Import graph cycle detection
import fs from 'node:fs';
import path from 'node:path';

const VERIFY_DIR = path.resolve('scripts/verify');

/**
 * Recursively find all .mjs files in a directory
 */
function findMjsFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findMjsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.mjs')) {
      results.push(fullPath);
    }
  }

  return results;
}

// Node.js builtin modules (ignore these in cycle detection)
const BUILTINS = new Set([
  'assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram', 'dns',
  'domain', 'events', 'fs', 'http', 'https', 'net', 'os', 'path',
  'punycode', 'querystring', 'readline', 'stream', 'string_decoder',
  'tls', 'tty', 'url', 'util', 'v8', 'vm', 'zlib'
]);

/**
 * Extract import statements from a .mjs file
 * Returns array of imported module paths (relative or absolute)
 */
function extractImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const imports = [];

  // Match: import ... from '...'  or  import ... from "..."
  const importRegex = /import\s+(?:[\w{},\s*]+\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];

    // Skip node: prefixed builtins
    if (importPath.startsWith('node:')) continue;

    // Skip npm packages (no ./ or ../)
    if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
      // Check if it's a builtin
      if (BUILTINS.has(importPath)) continue;
      // Otherwise it's an npm package, skip
      continue;
    }

    imports.push(importPath);
  }

  return imports;
}

/**
 * Resolve relative import path to absolute file path
 */
function resolveImport(fromFile, importPath) {
  const fromDir = path.dirname(fromFile);
  let resolved = path.resolve(fromDir, importPath);

  // Add .mjs extension if not present
  if (!resolved.endsWith('.mjs') && !resolved.endsWith('.js')) {
    if (fs.existsSync(resolved + '.mjs')) {
      resolved += '.mjs';
    } else if (fs.existsSync(resolved + '.js')) {
      resolved += '.js';
    }
  }

  return resolved;
}

/**
 * Build dependency graph for all scripts/verify/**\/*.mjs files
 * Returns: Map<filePath, importedFilePaths[]>
 */
function buildDependencyGraph() {
  const files = findMjsFiles(VERIFY_DIR);
  const graph = new Map();

  for (const file of files) {
    const imports = extractImports(file);
    const resolvedImports = imports
      .map(imp => resolveImport(file, imp))
      .filter(resolved => fs.existsSync(resolved));

    graph.set(file, resolvedImports);
  }

  return graph;
}

/**
 * Detect cycles in dependency graph using DFS
 * Returns: array of cycles (each cycle is an array of file paths)
 */
function detectCycles(graph) {
  const cycles = [];
  const visited = new Set();
  const stack = new Set();
  const path = [];

  function dfs(node) {
    if (stack.has(node)) {
      // Found a cycle
      const cycleStart = path.indexOf(node);
      const cycle = path.slice(cycleStart).concat([node]);
      cycles.push(cycle);
      return;
    }

    if (visited.has(node)) return;

    visited.add(node);
    stack.add(node);
    path.push(node);

    const deps = graph.get(node) || [];
    for (const dep of deps) {
      dfs(dep);
    }

    stack.delete(node);
    path.pop();
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return cycles;
}

/**
 * Format file path for display (relative to repo root)
 */
function formatPath(absPath) {
  return path.relative(process.cwd(), absPath);
}

// Execute cycle detection
console.log('e104:dep_cycle_contract: Building dependency graph...');
const graph = buildDependencyGraph();
console.log(`e104:dep_cycle_contract: Analyzed ${graph.size} files`);

const cycles = detectCycles(graph);

if (cycles.length > 0) {
  console.error(`\ne104:dep_cycle_contract: FAILED - Found ${cycles.length} cycle(s):\n`);

  for (let i = 0; i < cycles.length; i++) {
    console.error(`Cycle ${i + 1}:`);
    const cycle = cycles[i];
    for (let j = 0; j < cycle.length; j++) {
      const arrow = j < cycle.length - 1 ? ' →' : ' ⟲';
      console.error(`  ${formatPath(cycle[j])}${arrow}`);
    }
    console.error('');
  }

  throw new Error(`Dependency cycle detected (${cycles.length} cycles)`);
}

console.log('e104:dep_cycle_contract: PASSED (no cycles detected)');
