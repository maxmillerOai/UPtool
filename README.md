# UPtool · Orbital Uplink Command

A production-grade, **multi-host file uploading platform** wrapped in a futuristic
"AI-controlled spacecraft command center" interface. Built with React + TypeScript +
Vite, it ships with a complete upload engine, queue management, history, analytics,
notifications, theme customization, and a **configuration-driven host layer** so new
upload endpoints can be added without touching application code.

> The platform runs fully out of the box using **simulated** hosts (no network calls).
> Swap in real endpoints whenever you're ready — see [Adding a host](#adding-a-host).

---

## Quick start

```bash
npm install

# Frontend only (simulated hosts, no real uploads):
npm run dev          # http://localhost:5173

# Frontend + backend plugin bridge together (real plugin hosts):
npm run dev:all      # web on :5173, api on :8787 (Vite proxies /api → :8787)
```

Other scripts:

```bash
npm run build      # type-check + production build to dist/
npm run server     # run only the backend plugin bridge (serves dist if built)
npm run preview    # preview the production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
node server/e2e.mjs  # backend integration test (uses the bundled mock plugin)
```

Requires Node 18+ (developed on Node 22).

### Two kinds of hosts

| Kind | Transport | Use for |
| ---- | --------- | ------- |
| **direct** | Browser → host endpoint (XHR) | Simple hosts with a public, CORS-friendly upload API. Also covers the built-in **simulated** demo hosts. |
| **plugin** | Browser → **backend bridge** → host | Authenticated / multi-step host APIs (Rapidgator, Keep2Share, FileJoker, FileBoom, …) that must run server-side with credentials. |

The four built-in hosts are `direct` + `simulated` so the UI is fully usable with
zero setup. Real premium hosts are served as **plugin** hosts via the backend.

---

## Feature overview

**Uploading**
- Drag & drop + multi-file selection
- Concurrency-limited transfer queue (configurable parallel channels)
- Per-file progress, live speed, ETA, and abort
- Automatic retry with configurable attempt limits
- Per-host validation (size limits, accepted types)
- Copy link, open, retry, delete, reassign host

**Command interface**
- **Command** — live dashboard with AI core, throughput graph, transfer radar,
  host health, connection stability, storage donut, global network map, and a
  streaming diagnostics log
- **Uplink** — the holographic drop zone, telemetry strip, and queue
- **Archive** — searchable/filterable upload history with export & bulk copy
- **Hosts** — visual host manager (add / edit / enable / delete)
- **Analytics** — aggregate stats, volume-by-host, payload composition
- **Systems** — settings: themes, visual effects, transfer engine, audio, data

**Platform**
- Persistent state (history, hosts, settings) via `localStorage`
- Notification center + ephemeral toasts
- Procedural WebAudio UI sound effects (no external assets)
- 5 theme presets, particle field, scanlines, reduced-motion mode
- Fully responsive, dark-by-default

---

## Architecture

```
server/                     # 🛰️  backend plugin bridge (Node + Express)
├── index.mjs               #     /api/hosts, /api/upload/:id, SSE progress, env creds
├── pluginLoader.mjs        #     dynamically loads *.plugin.mjs from PLUGINS_DIR
├── sample-plugins/         #     bundled mock plugin (works with zero setup)
│   └── echo.plugin.mjs
└── e2e.mjs                 #     self-contained integration test

src/
├── config/                 # ⚙️  configuration layer (edit these, not core code)
│   ├── hosts.config.ts     #     built-in host definitions  ← add real hosts here
│   ├── themes.config.ts    #     theme presets
│   └── app.config.ts       #     app metadata + default settings
├── types/                  # framework-agnostic domain types
├── lib/                    # pure logic (no React)
│   ├── uploader.ts         #     upload engine: XHR progress, abort, retry, simulate
│   ├── hostRegistry.ts     #     merges builtin + user hosts
│   ├── dotpath.ts          #     reads URLs out of host responses via dot-paths
│   ├── format.ts / id.ts / sound.ts / status.ts
├── store/
│   ├── useStore.ts         # Zustand store: queue, history, hosts, settings, stats
│   └── fileRegistry.ts     # in-memory File/handle registry (non-serializable)
├── hooks/useTelemetry.ts   # synthetic live metrics for the dashboard
├── components/
│   ├── background/         # particle field + layered backdrop
│   ├── ui/                 # Card, Toggle, ProgressRing, CountUp
│   ├── layout/             # Rail (nav), TopBar (command bar)
│   ├── dashboard/          # all dashboard widgets
│   ├── upload/             # DropZone, QueueItem, UploadTelemetry
│   ├── hosts/              # HostForm (add/edit modal)
│   └── system/             # ThemeController, ToastStack
├── views/                  # one component per screen
├── styles/                 # design tokens + modular CSS (effects, layout, widgets…)
├── App.tsx                 # shell + view routing
└── main.tsx                # entry
```

**Separation of concerns**: the upload engine (`lib/uploader.ts`) and host registry
are pure and React-free. The store orchestrates the queue and persistence. Views and
components are presentational. Hosts are **pure data**, so the rest of the app never
hard-codes an endpoint.

---

## Adding a host

You have **two ways** to add a host, neither of which requires editing core/application
code.

### 1. In code (recommended for shared/deployed hosts)

Append to `BUILTIN_HOSTS` in [`src/config/hosts.config.ts`](src/config/hosts.config.ts):

