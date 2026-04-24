# AGENTS.md

Guidance for coding agents working in this repository.

## Working Commands

- `npm start` runs the HTTPS dev server on `https://localhost:3001`.
- `npm run build` produces the production build in `build/`.
- `npm test -- --watchAll=false` runs the full Jest suite once.
- `npm test -- --watchAll=false src/actions/user.test.js` runs the DSG auth tests.
- `npm run lint` runs ESLint over `src/**/*.{js,jsx}`.
- Build/start scripts use `--openssl-legacy-provider` because this is an ejected CRA/Webpack 4 app. Do not remove it unless the build pipeline is upgraded.
- Local auth redirects may require mapping `clio-dev.janelia.org` to `127.0.0.1` and using `https://clio-dev.janelia.org:3001` instead of localhost.

## Application Shape

- This is an ejected Create React App using React 16, Redux, Redux Thunk, React Query, Material UI v4, and an embedded `@janelia-flyem/react-neuroglancer` viewer.
- `src/index.js` wraps `<App />` in Redux and React Query providers.
- `src/App.js` owns top-level routing, session rehydration, dataset loading, telemetry, and the logged-in/logged-out split.
- `src/WorkSpaces.jsx` switches `/ws/:ws` between `image_search`, `annotate`, `atlas`, `focused_proofreading`, `orphan_link`, and `body_review`.
- Workspaces receive the Neuroglancer component as `children` and mutate viewer state through the `actions` prop assembled from `src/actions/viewer.js`.
- Redux slices are assembled in `src/reducers/index.js`: `user`, `viewer`, `clio`, `alerts`, and `connectionsPanel`.
- Several Redux slices use Immutable Maps. Use `.get('key')` rather than dot access when reading them.
- `store.js` persists only the `clio` slice under `localStorage.clio_web_state`. Do not add other slices to this persisted state casually.

## DSG Auth Strategy

The `master` branch strategy is full replacement with DatasetGateway (DSG), not dual-mode Google Sign-In fallback.

- Do not reintroduce Google Sign-In / GIS fallback unless explicitly asked.
- `GoogleSignIn.jsx` is a legacy filename, but currently acts as the DSG login/logout button.
- Login redirects the browser to clio-store `/login?redirect=<current-url>`, which delegates to DSG and returns with an HttpOnly `dsg_token` cookie.
- `loginDSGUser()` in `src/actions/user.js` calls top-level `/profile` with `credentials: 'include'` to validate the DSG cookie.
- Auth routes live at the clio-store root, not under `/v2`; use `authBaseFromProjectUrl()` from `src/utils/auth.js` to strip a trailing `/v2`.
- After `/profile`, `loginDSGUser()` calls `${projectUrl}/server/token` with `method: 'POST'` and `credentials: 'include'` to obtain a DSG-issued clio-store bearer token.
- That token is cached in `localStorage.user` for the matching profile email to avoid creating a new DSG APIKey row on every reload.
- `logoutDSGUser()` clears local user state and redirects to clio-store `/logout?redirect=<origin>`.
- The Redux field is still named `googleUser` for historical reasons. In DSG mode it stores `{ token, info }`, where `token` is the DSG-issued clio-store bearer token.

## Token Invariants

- Treat `user.token` as the app's clio-store bearer token. It is not a Google OAuth access token.
- Dataset loading in `App.js` uses `Authorization: Bearer ${user.token}` against `${projectUrl}/datasets`.
- `image_search`, `atlas`, annotations, merge storage, neuPrint queries, user admin, and saved searches all use `user.token` against clio-store endpoints.
- `setUserRoles()` calls `${projectUrl}/roles` with `credentials: 'include'` and the bearer token.
- `REACT_APP_REPORTS` telemetry should also use `user.token`; do not call `user.getAuthResponse()` on the Redux user object.
- `AuthTest.jsx` is the only direct Google API example found; it fetches `www.googleapis.com` / GCS with `user.token`, which will not work with a DSG-only clio-store token unless that endpoint accepts it. Treat this page as legacy/test-only unless product requirements say otherwise.
- There is no Firebase or Firestore client usage in the current source tree.
- Private `gs://` Neuroglancer data may still require separate Google auth depending on deployment, but this app currently does not request or pass a Google access token for that.

## Neuroglancer Auth Bridge

The embedded Neuroglancer fork depends on a global auth bridge.

- `loginDSGUser()` installs `window.neurohub.clio.auth.getAuthResponse()`.
- That function returns `{ id_token: user.token }` even though the token is DSG-issued. Preserve this shape because the Neuroglancer fork reads it.
- Do not rename, remove, or delay installing `window.neurohub.clio.auth` without checking every embedded viewer path.
- `clio://...?...auth=neurohub` URLs in annotate, atlas, and image search rely on this bridge.
- Tests in `src/actions/user.test.js` explicitly cover bridge installation and cached-token reuse.

## DSG Tests

- Keep DSG tests focused on the `master` branch behavior, not the older `dsg-auth` branch dual-mode reducer fields.
- Useful DSG regression cases:
  - `/profile` is called at the auth base URL with `credentials: 'include'`.
  - `/server/token` is called under `projectUrl`.
  - roles are fetched with both credentials and bearer authorization.
  - cached user tokens are reused when the profile email matches.
  - invalid `/profile` responses clear stale cached users.
  - the Neuroglancer bridge returns the current bearer token.
- Run `npm test -- --watchAll=false src/actions/user.test.js` after auth changes.

## Commit Protocol

- Follow the shared user-level commit protocol in `/Users/katzw/GitHub/AGENTS.md`.
- For this repository, run `npm test -- --watchAll=false` before committing when feasible.

## Branch Context

`BranchComparison.md` records the split between `master` and `dsg-auth`.

- `master` is DSG-only full replacement.
- `dsg-auth` kept Google fallback and added `authMethod` / `dsgAvailable` reducer state.
- Do not copy `dsg-auth` tests verbatim into `master`; adapt or write tests for the actual DSG-only flow.
- Jody's `dsg-auth` commit `056cbd6` removed newer syntax for compatibility. Follow the same conservative style in new code.

## Coding Style And Compatibility

- This project uses an older React 16 / ejected CRA toolchain. Avoid modern JavaScript syntax that the configured Babel/Jest/Webpack stack may not parse.
- Avoid optional chaining (`?.`) and nullish coalescing (`??`) in new or modified code. Prefer explicit guards like `user && user.info && user.info.email`.
- Be cautious with newer object syntax in DSG-related changes. Prefer explicit assignments or `Object.assign()` when compatibility is uncertain.
- Do not use React APIs newer than React 16.
- Keep JSX in `.jsx` files and plain modules in `.js` files, matching nearby files.
- ESLint extends Airbnb plus React hooks rules. `.prettierrc` uses single quotes, trailing commas, always-parens on arrows, and `printWidth: 100`.
- Keep comments short and only where they preserve non-obvious invariants, especially auth and Neuroglancer bridge behavior.

## Operational Notes

- If dependencies are missing, `npm ci` may require network access. In restricted environments, request approval rather than trying to work around registry failures.
- `node_modules/` is ignored and should not be committed.
- `npm audit` currently reports many issues due to the old dependency tree. Do not run broad dependency upgrades unless explicitly asked; they are likely to affect the ejected CRA/Webpack setup.
- Preserve user work in a dirty tree. Do not revert unrelated changes.
