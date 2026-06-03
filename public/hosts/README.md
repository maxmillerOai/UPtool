# Host brand icons

This folder holds the host brand icons referenced by `src/data/mockData.ts`
via `iconUrl`. They render automatically in the **Select File Hosts** cards and
the **Progress** sidebar. If a file is missing or fails to load, the UI falls
back to a colored 2-letter badge.

The icons below were generated to match the app's cyber/neon theme. Replace any
of them with your own using the same filename to swap them out.

| Host        | File                 |
| ----------- | -------------------- |
| Keep2Share  | `keep2share.png`     |
| FileBoom    | `fileboom.png`       |
| FileJoker   | `filejoker.png`      |
| Rapidgator  | `rapidgator.png`     |
| ImageTwist  | `imagetwist.png`     |
| PixHost     | `pixhost.png`        |

## Allowed dimensions & format

| Property        | Spec                                                                 |
| --------------- | -------------------------------------------------------------------- |
| Aspect ratio    | **Square (1:1)** required — non-square icons are centered with padding |
| Recommended size| **128 × 128 px** (or 256 × 256 for extra-crisp HiDPI)                |
| Minimum size    | **48 × 48 px** (smaller looks blurry on HiDPI screens)               |
| Maximum size    | **512 × 512 px** (anything larger is wasted — it is scaled down)     |
| Format          | `.png` (transparent bg preferred), `.svg`, or `.webp`                |
| Max file size   | **≈ 80 KB** per icon                                                 |
| Color           | Full color is fine; transparent background recommended               |

The bundled icons are **256 × 256 px** PNGs (~60–75 KB each).

### Where they render (display sizes)

The source icon is scaled down with `object-contain` (never stretched) into:

- **File-host cards** — `28 × 28 px`
- **Progress sidebar** — `20 × 20 px`

A single **128–256 px** square asset covers both render sizes crisply,
including 2× / 3× retina displays. SVGs scale to any size automatically.

### Notes

- If you use a non-`.png` extension, update the matching `iconUrl` in
  `src/data/mockData.ts` (e.g. `/hosts/keep2share.svg`).
- Transparent PNGs/SVGs look best on the dark panels; opaque square icons also
  work and sit inside the rounded icon container.
