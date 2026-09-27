#!/usr/bin/env node
/**
 * One-shot codemod: move frontend class names onto the Emen-order token system.
 *
 * The app is dark-only (ThemeProvider always sets `.dark`), yet many components
 * still carry light-mode neutrals. This rewrites, per line:
 *   - neutral colours (gray/neutral/slate/zinc/stone/white/black) → surface-*, line*, ink*
 *     chosen by role (bg / text / border), so light- and dark-designed classes
 *     land on the same night tokens;
 *   - `X dark:Y` pairs for the same property → `Y` (dark always wins anyway);
 *   - gradients → the flat `from-` colour; gradient text → lumen-ink;
 *   - `text-white` on a solid chromatic fill → `text-on-lumen` (white on amber fails).
 *
 * Usage: node scripts/design/codemod-emen.mjs frontend/src [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || 'frontend/src';
const dry = process.argv.includes('--dry');

const NEUTRALS = 'gray|neutral|slate|zinc|stone|white|black';
const CHROMA =
  'primary|circuit|brand|orange|amber|yellow|blue|sky|cyan|indigo|purple|violet|wrench|green|emerald|teal|lime|red|rose|pink|lumen|ok|warn|fault';
const PROPS = 'bg|text|border(?:-[trblxy])?|divide|ring|ring-offset|outline|placeholder|from|via|to|fill|stroke|decoration|caret|accent';

const tokenRe = new RegExp(
  String.raw`(?<![\w-])((?:[a-z0-9-]+:)*)(${PROPS})-(${NEUTRALS})(?:-(50|100|200|300|400|500|600|700|800|900|950))?(\/\d{1,3})?(?![\w-])`,
  'g'
);

const bgMap = {
  white: 'surface-200', 50: 'surface-100', 100: 'surface-300', 200: 'surface-400', 300: 'line-strong',
  400: 'ink-faint', 500: 'ink-faint', 600: 'surface-400', 700: 'surface-300', 800: 'surface-200',
  900: 'surface-100', 950: 'surface-000', black: 'surface-000',
};
const textMap = {
  white: 'ink', black: 'ink', 50: 'ink', 100: 'ink', 200: 'ink', 300: 'ink-muted', 400: 'ink-muted',
  500: 'ink-muted', 600: 'ink-muted', 700: 'ink', 800: 'ink', 900: 'ink', 950: 'ink',
};
const lineMap = {
  white: 'line', black: 'line', 50: 'line', 100: 'line', 200: 'line', 300: 'line-strong', 400: 'line-strong',
  500: 'line-strong', 600: 'line-strong', 700: 'line', 800: 'line', 900: 'line', 950: 'line',
};

function mapNeutral(prop, color, shade, alpha) {
  const key = shade || color; // `bg-white` → 'white', `bg-gray-800` → '800'
  const k = color === 'white' || color === 'black' ? color : key;
  let target;
  if (prop === 'bg' || prop === 'from' || prop === 'via' || prop === 'to') target = bgMap[k];
  else if (prop === 'text' || prop === 'fill' || prop === 'stroke' || prop === 'caret' || prop === 'decoration') target = textMap[k];
  else if (prop === 'placeholder') target = 'ink-faint';
  else target = lineMap[k];
  // translucent white/black overlays keep their alpha on the nearest ink/ground
  if (alpha && color === 'white') target = prop === 'bg' || prop === 'text' ? 'ink' : 'ink';
  if (alpha && color === 'black') target = 'surface-000';
  return `${prop}-${target}${alpha || ''}`;
}

const colorTokenRe = new RegExp(
  String.raw`(?<![\w-])((?:[a-z0-9-]+:)*)(${PROPS})-((?:surface-(?:000|\d00))|line(?:-strong)?|ink(?:-muted|-faint)?|(?:${CHROMA})(?:-(?:\d{2,3}|hover|ink|tint))?|on-lumen|filament|ember)(\/\d{1,3})?(?![\w-])`,
  'g'
);

function resolveDarkPairs(line) {
  // Collect color tokens by (variants-minus-dark, prop)
  const tokens = [...line.matchAll(colorTokenRe)].map((m) => ({
    full: m[0],
    variants: m[1] ? m[1].split(':').filter(Boolean) : [],
    prop: m[2].replace(/^border-[trblxy]$/, (p) => p),
  }));
  if (!tokens.some((t) => t.variants.includes('dark'))) return line;
  const key = (t) => t.variants.filter((v) => v !== 'dark').sort().join(':') + '|' + t.prop;
  const darkKeys = new Map();
  for (const t of tokens) if (t.variants.includes('dark')) darkKeys.set(key(t), t);
  let out = line;
  for (const t of tokens) {
    if (!t.variants.includes('dark') && darkKeys.has(key(t))) {
      out = out.replace(new RegExp(String.raw`(?<![\w:-])${escape(t.full)}(?![\w-])\s?`), '');
    }
  }
  // strip the `dark:` prefix: dark is always on
  out = out.replace(/(?<![\w-])dark:/g, '');
  return out;
}

function escape(s) {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

const solidFillRe = new RegExp(
  String.raw`(?<![\w:-])(?:hover:)?bg-(?:(?:${CHROMA})(?:-(?:500|600|700))?|lumen|filament|ember)(?![\w/-])`
);

function transformLine(line) {
  if (!/(bg|text|border|divide|ring|from|placeholder|outline|fill|stroke)-/.test(line)) return line;
  let out = line;

  // gradient text → lumen-ink
  if (/bg-clip-text/.test(out) && /text-transparent/.test(out)) {
    out = out
      .replace(/\s?(?<![\w-])bg-clip-text(?![\w-])/g, '')
      .replace(/(?<![\w-])text-transparent(?![\w-])/g, 'text-lumen-ink')
      .replace(/\s?(?<![\w-])bg-gradient-to-[a-z]{1,2}(?![\w-])/g, '')
      .replace(/\s?(?<![\w-])(?:[a-z0-9-]+:)*(?:from|via|to)-[a-z]+(?:-\d{2,3})?(?:\/\d+)?(?![\w-])/g, '');
  }
  // gradients → flat `from-` colour
  if (/bg-gradient-to-/.test(out)) {
    out = out
      .replace(/\s?(?<![\w-])bg-gradient-to-[a-z]{1,2}(?![\w-])/g, '')
      .replace(/(?<![\w-])((?:[a-z0-9-]+:)*)from-([a-z]+(?:-\d{2,3})?(?:\/\d+)?)(?![\w-])/g, '$1bg-$2')
      .replace(/\s?(?<![\w-])(?:[a-z0-9-]+:)*(?:via|to)-[a-z]+(?:-\d{2,3})?(?:\/\d+)?(?![\w-])/g, '');
  }

  out = out.replace(tokenRe, (m, variants, prop, color, shade, alpha) => {
    if (color === 'white' && prop === 'text' && !alpha) return `${variants}text-white`; // decided below
    return variants + mapNeutral(prop, color, shade, alpha);
  });

  out = resolveDarkPairs(out);

  // text-white: on a solid fill → on-lumen; otherwise → ink
  const hasFill = solidFillRe.test(out);
  out = out.replace(/(?<![\w-])((?:[a-z0-9-]+:)*)text-white(?![\w/-])/g, (_m, v) =>
    hasFill ? `${v}text-on-lumen` : `${v}text-ink`
  );

  // shadow glow / blur utilities are inert in the new config; drop the noise
  out = out.replace(/\s?(?<![\w-])(?:[a-z0-9-]+:)*backdrop-blur(?:-[a-z0-9]+)?(?![\w-])/g, '');

  return out;
}

let changedFiles = 0;
let changedLines = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '_old') continue;
      walk(p);
    } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) {
      const src = fs.readFileSync(p, 'utf8');
      const lines = src.split('\n');
      let n = 0;
      const out = lines.map((l) => {
        const t = transformLine(l);
        if (t !== l) n++;
        return t;
      });
      if (n) {
        changedFiles++;
        changedLines += n;
        if (!dry) fs.writeFileSync(p, out.join('\n'));
      }
    }
  }
}

walk(root);
console.log(`${dry ? '[dry] ' : ''}${changedLines} lines in ${changedFiles} files`);
