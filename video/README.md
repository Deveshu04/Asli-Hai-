# The Asli hai? demo film

A 3 minute 20 second film of the product, made with [Remotion](https://www.remotion.dev). It's a "living UI" film: the real screens are rebuilt in React with the site's own palette and fonts, so the camera can move through them and the buttons can be pressed on screen. Every line on screen is the product's own wording, copied from `web/`, `agents/` and `backend/languages.py`.

The rendered film is in [`media/asli-hai-demo.mp4`](../media/asli-hai-demo.mp4).

| Scene | File | What it shows |
| --- | --- | --- |
| Hook | `src/scenes/Hook.tsx` | The scam call |
| One tap | `src/scenes/Press.tsx` | The home-screen button and the press |
| Two calls at once | `src/scenes/TwoCalls.tsx` | Saathi and the rescue call side by side, with the live event log |
| Every other path | `src/scenes/OtherPaths.tsx` | Police claims, money already sent, a parent still on the scam call, a retry |
| Made for her | `src/scenes/MadeForHer.tsx` | One button, 13 languages, larger text, screen readers, the family's signup |
| Safe by design | `src/scenes/Trust.tsx` | The family word, guardrails, fixed lines, official facts |
| Under the hood | `src/scenes/End.tsx` | The architecture and the end card |

## Build it

```bash
npm i
npx remotion studio
```

`npx remotion studio` opens the editable preview. To render the film:

```bash
npx remotion render AsliHaiFilm out/asli-hai-demo.mp4 --codec=h264 --crf=20 --color-space=bt709
```

To render the README teaser:

```bash
npx remotion render AsliHaiFilm out/asli-hai-teaser.gif --codec=gif --frames=405-645 --every-nth-frame=3 --scale=0.4 --number-of-gif-loops=0 --props='{"sfx":false}'
```

Rendering every Nth frame trips Remotion's audio mixing, so GIF renders switch the sound effects off.

## Keep the wording in sync

```bash
python scripts/extract_copy.py
```

This rewrites `src/data/copy.json` from the product. Run it after changing any user-facing line.

## Review before rendering

```bash
node scripts/contact-sheet.mjs 60 0.3
python scripts/tile.py 60
```

This writes one small frame every 2 seconds into `out/sheet-*.png`, which is enough to spot clipped or overlapping text without a full render.
