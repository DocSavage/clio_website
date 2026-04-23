# Branch Comparison: `master` vs `dsg-auth`

Both branches diverged from `dcf4e52` (v0.35.23) and attempt to add DSG (DatasetGateway) cookie-based auth — but they took fundamentally different strategies.

## Commits on each side

**`master` (ahead by 2 commits):**
- `792ecd6` feat(auth): integrate DatasetGateway browser-auth flow
- `5a5b85f` modify OAuth2 to new GCP project

**`origin/dsg-auth` (ahead by 3 commits):**
- `3a03333` Add DSG cookie-based auth with Google OAuth fallback (Bill)
- `c4f29b1` Restore emoji indicators in Settings token status (Bill)
- `056cbd6` fix: removes modern object notation (Jody)

## Key philosophical difference

|                           | `master` (recent work)                                                                              | `dsg-auth` (upstream)                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Strategy**              | Full replacement — DSG-only                                                                         | Dual-mode — DSG *or* Google fallback                                                 |
| **Google Sign-In (GIS)**  | Removed entirely                                                                                    | Kept as fallback                                                                     |
| **Login UI**              | LOGIN button redirects to clio-store `/login` → DSG `/authorize` → Google → cookie                  | `checkDsgAuth` probes `/profile`; if DSG available → DSG button; else → Google flow  |
| **Reducer state**         | No new slice fields                                                                                 | Adds `authMethod` + `dsgAvailable`                                                   |
| **Token handling**        | Caches DSG-issued API token in localStorage (reload avoids new APIKey rows)                         | Fetches Bearer token on each session                                                 |
| **Logout**                | Redirect to `/logout?redirect=<origin>`                                                             | Auth-method-aware (routes to Google or DSG logout)                                   |
| **Tests**                 | None                                                                                                | `src/actions/user.test.js` (+151 lines)                                              |
| **Profile page**          | None                                                                                                | New `/profile` page (`Profile.jsx` ~146 lines) + Navbar icon                         |
| **Admin UX**              | `UserAdmin.jsx` treats 501 as DSG mode; Settings links to `/web/my-account` + `/admin/`             | Guards Google-specific displays in Settings only                                     |
| **Helpers**               | New `utils/auth.js` (`authBaseFromProjectUrl`, `normalizeTokenResponse`)                            | None                                                                                 |
| **Config**                | `src/config.js` updated for **new GCP project** OAuth client_id                                     | `src/config.js` minor (1-line) edit                                                  |
| **Docs**                  | Added architecture notes to `CLAUDE.md`                                                             | None                                                                                 |

## File overlap (will collide on merge)

Both sides touch: `App.js`, `GoogleSignIn.jsx`, `Settings.jsx`, `config.js`, `actions/user.js`.

- **Only on `master`:** `UserAdmin.jsx`, `utils/auth.js`, `CLAUDE.md`
- **Only on `dsg-auth`:** `Navbar.jsx`, `Profile.jsx`, `UnauthenticatedApp.jsx`, `reducers/constants.js`, `reducers/user.js`, `actions/user.test.js`

## Bottom line

`master` is a larger, more opinionated rewrite (+312/-149) that commits to DSG and tears out GIS. `dsg-auth` is an incremental layering (+486/-33, but most of that is new Profile + tests) that keeps Google as a fallback path.

Reconciliation requires a decision on the final shape: "DSG-only" (master's vision) or "dual-mode with Profile page and tests" (dsg-auth's vision). Conflicts will concentrate in `App.js`, `GoogleSignIn.jsx`, `Settings.jsx`, and `actions/user.js`.
