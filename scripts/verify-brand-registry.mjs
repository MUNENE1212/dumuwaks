#!/usr/bin/env node
/**
 * verify-brand-registry.mjs — stop this repo's brand.registry.json drifting again.
 *
 *   node scripts/verify-brand-registry.mjs [path/to/brand.registry.json]
 *
 * The master registry is ementech-website/src/config/brand.registry.json. This
 * repo cannot import across that boundary, so it commits a copy — and for
 * months nothing compared the copies. They diverged: one had no `lines` block
 * at all, one was still v1 and listed retired Baitech as a live product, and
 * all of them named a DumuWaks host that had been redirecting since 2026-09-26.
 * The site and the assistant then stated different things about the same brand.
 *
 * So this asserts the settled facts directly. It cannot diff against the master
 * (no cross-repo import), which is the honest limit of a vendored copy: it
 * catches a fact REVERTING, not a fact that changes upstream. The estate-wide
 * comparison across the copies that live on the VPS is monitoring/collectors/
 * collect-claims.sh in baitech-infra, which normalises both shapes and diffs
 * them for real.
 *
 * This script is for the VENDORED COPIES. Pointed at the master itself, the
 * provenance check fails by design — the master has no upstream to name.
 *
 * Two shapes exist and both are legitimate: the master keys the three lines as
 * `lines.*`, this file may key them as `brands.*` with `role: "line"` because
 * real consumer files read them there. So this reads both and never asserts a
 * layout — only what the file claims.
 *
 * A contradiction is a build failure, not a warning. Zero dependencies, no network.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const target = resolve(process.argv[2] ?? 'brand.registry.json');

let pass = 0;
const failures = [];
const check = (name, ok, detail = '') => {
  if (ok) pass += 1;
  else failures.push(name);
  // Written as two literal calls, not console[ok ? 'warn' : 'error'](...). A
  // dynamic method name reads fine and lints clean in most configs, but a
  // no-console rule that only permits warn/error cannot see through it and
  // flags the whole script — so the vendored copy failed its repo's own lint
  // before this check ever ran.
  const msg = `${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`;
  if (ok) console.warn(msg);
  else console.error(msg);
};

let registry;
try {
  registry = JSON.parse(await readFile(target, 'utf8'));
} catch (err) {
  console.error(`cannot read ${target}: ${err.message}`);
  process.exit(1);
}

/* --------------------------------------------------------------- it is a copy */

console.warn('\n— it is marked as a copy —\n');

// A vendored copy must name its upstream, or the next person edits it as if it
// were the source and the copies drift again — which is what happened for
// months. This assertion is about COPIES. Running this script against the master
// itself will fail here, correctly: the master has no upstream to name.
const vendoredFrom = registry._meta?.vendoredFrom;
check(
  'registry declares where it was vendored from',
  typeof vendoredFrom === 'string' && vendoredFrom.length > 0,
  vendoredFrom === undefined
    ? 'no _meta.vendoredFrom — if this is the master (ementech-website) rather than a copy, do not run this check against it'
    : String(vendoredFrom),
);
check('registry carries a version', Boolean(registry._meta?.version), String(registry._meta?.version));

/* ---------------------------------------------------------------- the domains */

console.warn('\n— domains —\n');

const CANONICAL = 'https://emen.africa';
const DUMUWAKS = 'https://dumuwaks.co.ke';

check('company.domain is the canonical brand domain', registry.company?.domain === CANONICAL, registry.company?.domain);

// DumuWaks moved to its own apex on 2026-09-26. dumuwaks.ementech.co.ke now
// 301s onto it — not a broken link, so the link-checking guard stays green
// through it, which is exactly why this assertion exists.
const dumuwaksDomain = registry.brands?.dumuwaks?.domain;
check('DumuWaks names its own apex domain', dumuwaksDomain === DUMUWAKS, dumuwaksDomain);

// Read whichever shape carries a portfolio liveUrl, and reject the redirect.
const portfolio = Array.isArray(registry.portfolio) ? registry.portfolio : [];
const dw = portfolio.find((p) => p?.slug === 'dumuwaks');
check('the DumuWaks portfolio entry points at the apex too', dw?.liveUrl === DUMUWAKS, dw?.liveUrl);

// baitech.co.ke has no DNS at all, so this is a dead link rather than a
// redirect — and Baitech was absorbed into the Emen Shop line on 2026-09-20.
const deadLink = portfolio.filter(
  (p) => typeof p?.liveUrl === 'string' && p.liveUrl.includes('baitech.co.ke'),
);
check(
  'no portfolio entry points at the retired baitech.co.ke',
  deadLink.length === 0,
  deadLink.map((p) => `${p.slug} -> ${p.liveUrl}`).join(' | '),
);

const baitechLive = portfolio.filter(
  (p) => p?.slug === 'baitech' || (p?.name === 'Baitech' && p?.status === 'live'),
);
check(
  'Baitech is not offered as a live product',
  baitechLive.length === 0,
  baitechLive.map((p) => `${p.slug}/${p.name}: ${p.status}`).join(' | '),
);

/* -------------------------------------------------------------- the three lines */

// Read a line from either shape. Absence is itself the finding: the master had
// no lighting status at all while its own vendored copy already did, so the
// file named master was the LESS informed of the two.
const lineByName = (wanted) => {
  const fromLines = registry.lines ?? {};
  for (const [key, val] of Object.entries(fromLines)) {
    if ((val?.name ?? key).toLowerCase() === wanted.toLowerCase()) return val;
  }
  const fromBrands = registry.brands ?? {};
  for (const [key, val] of Object.entries(fromBrands)) {
    if ((val?.role === 'line') && (val?.name ?? key).toLowerCase() === wanted.toLowerCase()) return val;
    if ((val?.name ?? key).toLowerCase() === wanted.toLowerCase()) return val;
  }
  return undefined;
};

console.warn('\n— the three lines —\n');

for (const line of ['Emen Shop', 'Emen Tech', 'Emen Lighting']) {
  // Report what was actually found, not the name being asked about: a detail
  // that echoes the query is a detail that lies when the answer is no.
  const found = lineByName(line);
  check(`the registry declares ${line}`, Boolean(found), found ? `${found.name ?? 'unnamed'}` : '(absent)');
}

// Emen Lighting is not live. Promoting a line that cannot be bought is the
// failure this guards, and it is not a broken link, so nothing else catches it.
const lighting = lineByName('Emen Lighting') ?? {};
check('Lighting declares a status', Boolean(lighting.status), String(lighting.status));
check('Lighting is declared not-live', lighting.status === 'not-live', String(lighting.status));
check('Lighting is flagged do-not-promote', lighting.promote === false, String(lighting.promote));

/* ------------------------------------------------------------------- done */

console.warn(`\n${pass} passed, ${failures.length} failed`);
if (failures.length) {
  console.error(
    `\nThis registry copy contradicts the estate:\n  - ${failures.join('\n  - ')}\n\n` +
      `The master is ementech-website/src/config/brand.registry.json. Re-vendor from the master — ` +
      `never from a downstream copy, which is how the copies drifted apart in the first place.`,
  );
}
process.exit(failures.length ? 1 : 0);