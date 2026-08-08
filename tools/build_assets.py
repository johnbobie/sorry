"""Turn the three photos John sent into web assets.

The drawings themselves are never redrawn - we only lift the ink off its
background so John and Ares can move around on their own, and cut the dotted
paper down to a tile that repeats without a seam.
"""
import os
from PIL import Image, ImageFilter
import numpy as np

SRC = "/root/.claude/uploads/6116861e-4634-5bb1-bfc7-416003ada66b/"
FIGURES = SRC + "478f45a8-D45D9895EC1C4E87982E760F6EBDD488.png"
LETTER = SRC + "0ea42f5f-IMG_1483.jpeg"
PAPER = SRC + "a25cf163-IMG_1487.jpeg"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")

INK = (30, 27, 26)          # soft near-black, reads like pen on paper
LO, HI = 10.0, 70.0         # high-pass range that maps stroke -> alpha


def lift_ink(path):
    """Return a float alpha map: 1 where the pen is, 0 on the background.

    The source has a blurry grey vignette behind the strokes, so a flat
    threshold would eat the dark corners. Subtracting a heavily blurred copy
    keeps only the high-frequency pen work and ignores the gradient entirely.
    """
    grey = Image.open(path).convert("L")
    flat = np.asarray(grey).astype(np.float32)
    blurred = np.asarray(grey.filter(ImageFilter.GaussianBlur(24))).astype(np.float32)
    return np.clip((blurred - flat - LO) / (HI - LO), 0.0, 1.0)


def cut(alpha, box, path):
    x0, y0, x1, y1 = box
    a = alpha[y0:y1, x0:x1]
    h, w = a.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[..., 0], rgba[..., 1], rgba[..., 2] = INK
    rgba[..., 3] = (a * 255).round().astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(path, optimize=True)
    print("%-22s %dx%d  %.1f KB" % (os.path.basename(path), w, h, os.path.getsize(path) / 1024))


def build_figures():
    alpha = lift_ink(FIGURES)
    # Both share one vertical window so their feet land on the same ground line
    # and their drawn size relative to each other is untouched.
    cut(alpha, (274, 123, 570, 944), os.path.join(OUT, "john.png"))
    cut(alpha, (930, 123, 1198, 944), os.path.join(OUT, "ares.png"))


def build_paper():
    """Cut one 4x4 cell of the dot grid, offset half a cell so no dot is
    clipped by the tile edge, then flatten the paper's vignette so repeats
    don't band."""
    period = 58.5
    size = int(round(period * 4))                     # 234px = exactly 4 cells
    x0, y0 = 263, 381                                 # half-cell off a dot centre
    tile = Image.open(PAPER).convert("L").crop((x0, y0, x0 + size, y0 + size))

    a = np.asarray(tile).astype(np.float32)
    field = np.asarray(tile.filter(ImageFilter.GaussianBlur(30))).astype(np.float32)
    flat = np.clip(a / np.maximum(field, 1.0) * 252.0, 0, 255)   # flat-field correction

    rgb = np.repeat(flat.round().astype(np.uint8)[..., None], 3, axis=2)
    # warm the paper very slightly so it isn't clinical white
    rgb[..., 2] = (rgb[..., 2].astype(np.int16) - 3).clip(0, 255).astype(np.uint8)
    out = os.path.join(OUT, "paper-tile.png")
    Image.fromarray(rgb, "RGB").save(out, optimize=True)
    print("%-22s %dx%d  %.1f KB" % ("paper-tile.png", size, size, os.path.getsize(out) / 1024))


def build_letter():
    im = Image.open(LETTER).convert("RGB")
    if im.width > 1600:
        im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    out = os.path.join(OUT, "letter.jpg")
    im.save(out, "JPEG", quality=84, optimize=True, progressive=True)
    print("%-22s %dx%d  %.1f KB" % ("letter.jpg", im.width, im.height, os.path.getsize(out) / 1024))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    build_figures()
    build_paper()
    build_letter()
