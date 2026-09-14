# Handover — SEM website

Written 2026-09-14 at the end of the build session. Read this first in a new
chat, then `BRIEF.md` for the design and motion spec.

---

## 1. Where things stand

The marketing landing page is **built, published and live**:

<https://summersorganization.github.io/sem-delivery/website/>

| | |
|---|---|
| **Canonical source** | `C:\dev\sem-delivery\website\` — public repo `SummersOrganization/sem-delivery`, branch `main` |
| **Hosting** | GitHub Pages, serves straight from `main`. Commit and push; it redeploys in a minute or two. |
| **Old scratch copy** | `C:\dev\sem-site` — committed locally, **no remote**. Superseded. Don't edit it; it will drift. |
| **Linked from** | The repo README, above the demo and desktop links. |

Everything is committed and pushed. Both repos were clean at handover.

---

## 2. Hard rules — do not break these

**Never touch `C:\dev\SEM`.** That is the private product repo holding the
desktop app and browser demo, which are **locked, finished deliverables**.
Codex runs there in the background on unrelated work — as of 2026-09-14 it had
101 uncommitted files on branch `codex/sem-desktop-foundation`. Do not stage,
commit, edit or otherwise disturb anything in it.

Reading it is fine and often necessary (see §4). Writing to it is not.

**The website is standalone.** It never imports from the app or the demo. It
only links to their public URLs. Card visuals here are *rebuilt* as marketing
components with hardcoded numbers — fidelity by replication, never by
dependency.

**Copy claims only what the demo actually does.** No payments, no resident
portal, no full accounting, and no performance, security or capacity claims —
the product's own scope doc (`C:\dev\SEM\docs\demo\SCOPE.md`) forbids them.
Seven roles and the built-in guided tutorials are real and safe to sell.

**Photography only.** Nothing on the page is AI-generated. Photos live in
`assets/photos/` (bean, skyline, river, boardroom, train) and are Unsplash
downloads — that licence permits commercial use without attribution.

---

## 3. What the page is

One page, plain HTML/CSS/JS, no framework and no build step. Five sections:

1. **Hero** — the Bean. Reserved 16:9 slot at the top for the film (see §6).
2. **Financials** — dusk skyline. Large Overview card with a 12-month chart.
3. **Operations** — the river. Four cards in a pinwheel: This week and Leasing
   are large squares (interactive), Portfolio and Needs attention are small
   squares behind them.
4. **Teams** — boardroom. Seven role chips, clickable buttons that currently go
   nowhere by design; they are placeholders for future deep pages.
5. **Closing** — the L train. Both CTAs, then the page ends.

Nav: `SEM` as a non-clickable stamp, then Home, View Demo and Download as
identical glass pills.

**The two CTAs, used throughout:**
- Demo → `https://summersorganization.github.io/sem-delivery/demo/`
- Installer → `https://github.com/SummersOrganization/sem-delivery/releases/download/v1.0.0/SEM-Setup.exe`

---

## 4. Where to find information

**`BRIEF.md`** (next to this file) is the design and motion spec — the glass
recipe, the per-card animations, the copy, the responsive and accessibility
rules. Read it before changing how anything looks.

**The demo's source is the reference for anything product-shaped.** When the
page needs to match the app, the rule has been *copy, never invent*. Useful
paths, all read-only:

| What | Where |
|---|---|
| Overview card (chart geometry, tooltip, ring cut-outs) | `C:\dev\SEM\browser-demo\src\components\visual-lab\dashboard-rebuild\owner-overview-card.tsx` |
| Leasing card (tabs, morph, hover band) | `…\dashboard-rebuild\leasing-cycle-card.tsx` |
| This week card (the Week Wave) | `…\dashboard-rebuild\upcoming-card.tsx` + `upcoming-wave.ts` + `kpi\this-week-model.ts` |
| Card and tooltip glass materials | `…\dashboard-rebuild\tooltip-glass.module.css`, `browser-demo\src\app\globals.css`, `…\v27-style-lab\v27-style-lab.module.css` |
| All dashboard CSS | `…\dashboard-rebuild\dashboard-rebuild.module.css` |
| Product scope limits (what may be claimed) | `C:\dev\SEM\docs\demo\SCOPE.md` |
| Roles and tutorial facts | `C:\dev\SEM\browser-demo\TUTORIAL-UPGRADE-REPORT-2026-09-11.md` |

