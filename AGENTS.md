# AGENTS.md

## Cursor Cloud specific instructions

UPtool is a **client-only** React + Vite SPA. No backend, database, or Docker services are required for development or E2E testing with built-in **simulated** upload hosts.

### Services

| Service | Command | Port | Required? |
|---------|---------|------|-----------|
| Vite dev server | `npm run dev` | 5173 | Yes (primary dev workflow) |
| Vite preview | `npm run preview` | 4173 (default) | Optional (production build preview) |

Start the dev server in a **tmux** session so it survives backgrounding (e.g. `vite-dev-server`).

### Standard commands

See `README.md` and `package.json` scripts:

- **Install deps:** `npm install`
- **Dev:** `npm run dev` → http://localhost:5173
- **Lint:** `npm run lint` (ESLint, `--max-warnings=0`)
- **Typecheck:** `npm run typecheck`
- **Build:** `npm run build` → `dist/`
- **Tests:** none configured (no `npm test` script)

### Runtime

- **Node.js 18+** (repo developed on Node 22; VM has Node 22 via nvm)
- **Package manager:** npm (`package-lock.json`)

### E2E / hello-world flow

1. Run `npm run dev` and open http://localhost:5173
2. Sidebar → **Uplink**
3. Upload any small file via drop zone or **Select Files**
4. Built-in hosts use `simulated: true` — uploads complete in-browser with no external API
5. **Archive** shows completed transfers

Real upload endpoints require configuring hosts (`src/config/hosts.config.ts` or UI) with `simulated: false` and CORS-enabled APIs.

### Gotchas

- **No automated tests** — validate with lint, typecheck, build, and manual/browser E2E.
- **State persists in `localStorage`** (`uptool.state.v1`) — clear site data if you need a fresh session.
- **Google Fonts** load from CDN in `index.html`; UI works if fonts fail (fallback typography).
