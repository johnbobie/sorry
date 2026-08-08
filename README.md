# for Ares

A small scroll-told story that ends in a handwritten letter.

Open `index.html` — no build step, no dependencies, no network calls.

## The story

1. **The front page** asks you to scroll down.
2. **This is John.** He pops onto the stage.
3. **And this is Ares.** He joins him.
4. **John wants to say sorry** — for not answering him.
5. **John leaves.** He walks all the way out of frame, because that's what he does when he gets scared.
6. **From off-stage he says it anyway:** he's really sorry, and he built this whole website to say so.
7. **He comes back.**
8. **The envelope.** Tap it — the flap swings open, the letter rises out, and the real handwritten letter opens up to read.

## The drawings

Everything visual comes from three photos, used as-is rather than redrawn:

| File | Where it came from |
| --- | --- |
| `assets/john.png`, `assets/ares.png` | The two stick figures, cut apart and lifted off their grey background so they can move independently |
| `assets/paper-tile.png` | One 4×4 cell of the dotted paper, cut so it repeats without a seam |
| `assets/letter.jpg` | The handwritten letter, resized for the web |

`tools/build_assets.py` regenerates all four from the originals (needs `pillow` and `numpy`).

The strokes themselves are never touched. To free the figures from their grey
backdrop, the script subtracts a heavily blurred copy of the image from itself —
that leaves only the high-frequency pen work and ignores the vignette
completely, which a flat brightness threshold could not do without eating the
dark corners.

## Keeping it smooth

- The story is one `position: sticky` stage; seven invisible full-height markers scroll past it and an `IntersectionObserver` reports which one is crossing the middle of the screen. There are **no scroll event handlers** and nothing runs per frame.
- Every animation is `transform` or `opacity` only, so the browser never re-runs layout while you scroll.
- Positional moves and idle wobbles live on separate nested elements, so a transition and a keyframe animation never fight over the same `transform`.
- The letter photo starts downloading once John walks off, so it's ready before anyone reaches the envelope.
- Fonts are two self-hosted latin subsets (~40 KB total), not a third-party request.

Measured on a 390×844 viewport at 4× CPU throttling, scrolling the entire page:
median frame 16.8 ms, worst 23 ms, no frame over 32 ms, no long tasks.

## Other details

- Fully responsive; on phones the figures stand further apart and John's apology moves above Ares so it never covers his face.
- The letter can be zoomed and panned, which is the only way it's readable on a phone.
- `prefers-reduced-motion` is respected — the story still tells itself, it just stops moving.
- The popup traps focus, closes on `Escape` or a click outside, and returns focus where it was.