Already ported verbatim: the Overview chart's band maths and ring cut-out
masks, the Leasing card's three-tab shared scale and 930ms morph, the certified
Week Wave spring, and the tooltip/coach-card glass. `BRIEF.md` records the
constants.

---

## 5. How to work on it

```bash
cd C:\dev\sem-delivery\website
npx serve -l 4173 .
```

Then edit, commit, push to `main`. Pages redeploys itself.

**A real gotcha when verifying visually.** Chrome freezes `requestAnimationFrame`
and style recalculation in a tab that is not in front. If you drive a browser
while the user's own window has focus, screenshots come back black and
`getComputedStyle` returns stale values — inline styles will not even register.
Symptoms look like broken code but are not. Either accept DOM-level
verification, or say plainly that motion could not be confirmed visually and
ask the user to look.

---

## 6. Next up — the video ad

This is the work the next session is for.

**The concept, already agreed.** A short film for the reserved 16:9 slot at the
top of the page, built in Higgsfield from the site's own five photographs —
image-to-video, so clouds move over the Bean, water moves on the river, the L
pulls through — intercut with dashboard footage. Every frame originates from a
real photo. Nothing invented from scratch.

**Why it's separate.** The page itself is deliberately restrained. The
spectacle belongs in the film. That division was a deliberate decision, not an
accident.

**Higgsfield state.** The CLI is installed globally and authenticated
(`higgsfield auth login` already completed, Plus plan, ~1,200 credits as of
2026-09-13). The MCP connector was live in the last session. **The companion
skills were installed into a scratch workspace that no longer exists** — expect
to reinstall them in the project directory:

```bash
npx skills add higgsfield-ai/skills
```

Note that the installer's own scanner flagged several of those skills as high
risk; that is its output, not a vouch. Check
<https://skills.sh/higgsfield-ai/skills> before leaning on them.

**Open decisions for the film:** length, whether there is narration or only
music, how much dashboard footage versus photography, and whether the page's
slot autoplays muted on loop or waits for a click.

---

## 7. Working style — this matters as much as the code

These were learned the hard way in the last session.

**Change only what was asked.** If the request names one component, the diff
touches only that component. Do not extend a tweak to neighbouring elements and
do not "fix" adjacent things you judge to be wrong — say so and let them
decide. When scope is ambiguous, take the narrowest reading. **Their
screenshots define the scope:** whatever is framed is what they mean.

**Professional, never gamified.** An elaborate 3D scroll system — pinned
sections, tumbling words, cards flipping through the air — was fully built and
then rejected as "too cheesy." Restraint wins. Fade-and-rise reveals, subtle
parallax, per-element entrance animations. If they ask for something ambitious
and motion-heavy, build it, but keep the diff contained so it can be reverted
cleanly, and say up front that big scroll effects often read differently in
motion than on paper.

**Copy, don't invent.** When something should match the app, go read the app's
source and port the real numbers and formulas. Approximating and hoping it
looks close has been explicitly called out.

**Plain language.** Explain jargon the first time or avoid it — "CTA" and
"scroll beat" both needed explaining. Short, conversational replies.

**Recommend with reasons.** They accept pushback that comes with a "because."
Give a specific recommendation and the tradeoff, then let them redirect.

**Respect planning mode.** When they say they are only planning, stay in
discussion until they say go. When they do say go, build the real thing rather
than a throwaway gray-box.

---

## 8. Open threads

- **The film** — the whole of §6.
- **Mobile pass** — the responsive rules exist but have not been checked on a
  real phone.
- **Role chips go nowhere** — deliberate. They are `<button>` elements already,
  so wiring destinations later is just adding hrefs.
- **Leasing card data** — the three tabs show 11 / 18 / 14 expiring. The
  Jan–Apr total of 11 matches the figure the card originally carried; the other
  two were built to be plausible. Swap in real numbers when they exist.
- **No shadows anywhere** — every text-shadow and drop-shadow was removed at
  the user's request. Only the thin inset white highlight on glass remains. If
  legibility over bright sky becomes a problem, that is the first thing to
  revisit, and it should be raised rather than silently re-added.
