# Host brand icons

Drop the host brand icons in this folder using these exact filenames. They are
referenced by `src/data/mockData.ts` via `iconUrl` and render automatically in
the **Select File Hosts** cards and the **Progress** sidebar. Until a file is
present, the UI falls back to a colored 2-letter badge.

| Host        | Expected file                |
| ----------- | ---------------------------- |
| Keep2Share  | `keep2share.png`             |
| FileBoom    | `fileboom.png`               |
| FileJoker   | `filejoker.png`              |
| Rapidgator  | `rapidgator.png`             |
| ImageTwist  | `imagetwist.png`             |
| PixHost     | `pixhost.png`                |

Notes:
- `.png` (transparent), `.svg`, or `.webp` all work — if you use a different
  extension, update the matching `iconUrl` in `src/data/mockData.ts`.
- Square icons (e.g. 64×64 or larger) look best; they are scaled to fit and
  centered with `object-contain`.
