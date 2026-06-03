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
npm run dev      # start the dev server (http://localhost:5173)
```

Other scripts:

```bash
npm run build      # type-check + production build to dist/
npm run preview    # preview the production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

Requires Node 18+ (developed on Node 22).

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

## Tech stack

- **React 18** + **TypeScript** (strict)
- **Vite 5**
- **Zustand** (state + persistence)
- **Framer Motion** (animation)
- **lucide-react** (icons)
- Pure CSS design system (glassmorphism, neon, holographic surfaces, particles)

No backend is required — uploads go directly from the browser to the configured host
endpoints (CORS permitting).
