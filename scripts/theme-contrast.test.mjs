import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
function contrast(a, b) {
  const lum = hex => {
    const c = hex.replace('#', '').match(/../g).map(n => parseInt(n, 16) / 255).map(n => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
    return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  };
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
for (const theme of [':root', '.dark']) {
  test(`${theme} semantic status text reaches 4.5:1 on solid and pastel surfaces`, () => {
    const section = css.slice(css.indexOf(theme + ' {')).split('}')[0];
    const tokens = Object.fromEntries([...section.matchAll(/--([\w-]+):\s*(#[\da-f]{6})\s*;/gi)].map(m => [m[1],m[2]]));
    for (const tone of ['success', 'warning', 'info', 'destructive']) {
      for (const suffix of ['', '-soft']) {
        const ratio = contrast(tokens[tone+suffix], tokens[tone+suffix+'-foreground']);
        assert.ok(ratio >= 4.5, `${theme} ${tone}${suffix}: ${ratio.toFixed(2)}:1`);
      }
    }
    assert.ok(contrast(tokens['muted-foreground'], tokens.muted) >= 4.5);
  });
}