```ts
{
  id: 'my-host',
  name: 'My Host',
  region: 'EU-WEST',
  endpoint: 'https://api.myhost.com/upload',
  method: 'POST',            // or 'PUT' to send the raw file as the body
  fileField: 'file',         // multipart field name (POST only)
  fields: { token: 'PUBLIC_TOKEN' },     // extra multipart fields
  headers: { Authorization: 'Bearer XXX' },
  maxFileSize: 512 * 1024 * 1024,        // bytes (0 / omit = unlimited)
  accept: ['image/*', '.pdf'],           // empty = any
  response: {                            // how to read the result URL
    type: 'json',            // 'json' → read urlPath ; 'text' → body IS the url
    urlPath: 'data.url',     // dot-path, supports arrays: 'files.0.url'
    deletePath: 'data.delete',
    urlPrefix: '',           // prepended to relative URLs
  },
  accent: '#22d3ee',
  enabled: true,
  builtin: true,
}
```

### 2. At runtime (UI)

Open **Hosts → Register Host** and fill in the form (endpoint, method, file field,
response mapping, headers, extra fields, etc.). Runtime hosts are persisted locally and
can override builtin hosts by reusing their `id`.

### How responses are parsed

The `response` mapping is all UPtool needs to extract the resulting link:

| `type`  | behavior                                                            |
| ------- | ------------------------------------------------------------------- |
| `text`  | the response body **is** the URL (optionally prefixed)              |
| `json`  | the URL is read from `urlPath` (a dot-path into the parsed JSON)    |

Dot-paths support nested objects and array indices, e.g. `data.files.0.url`.

### Simulated hosts

A host with `simulated: true` performs a realistic fake transfer (progress, speed, ETA,
occasional retryable failures) and returns a generated URL — no network request is made.
All four built-in hosts ship in simulated mode so the platform is demonstrable
immediately. Flip `simulated` off (or edit the host in the UI) once a real endpoint is
available.

---

## Backend plugin bridge (premium / authenticated hosts)

Some hosts (e.g. **Rapidgator, Keep2Share, FileJoker, FileBoom**) use multi-step,
**authenticated** upload APIs that cannot run in a browser (CORS + credential safety).
For these, UPtool includes a small Node backend that runs server-side **plugins** and
exposes them to the UI. The existing drop zone, queue, and progress UI drive it — only
the transport changes.

### Plugin contract

A plugin is any file named `*.plugin.mjs` that exports:

```js
export const id = 'rapidgator';
export const label = 'Rapidgator';
export const credentialFields = ['token', 'username', 'password', 'twoFactorCode'];

// filePath = absolute path to the file the bridge saved to a temp dir
// credentials = merged env + UI credentials for this host
// onProgress(p) = report progress; p may be {loaded,total}, a fraction, or a percent
export async function upload({ filePath, credentials, onProgress }) {
  // ...do the real upload...
  return { host: id, link: 'https://.../file', plainText: 'https://.../file', raw };
}

export default { id, label, credentialFields, upload };
```

This is exactly the shape of the provided plugins (a thin `*.plugin.mjs` wrapper that
delegates to an `*-api-adapter.mjs`). To use them:

1. Place your plugin folder somewhere on the server and point the bridge at it:
   ```bash
   PLUGINS_DIR=/abs/path/to/plugins/filehosts npm run server
   ```
   (or set `PLUGINS_DIR` in `.env`; see `.env.example`). If unset, the bundled
   **mock** plugin (`echo`) is used so the bridge is testable with zero setup.
2. Start the UI with `npm run dev:all` (dev) — plugin hosts are auto-discovered and
   appear in **Hosts** tagged `PLUGIN`. In production, `npm run build` then
   `npm run server` serves the built UI and the API from the same origin.

### How it flows

```
Browser drop zone
   │  multipart POST  /api/upload/:hostId   (file + credentials)
   ▼
Express bridge ── saves file to temp dir ── plugin.upload({ filePath, credentials, onProgress })
   │                                                   │ onProgress
   │  Server-Sent Events  /api/jobs/:jobId/stream  ◄───┘
   ▼
Browser updates the queue progress, then shows the returned link
```

### Credentials

Each plugin host needs account credentials. Provide them either:

- **Server env vars** (recommended) — keys follow `<HOSTID>_<FIELD>`, e.g.
  `RAPIDGATOR_TOKEN`, `RAPIDGATOR_USERNAME`, `RAPIDGATOR_PASSWORD`,
  `RAPIDGATOR_TWOFACTORCODE`, `RAPIDGATOR_FOLDERID`. See `.env.example`.
- **In the UI** — open **Hosts → (plugin host) → Credentials**. These are stored in the
  browser's `localStorage` and sent with each upload. Request-provided values override
  env defaults.

Secrets are never written to the repo, and the bridge redacts secret-looking fields from
error messages.

---

## Tech stack

- **React 18** + **TypeScript** (strict)
- **Vite 5**
- **Zustand** (state + persistence)
- **Framer Motion** (animation)
- **lucide-react** (icons)
- Pure CSS design system (glassmorphism, neon, holographic surfaces, particles)
- **Node + Express** backend plugin bridge (only needed for `plugin` hosts)

`direct`/`simulated` hosts need no backend. `plugin` hosts (authenticated premium
hosts) are served by the Node bridge in `server/`.
