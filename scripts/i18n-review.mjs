#!/usr/bin/env node
/**
 * i18n-review.mjs
 *
 * Applies manually reviewed translations from pending-review.json into en.json,
 * then resets the review queue to {}.
 *
 * Workflow:
 *   1. Browse the app in English — missing keys auto-land in en.json + pending-review.json
 *   2. Edit providers/translations/pending-review.json with your final English values
 *   3. Run: yarn i18n:apply
 *   4. en.json is updated, pending-review.json resets to {}
 *
 * Usage:
 *   node scripts/i18n-review.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EN_PATH = path.join(ROOT, "providers", "translations", "en.json");
const REVIEW_PATH = path.join(ROOT, "providers", "translations", "pending-review.json");

// --- Read files ---
const enRaw = fs.readFileSync(EN_PATH, "utf-8");
const en = JSON.parse(enRaw);

let reviewRaw;
try {
  reviewRaw = fs.readFileSync(REVIEW_PATH, "utf-8");
} catch {
  console.log("No pending-review.json found — nothing to apply.");
  process.exit(0);
}
const review = JSON.parse(reviewRaw);

const keys = Object.keys(review);
if (keys.length === 0) {
  console.log("pending-review.json is empty — nothing to apply.");
  process.exit(0);
}

// --- Apply ---
const applied = [];
const skipped = [];

for (const key of keys) {
  const value = review[key];
  if (typeof value !== "string" || !value) {
    skipped.push(key);
    continue;
  }
  if (en[key] === value) {
    skipped.push(key); // already identical
    continue;
  }
  en[key] = value;
  applied.push(key);
}

// --- Write en.json (sorted alphabetically) ---
const sorted = Object.keys(en)
  .sort((a, b) => a.localeCompare(b))
  .reduce((obj, k) => {
    obj[k] = en[k];
    return obj;
  }, {});

fs.writeFileSync(EN_PATH, JSON.stringify(sorted, null, 2) + "\n", "utf-8");

// --- Reset pending-review.json ---
fs.writeFileSync(REVIEW_PATH, "{}\n", "utf-8");

// --- Report ---
if (applied.length > 0) {
  console.log(`\nApplied ${applied.length} translation(s) to en.json:`);
  for (const k of applied) {
    console.log(`  "${k}" → "${en[k]}"`);
  }
}
if (skipped.length > 0) {
  console.log(`\nSkipped ${skipped.length} (already identical or invalid):`);
  for (const k of skipped) {
    console.log(`  "${k}"`);
  }
}
console.log("\nDone. pending-review.json has been reset to {}.");
