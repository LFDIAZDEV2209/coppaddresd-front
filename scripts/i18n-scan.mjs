#!/usr/bin/env node
/**
 * i18n-scan — scans all t() calls in the codebase and reports keys
 * missing from en.json. Catches single, double, and backtick quotes.
 *
 * A key en.json sin t() literal NO se considera huérfana si aparece
 * como literal en cualquier archivo escaneado (uso dinámico vía
 * t(variable) sobre arrays/consts) o si viene de datos del backend/mock.
 *
 * Usage:  node scripts/i18n-scan.mjs [--json]
 */
import { readFileSync, readdirSync } from "fs";
import { join, relative } from "path";

const ROOT = process.cwd();
const EN_PATH = join(ROOT, "providers", "translations", "en.json");

// Walk directories for .tsx/.ts files (exclude node_modules, .next, dist)
function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", "dist", ".turbo"].includes(entry.name))
        continue;
      walk(full, acc);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

// Match t('...'), t("..."), t(`...`) with word-boundary before t
const KEY_RE = /\bt\(\s*(['"`])((?:(?!\1).)+)\1/g;

const dirs = ["app", "components", "features", "providers", "lib"];
const files = [];
for (const d of dirs) {
  try {
    walk(join(ROOT, d), files);
  } catch {
    // directory doesn't exist, skip
  }
}

// Collect all t() keys used in code + full source blob (para detectar uso dinámico)
const codeKeys = new Map(); // key → Set of files using it
let sourceBlob = "";
for (const f of files) {
  const src = readFileSync(f, "utf8");
  sourceBlob += src + "\n";
  let m;
  const re = new RegExp(KEY_RE.source, "g");
  while ((m = re.exec(src))) {
    const key = m[2];
    if (!codeKeys.has(key)) codeKeys.set(key, new Set());
    codeKeys.get(key).add(relative(ROOT, f));
  }
}

// Load en.json
let en = {};
try {
  en = JSON.parse(readFileSync(EN_PATH, "utf8"));
} catch (e) {
  console.error(`Failed to parse en.json: ${e.message}`);
  process.exit(1);
}

// Missing: in code but not in en.json
const missing = [];
for (const [key, files] of codeKeys) {
  if (!(key in en)) {
    missing.push({ key, files: [...files] });
  }
}

// Orphaned: en key sin t() literal Y sin ninguna referencia literal en el código.
// Claves referenciadas dinámicamente (t(variable) sobre arrays/consts o datos
// del backend/mock que aparecen como literal) se clasifican aparte.
const orphaned = [];
const dynamic = [];
for (const key of Object.keys(en)) {
  if (codeKeys.has(key)) continue;
  if (sourceBlob.includes(key)) dynamic.push(key);
  else orphaned.push(key);
}

// Output
if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ missing, orphaned, dynamic }, null, 2));
} else {
  console.log(`\ni18n scan results:`);
  console.log(`  t() calls in code:  ${codeKeys.size}`);
  console.log(`  en.json keys:       ${Object.keys(en).length}`);
  console.log(
    `  Missing from en.json: ${missing.length > 0 ? "\x1b[31m" + missing.length + "\x1b[0m" : "\x1b[32m0\x1b[0m"}`
  );
  console.log(`  Dynamic keys (used via t(variable)): ${dynamic.length}`);
  console.log(`  Orphaned in en.json:  ${orphaned.length}`);

  if (missing.length > 0) {
    console.log(`\nMissing keys:`);
    for (const { key, files } of missing.sort((a, b) =>
      a.key.localeCompare(b.key)
    )) {
      console.log(`  "${key}"`);
      console.log(`    used in: ${files.join(", ")}`);
    }
  }

  if (orphaned.length > 0 && !process.argv.includes("--no-orphan")) {
    console.log(`\nOrphaned keys (in en.json but no t() call found):`);
    for (const key of orphaned.sort()) {
      console.log(`  "${key}"`);
    }
  }
}

process.exit(missing.length > 0 ? 1 : 0);
