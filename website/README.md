# SEM website

The marketing landing page, served by GitHub Pages at
<https://summersorganization.github.io/sem-delivery/website/>.

Plain HTML, CSS and JavaScript — no framework, no build step, no dependencies.
Edit a file, commit, and Pages redeploys it.

## Working on it

Open `index.html` directly in a browser, or serve the folder:

```bash
npx serve -l 4173 .
```

## Files

```
index.html      the whole page
css/styles.css  all styling
js/main.js      backgrounds, reveals, card animations, hover
assets/photos/  bean · skyline · river · boardroom · train
BRIEF.md        design and motion spec — read this before changing the look
```

`BRIEF.md` records why things are the way they are: the copy limits, the glass
material, the per-card animations and where they were ported from. Worth
reading before editing.

## Rules this page keeps

- It is standalone. It never imports from the SEM application or the browser
  demo; it only links to their public URLs. The dashboard cards here are
  rebuilt as marketing visuals with hardcoded numbers.
- Copy claims only what the demo actually does — no payments, no resident
  portal, no full accounting, and no performance or security claims.
- Photography only. Nothing on this page is generated.
