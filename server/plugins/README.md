# Filehost plugins (bundled)

These are the server-side upload plugins used by the UPtool backend bridge.
Each file is self-contained and loaded automatically from this directory.

| Plugin | Host | Credentials (any one path) |
| ------ | ---- | -------------------------- |
| `rapidgator.plugin.mjs` | Rapidgator | `token` **or** `username` + `password` [+ `twoFactorCode`] [+ `folderId`] |
| `keep2share.plugin.mjs` | Keep2Share | `accessToken` **or** `authToken` **or** `username` + `password` [+ `recaptchaResponse`] |
| `fileboom.plugin.mjs` | FileBoom | Same as Keep2Share |
| `filejoker.plugin.mjs` | FileJoker | `cookie` **or** `email`/`username` + `password` |

## Environment variables

Set on the server (recommended) using `<HOSTID>_<FIELD>`:

```bash
RAPIDGATOR_TOKEN=...
KEEP2SHARE_USERNAME=...
KEEP2SHARE_PASSWORD=...
FILEBOOM_AUTHTOKEN=...
FILEJOKER_EMAIL=...
FILEJOKER_PASSWORD=...
```

See `.env.example` at the repo root.

## Run

```bash
npm run server      # loads this folder by default
npm run dev:all     # web + API together
```

For automated tests without real accounts, `server/e2e.mjs` uses `server/sample-plugins/echo.plugin.mjs` instead.
