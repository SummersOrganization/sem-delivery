# SEM landing page — build brief

Single-page marketing landing for **SEM (Summers Estate Management)**, a property
management platform. The page exists to do two things: make the product look as
good as it is, and get the visitor to one of two buttons — *View Demo* or
*Download for Windows*.

## Hard rules

- This repo is standalone. It never reads, imports, links to source in, or
  modifies anything under `C:\dev\SEM`. The desktop app and browser demo are
  locked deliverables; the site only links to their public URLs.
- Cards are rebuilt from scratch as marketing visuals with hardcoded numbers.
  Visual fidelity through replication, not dependency.
- Copy claims only what the demo actually does. No payments, no resident
  portal, no full accounting, and no performance / security / capacity claims
  (the product's own scope doc forbids them).
- Real photography only. Nothing generated goes on the page. Higgsfield is
  reserved for the film that will fill the reserved slot at the top.
- Plain HTML, CSS, vanilla JS. No framework, no build step, no animation
  library. Must open from the filesystem and host on GitHub Pages.

## Links

- View Demo → `https://summersorganization.github.io/sem-delivery/demo/`
- Download for Windows → `https://github.com/SummersOrganization/sem-delivery/releases/download/v1.0.0/SEM-Setup.exe`

## Structure (top to bottom)

1. **Nav** — fixed. Transparent over the hero; picks up a glass panel after the
   first screen. SEM mark left; *View Demo* text link and *Download* outlined
   button right. Quiet, never in the way.
2. **Film slot** — reserved 16:9 glass frame, ~74vw wide, centered. Holds its
   aspect ratio so nothing reflows when the video lands.
3. **Hero** — the Bean. Headline, one supporting line, scroll cue. No buttons.
4. **Beat 1 · Financials** — dusk skyline. Copy left, large Overview revenue
   card right.
5. **Beat 2 · Operations** — the river. Four cards left (Portfolio, Needs
   Attention, Leasing, This Week), copy right.
6. **Beat 3 · Teams** — river continues (same pinned photo). Copy left, seven
   role chips right.
7. **Closing** — the L train. Headline, both CTAs full size, small note that
   the demo uses fictional data.
8. **Footer** — one line.

## Copy

**Hero**
Your entire portfolio. One screen.
Summers Estate Management brings properties, units, residents, leases, and the
money behind them into a single place.

**Financials**
Know exactly where you stand.
Income and expenses tracked month by month, so the number you need is already
on screen. No exports, no spreadsheet, no waiting on somebody else's report.

**Daily operations**
Everything that needs you today, in one view.
Occupancy and vacancy. Leases coming up for renewal. Open maintenance requests
and what's gone overdue. It surfaces as it happens, so nothing sits waiting for
someone to go looking for it.

**Built for teams**
Everyone sees exactly what they should.
Owners, managers, accountants, leasing, maintenance — seven roles, each with
its own view and its own permissions. And guided walkthroughs built into the
app, so new people aren't handed a login and left to figure it out.

**Closing**
See it for yourself.
[View Demo] [Download for Windows]
Demo uses fictional sample data.

## Visual system

- Bright daylight photography as full-bleed backgrounds; dark frosted glass on
  top. The contrast is the look.
- Glass: `backdrop-filter: blur(24px) saturate(180%)`, fill `rgba(14,16,22,.46)`
  with a soft top-left sheen, 1px `rgba(255,255,255,.16)` edge, 1px inset top
  highlight, deep soft shadow, 22px radius, faint noise overlay to kill banding.
- Type: Inter, system fallback. Headlines 600 weight, tight tracking. Numbers
  tabular.
- Accents (from the product): blue `#3B9EFF`, green `#34D96B`, red `#FF4D4D`,
  magenta `#F0309A`, orange `#FF7A2F`, gold `#F5C46B`.
- Light gradient scrim on each photo plus text shadow so white copy holds over
  sky without dulling the image.

## Backgrounds

All four photos live in one fixed stack behind the page. The photo for the
current section is fully visible; on the way out it crossfades (~half a
viewport of scroll) into the next. Each photo drifts with parallax against
scroll and slowly scales 7% across its section. The L train pans horizontally
instead of zooming. Transform and opacity only. Motion values are lerped every
frame so nothing steps.

## Motion

- Entrance: each element fires once when it enters the viewport. 24px rise plus
  fade, 700ms ease-out. 130ms stagger between siblings. Inside a card the
  stagger is faster (50–80ms) so it reads as one gesture.
- Overshoot easing (`cubic-bezier(.34,1.56,.64,1)`) on anything that pops in.
- Nothing loops. The scroll cue's gentle bob is the one exception.

**Per card**

- Overview — both lines draw left to right over 1.2s, month dots appear as the
  line passes, `$636,937` counts up to land with them.
- This Week — seven bars pop bottom-up 60ms apart, Monday to Sunday, with
  overshoot. `7` counts up.
- Portfolio — blue arc sweeps clockwise from twelve to 82%, number counting in
  lockstep. Footer stats fade in after the arc lands.
- Needs Attention — `53` counts up, then the `11% urgent` ring scales in with
  overshoot, then its orange segment draws.
- Leasing — the line rises from the baseline into the Jan–Apr shape.

**Operations layout and the two interactive cards**

Order is This week, Leasing (top, 330px — the interactive pair, forward) then
Needs attention, Portfolio (bottom, compact — behind them). Both interactive
cards are ported from the demo rather than approximated:

- *This week* — the certified Week Wave (`upcoming-card` + `kpi/this-week-model`).
  L(i,q) = clamp(3 − |i − q|, 0, 3); bar height 6px + 10px × L; engagement
  envelope 26px + 10px × L with 2px hysteresis; a critically damped spring on
  the continuous peak q (ω 18.25 engaged / 18.98 released, semi-implicit Euler,
  dt ≤ 1/30 s). Rest peak is Thursday, so bars sit at 6·16·26·36·26·16·6.
  Mon–Wed `#ff5c00`, Thu–Sun `#28b900`.
- *Leasing* — `leasing-cycle-card`. Three four-month tabs (1·2·3) sharing one
  scale, the busiest month of the year, so the same count is the same height on
  every tab. viewBox 180×96, xs [18, 67.33, 112.67, 162], baseline 86, plot
  bottom 72, max height 49. Tab changes morph the ys over 930ms easeInOutCubic.
  Hover is band-gated: the tooltip only shows between the line and the
  baseline (±2px), and the nearest month's point grows 8px → 11px.

No coloured glows on any of these — the demo has none (its leasing line sets
`filter: none` explicitly). Only the Overview card keeps its line glow, which
the demo does have.

**Hover (desktop, fine pointer only)**

- Radial highlight tracks the cursor across the glass.
- Card tilts toward the cursor, 5° max, damped — engages fast (~150ms feel),
  releases slow (~400ms).
- 1px edge light brightens on the side nearest the cursor.
- Slight scale-up and deeper shadow.
- Only the highlight's position/opacity and the card transform animate. The
  blur value is never animated.
- Hover never retriggers entrance animations.

## Responsive / accessibility

- Below 900px: columns stack, copy above cards, film slot 92vw.
- Below 560px: cards single column, nav text link hidden.
- `prefers-reduced-motion`: backgrounds static, crossfades cut, entrance and
  card animations skipped, charts render final state, tilt off.
- No JS: everything visible at final state, first photo shown.

## Files

```
index.html          page
css/styles.css      all styling
js/main.js          backgrounds, reveal, card animations, hover
assets/photos/      bean.jpg  skyline.jpg  river.jpg  train.jpg
BRIEF.md            this document
```

Photos are served at ~2560px wide, JPEG ~82 quality. Focal points set per
photo with `background-position`.

## Later — the film

The reserved slot at the top gets a short film built in Higgsfield from the
same four photographs (image-to-video: clouds over the Bean, water on the
river, the L pulling through) cut with dashboard footage. Separate deliverable.

