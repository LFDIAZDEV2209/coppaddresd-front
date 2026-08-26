import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const EN_PATH = path.join(process.cwd(), 'providers', 'translations', 'en.json');
const REVIEW_PATH = path.join(process.cwd(), 'providers', 'translations', 'pending-review.json');

const MYMEMORY_API = 'https://api.mymemory.translated.net/get';
const MAX_KEYS = 50;
const MAX_KEY_LENGTH = 200;

// Serialize concurrent writes so read-modify-write never races.
let inflight: Promise<unknown> = Promise.resolve();

function extractTokens(source: string): string[] {
  const tokens: string[] = [];
  const regex = /\{(\w+)\}/g;
  let match;
  while ((match = regex.exec(source)) !== null) {
    tokens.push(match[0]);
  }
  return tokens;
}

async function translateKey(key: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      q: key,
      langpair: 'es|en',
    });
    const email = process.env.MYMEMORY_EMAIL;
    if (email) params.set('de', email);

    const res = await fetch(`${MYMEMORY_API}?${params.toString()}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.responseStatus !== 200) return null;

    const translated: string | undefined = data.responseData?.translatedText;
    if (!translated || translated === key) return null;

    return translated;
  } catch {
    return null;
  }
}

function tokensPreserved(source: string, translated: string): boolean {
  const tokens = extractTokens(source);
  if (tokens.length === 0) return true;
  return tokens.every((t) => translated.includes(t));
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let keys: unknown;
  try {
    const body = await req.json();
    keys = body?.keys;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!Array.isArray(keys) || keys.length === 0 || keys.length > MAX_KEYS) {
    return NextResponse.json({ error: `Keys must be an array of 1–${MAX_KEYS} strings` }, { status: 400 });
  }

  for (const k of keys) {
    if (typeof k !== 'string' || k.length === 0 || k.length > MAX_KEY_LENGTH) {
      return NextResponse.json({ error: 'Each key must be a non-empty string (max 200 chars)' }, { status: 400 });
    }
  }

  // Serialize through the queue so concurrent requests don't race.
  inflight = inflight.then(() => processKeys(keys as string[]));
  const result = await inflight;

  return NextResponse.json(result);
}

async function processKeys(keys: string[]) {
  // Read current files.
  const enRaw = await fs.readFile(EN_PATH, 'utf-8');
  const en: Record<string, string> = JSON.parse(enRaw);

  let reviewRaw = '{}';
  try {
    reviewRaw = await fs.readFile(REVIEW_PATH, 'utf-8');
  } catch { /* first time */ }
  const review: Record<string, string> = JSON.parse(reviewRaw);

  const added: string[] = [];
  const skipped = keys.filter((k) => {
    if (k in en) return true;
    return false;
  });
  const toTranslate = keys.filter((k) => !(k in en));

  for (const key of toTranslate) {
    let translated = await translateKey(key);

    // Token preservation check.
    if (translated && !tokensPreserved(key, translated)) {
      translated = null; // fall back to identity
    }

    const value = translated ?? key;
    en[key] = value;
    review[key] = value;
    added.push(key);
  }

  if (added.length === 0) {
    return { added: [], skipped: skipped.length };
  }

  // Write back sorted alphabetically.
  const sorted = Object.keys(en)
    .sort((a, b) => a.localeCompare(b))
    .reduce<Record<string, string>>((obj, k) => {
      obj[k] = en[k];
      return obj;
    }, {});

  await fs.writeFile(EN_PATH, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
  await fs.writeFile(REVIEW_PATH, JSON.stringify(review, null, 2) + '\n', 'utf-8');

  return { added, skipped: skipped.length };
}
