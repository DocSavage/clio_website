# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — dev server on https://localhost:3001 (HTTPS is forced via `.env`).
- `npm run build` — production build into `build/`.
- `npm test` — Jest in watch mode. Tests live next to sources as `*.test.js` (see `src/**/*.test.js`). Run a single test with `npm test -- --watchAll=false -t "<test name>"` or by path, e.g. `npm test -- src/utils/neuroglancer.test.js`. Set `CI=true` to disable watch mode.
- `npm run lint` — ESLint over `src/**/*.{js,jsx}` (airbnb + airbnb/hooks + react/recommended via `.eslintrc`).
- `npm run deploy` / `npm run deploy:dev` — builds, then `gsutil rsync` to `gs://clio.janelia.org` or `gs://clio-dev.janelia.org` and sets `Cache-Control: no-cache, max-age=0` on `index.html`. Requires `gsutil` on PATH.

All Node scripts run with `--openssl-legacy-provider` because the ejected Webpack 4 toolchain needs legacy OpenSSL — do not remove that flag without also updating the build pipeline.

### Local dev OAuth gotcha

Google OAuth redirects must match a registered origin. Alias `clio-dev.janelia.org` → `127.0.0.1` in `/etc/hosts` and hit https://clio-dev.janelia.org:3001 instead of localhost, or login will fail.

## Architecture

This is an **ejected Create React App** (React 16) — the actual Webpack, Jest, Babel, and dev-server config lives under `config/` and `scripts/`, not in node_modules. Changes to build behavior go there.

### Runtime shape

`src/index.js` wraps `<App/>` in a `redux` `Provider` and a `react-query` `QueryClientProvider`. `App.js` is the top-level router:

- If no Google user is in Redux, it renders `UnauthenticatedApp` for every route.
- Otherwise it mounts a `<Navbar/>` plus a `<Router>` whose non-root routes (`/settings`, `/help`, `/api/docs`, `/users`, `/auth_test`, `/ws/:ws`) are all lazy-loaded via `React.lazy` + `Suspense`.
- The core of the app is `/ws/:ws` → `src/WorkSpaces.jsx`. It switches on the path param to mount one of six plugins: `image_search`, `annotate`, `atlas`, `focused_proofreading`, `orphan_link`, `body_review`. Each plugin receives `react-neuroglancer` as a child and interacts with it through Redux.

### Backend and dataset loading

`src/config.js` defines the clio-store base URLs (`projectBaseUrlDefault` = prod, `projectBaseUrlTest` = test, both Google Cloud Run) and the Google OAuth client_id. The active URL is kept in the Redux `clio` slice as `projectUrl`; on login, `App.js` fetches `${projectUrl}/datasets` with the user's bearer token and pipes the response through `utils/config.js::expandDatasets` (which flattens per-version dataset entries and unescapes shader strings) before threading `datasets` down to `Navbar` and the active workspace.

### State management

Redux store is assembled in `src/store.js` with `redux-thunk`. `reducers/index.js` combines five slices:

- `user` — Google login state and roles.
- `viewer` — Neuroglancer viewer state (large; drives what the embedded NG component renders). Actions live in `src/actions/viewer.js` and are bundled into a giant `actions` prop by `WorkSpaces.jsx` so plugins don't need their own `connect`.
- `clio` — holds `projectUrl` (Immutable.Map). Only this slice is persisted.
- `alerts` — snackbar queue surfaced by `Alerts.jsx`.
- `connectionsPanel` — state for the NeuPrint connectivity side panel.

Persistence: `store.js` subscribes with a 1s `lodash/throttle` and saves `{ clio }` to `localStorage` under `clio_web_state` via `utils/storage.js`. Only the `clio` slice round-trips — do not add other slices to this subscription without understanding why (e.g. `user` is separately re-hydrated from `localStorage.user` in `App.js`).

### Auth bridge to Neuroglancer

`App.js` writes `window.neurohub.clio.auth.getAuthResponse` from the stored user token. **Our Neuroglancer fork reads this global to authenticate against clio-store.** Renaming the global or removing the write will silently break auth for every embedded viewer. The comment in `App.js` flags this; preserve it.

### Annotations layer

`src/Annotation/` is where most of the domain logic lives: annotation tables, merges (local vs cloud backends in `MergeBackendLocal.js` / `MergeBackendCloud.js` with `MergeManager.js` coordinating), import/export, and the panel UI. `src/Annotate.jsx` is the workspace that stitches these together with the Neuroglancer viewer and the NeuPrint connections panel.

### Telemetry

`REACT_APP_REPORTS=true` in `.env` enables a POST to `${defaultProd}/site-reports` whenever a user ends up on a non-standard `projectUrl` — used to catch stale or misconfigured test endpoints in the wild. Disable by unsetting the env var.

## Conventions

- ESLint extends airbnb; `.prettierrc` sets `printWidth: 100`, single quotes, trailing commas, always-parens on arrows. Keep JSX in `.jsx`; plain modules in `.js`.
- Redux state uses `immutable` `Map`s in the `clio` and `viewer`/`user` slices — access with `.get('key')`, not dot notation.
- Plugins under `/ws/:ws` do not own the Neuroglancer component; they receive it as `children` from `WorkSpaces.jsx` and mutate viewer state exclusively through the dispatched actions passed down.
