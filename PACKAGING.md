# Packaging Host Post Builder as a Windows `.exe`

The app ships as an **Electron desktop application**: the Node backend
(`backend/server.mjs`) serves the built React UI (`dist/`) on a local port, and
Electron opens a desktop window pointed at it. `electron-builder` packages the
whole thing (Electron + Node backend + UI) into a Windows installer and a
single portable `.exe`.

## Prerequisites

- **Node.js 18+** and npm.
- Build the Windows artifacts **on Windows** (recommended). Cross-building from
  macOS/Linux is possible but requires Wine + Mono for the NSIS installer, so
  Windows is the path of least resistance.
- The media tools the pipeline shells out to:
  - `MediaInfo.exe`
  - `mtn.exe` (MovieThumbnailer)

  Place them where `backend/config.example.json` expects:

  ```
  backend/vendor/tools/MediaInfo/MediaInfo.exe
  backend/vendor/tools/MTN/mtn.exe
  ```

  Because the build bundles `backend/**`, anything under `backend/vendor/` is
  included in the packaged app automatically. (Adjust paths in a
  `backend/config.json` if you keep them elsewhere.)

## Build

From the project root:

```bash
npm install
npm run dist:win
```

This runs `npm run build` (TypeScript + Vite → `dist/`) and then
`electron-builder --win`. Output lands in `release/`:

- `HostPostBuilder-<version>-x64.exe` — NSIS **installer** (choose install dir).
- `HostPostBuilder-<version>-portable.exe` — **single double-clickable** file,
  no install required.

Other targets:

```bash
npm run dist:linux   # AppImage (Linux)
npm run dist:dir     # unpacked app folder (no installer) — fast sanity check
```

## Running it

- **Packaged app:** double-click the portable `.exe` (or install via the NSIS
  installer). The backend starts automatically and the desktop window opens.
- **Without packaging (dev):**
  - `npm run app` — builds `dist/` and opens the Electron window.
  - `npm start` — builds `dist/` and runs just the backend; open
    `http://localhost:8792` in a browser.
  - `npm run dev` + `npm run backend` — hot-reloading frontend (Vite proxies
    `/api` to the backend on `:8792`).

## Credentials & settings

Host credentials and MTN settings are saved by the backend via
`POST /api/settings` into `backend/settings.json` (next to the executable in the
packaged app). PixHost needs no credentials; Keep2Share/FileBoom, Rapidgator,
FileJoker, and ImageTwist require real accounts.

## How it fits together

```
electron/main.cjs      ← starts backend (Electron's Node), opens the window
backend/server.mjs     ← JSON API + serves the built React UI (dist/)
dist/                  ← Vite production build of the React app
backend/vendor/tools/  ← MediaInfo.exe + mtn.exe (you provide these)
```

`electron-builder` configuration lives under the `build` key in `package.json`.
`asar` is disabled so the bundled `.mjs` backend and tools are plain files on
disk (simplest for spawning Node and shelling out to the media tools).
