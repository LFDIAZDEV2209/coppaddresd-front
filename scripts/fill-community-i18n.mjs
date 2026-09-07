#!/usr/bin/env node
// Rellena las claves i18n faltantes para el ERP de comunidad.
// es.json: valor = clave (español). en.json: valor = clave (placeholder)
// salvo entradas del mapa manual de inglés.
import { readFileSync, readdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const EN_PATH = join(ROOT, "providers", "translations", "en.json");
const ES_PATH = join(ROOT, "providers", "translations", "es.json");

const KEY_RE = /\bt\(\s*(['"`])((?:(?!\1).)+)\1/g;

const dirs = [
  "features/community",
  "app/(dashboard)/community",
  "app/(community)",
  "lib/config",
];

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", "dist"].includes(entry.name)) continue;
      walk(full, acc);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const files = [];
for (const d of dirs) walk(join(ROOT, d), files);

const codeKeys = new Set();
for (const f of files) {
  const src = readFileSync(f, "utf8");
  let m;
  const re = new RegExp(KEY_RE.source, "g");
  while ((m = re.exec(src))) codeKeys.add(m[2]);
}

const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const es = load(ES_PATH);
const en = load(EN_PATH);

let added = 0;
for (const key of codeKeys) {
  if (!(key in es)) {
    es[key] = key;
    added++;
  }
  if (!(key in en)) {
    en[key] = key;
    added++;
  }
}

writeFileSync(ES_PATH, JSON.stringify(es, null, 2) + "\n", "utf8");
writeFileSync(EN_PATH, JSON.stringify(en, null, 2) + "\n", "utf8");
console.log(`Claves procesadas: ${codeKeys.size}. Añadidas: ${added}`);
