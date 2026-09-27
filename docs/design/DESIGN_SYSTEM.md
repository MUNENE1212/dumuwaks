# Dumuwaks design system

Built in the order of the **Emen Brand** system (Dumuwaks is an Emen Tech
product): night surfaces, one amber ramp, square-cut geometry, and every
measured number in mono. The original Dumu Waks identity survives in two
places — the circuit-blue screwdriver in the mark, and the mahogany band.

Source of truth: `frontend/src/styles/tokens.css` (CSS) and
`frontend/tailwind.config.js` (same values as hex, so `bg-lumen/10` works).

## The mark

Africa with a wrench crossed over a screwdriver, cut into the continent. The
silhouette is Natural Earth 1:50m, 50 states dissolved (mainland + Madagascar) —
the same provenance as the Emen mark. Every tool edge is straight.

| File | Use |
|---|---|
| `public/brand/dumuwaks-mark.svg` | Night grounds (cream continent) |
| `public/brand/dumuwaks-mark-dark.svg` | Light grounds, print (ink continent) |
| `public/brand/dumuwaks-icon-small.svg` | Below 48 px: continent + one wrench |
| `<BrandMark />`, `<BrandLockup />` | In the app (`components/brand/BrandMark.tsx`) |

Wordmark: **DUMUWAKS** caps + **.co.ke** lowercase in lumen — the domain is part
of the name, as `EMEN.africa` is for Emen. In running text: *Dumuwaks*.

Regenerate: `python3 scripts/brand/build-mark.py <countries-50m.json> <out>`
(output is byte-identical to the shipped SVGs). Never hand-edit the paths.

## Colour — the rules that matter

| Token | Role |
|---|---|
| `surface-000…400` | Ground → raised → sunken → hover. Elevation is a surface step, not a shadow. |
| `line`, `line-strong` | Hairlines; input borders |
| `ink`, `ink-muted`, `ink-faint` | Text; secondary; placeholders only |
| `lumen` | **The only action colour.** Primary buttons, active nav, the brand. |
| `on-lumen` | Text on any amber or status fill. White on amber fails. |
| `filament`, `ember` | Ends of the ramp. Filament once per view. |
| `circuit` | Heritage blue = **live / in motion**: en route, online, tracking. |
| `ok`, `warn`, `fault` | Status only. `warn` is never decoration. |
| `mahogany` | Heritage ground, one feature band per page (WhatsApp band on Home). |
| `whatsapp` | WhatsApp's green, only on WhatsApp entry points. |

## Type

Archivo 700/800 for headings (`text-hero`, `text-display`, `text-title`,
`text-heading`); IBM Plex Sans for text (`text-lead`, `text-body`,
`text-body-sm`); **IBM Plex Mono for every quantity** — KES, dates, booking
numbers, references, counts (`font-mono`, `.eyebrow` for field labels).

## Geometry

Radius 0/2/4/8 px only (`rounded-md` = buttons and cards, `rounded-xl` = modals).
`rounded-full` is for status chips (`.chip`) and avatars — a pill means *state*.
No blur, no glow, no gradients: `backdrop-blur-*`, `shadow-led*` and the old
gradient utilities are neutralised in the config.

## Not making people think

- One primary action per view; everything else is outline or ghost.
- One floating control: WhatsApp for visitors, the Assistant for members.
- Say the outcome and the number: "held until you confirm", "0% if you cancel
  more than 24 h ahead". No promise without a mechanism behind it.
- Kiswahili belongs next to English, in the same plain register.

## Legacy classes

`primary-*`, `circuit` (old action colour), `gray-*`, `green-*` etc. are
re-pointed to the roles above so older screens render correctly. New code uses
the semantic names. `scripts/design/codemod-emen.mjs` did the one-time
migration of light-mode neutrals, gradients and white-on-amber text.
