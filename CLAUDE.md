# CLAUDE.md — SCW Shield Knack Custom JS

## Project Overview

Custom JavaScript bundle for the **SCW Shield** Knack application —
`scwinstallation.knack.com/scw-shield`, app id `5f22c26cce3ffc001555f64b`.
Shield covers monitoring: companies, sites, remote guarding, call lists,
subscriptions and system health checks.

The bundle is concatenated (not transpiled), minified with esbuild, and served
via **jsDelivr** from this repo. **The repo must stay public** — jsDelivr's
`/gh/` endpoint has no auth path for private repos.

## ⚠️ This is NOT the only SCW Knack bundle

The installation-services app (`scwinstallation.knack.com/installationservices`)
has its own, much larger bundle at
**github.com/mitzvetsia/scw-knack-custom-js**.

Knack allocates `view_`, `scene_`, `field_` and `object_` ids **per
application**. Shield's `view_511` is "View Company Details"; the same id in the
installation app is something unrelated. The two bundles are therefore not
interchangeable, and neither may be loaded into the other's app.

`SCW.appOk()` in `src/config.js` enforces this: it compares
`Knack.application_id` against `SCW.APP_ID` and stands every feature down, with
one loud console error, on a mismatch. **Every feature must call it before
binding.** It fails open when `application_id` isn't populated yet (very early
boot) so a genuine Shield page is never blocked, and closed on a real mismatch.

Code that is genuinely app-agnostic (`util.js` binding helpers, build scripts)
is duplicated between the repos on purpose. If a third app ever appears,
extract a shared core then — not before.

## Repository Structure

```
src/
  config.js                   # SCW namespace, APP_ID + appOk() guard, webhook URLs
  util.js                     # SCW.onViewRender / onSceneRender / currentUser / esc
  features/
    esig-contracts.js         # eSignatures MSA + Covered Location Form strip
    page-polish.js            # per-scene typography, spacing and table styling
knack-snippets/
  loader.snippet.js           # goes in the Builder JS panel — NOT in the bundle
tests/
  esig-contracts/             # jsdom smoke tests against real captured markup
build.sh                      # cat src/ → esbuild --minify → dist/shield-bundle.js
save.sh "msg"                 # build → commit → push → purge + warm jsDelivr
dist/shield-bundle.js         # built artifact (committed — jsDelivr serves it)
```

## Loading the bundle into Knack

Knack Builder → Settings → API & Code → **JavaScript** takes **JavaScript, not
HTML**. A `<script src="…">` tag pasted there is a syntax error and silently
kills every script on the page. Use `knack-snippets/loader.snippet.js`, which
creates the element in JS. Bump its `SHA` and re-paste to move to a new build.

## Build and deploy

| Command | What it does |
|---|---|
| `bash build.sh` | Concatenates `src/` into `dist/shield-bundle.js` |
| `bash save.sh "message"` | Builds, commits, pushes, then purges and pre-warms the jsDelivr edge for the new SHA |

**Build order matters.** `build.sh` lists every source file explicitly.
`config.js` and `util.js` come first; every feature depends on `SCW.CONFIG` and
`SCW.onViewRender`. Adding a feature means adding its file to that list.

**No release step is needed to test.** jsDelivr serves any git ref, including a
raw commit SHA, so the moment you push a commit containing a rebuilt `dist/`,
that exact build is live:

```
https://cdn.jsdelivr.net/gh/mitzvetsia/scw-shield-knack-js@<commit-sha>/dist/shield-bundle.js
```

Pin the Knack loader to the SHA. A SHA URL is immutable, so there is no cache
staleness between builds. Never tell the user a change "won't take effect until
a release" — rebuild, push, done.

## Conventions

- **IIFE per feature**, `'use strict'`, `CONFIG`/`LEVELS` constant at the top.
  Keep logic generic and config specific: change behaviour by editing the config
  block, not the core.
- **Bind via `SCW.onViewRender(viewId, handler, ns)`** / `onSceneRender`, never
  raw jQuery `.on()`. Both dedupe and carry a catch-up poller for the case where
  the bundle parses after Knack has already rendered.
- **Namespaced events** (`.scwEsigContracts`) and `off().on()` so a re-render
  can't double-bind.
- **Idempotent render.** Knack re-renders the whole view after an inline edit.
  Remove your own nodes before re-inserting them.
- **CSS injection** with a unique `STYLE_ID`, bailing if it already exists.
- **ES5-friendly** (`var`, `function`). jQuery `$` is global, provided by Knack.
- **Escape everything** you inject through `SCW.esc` — it all carries record data.
- **Button order**: destructive first, primary rightmost (Cancel | Send).
- **Read record data from the rendered DOM**, not the Knack REST API. See
  Security below. ⚠️ Views set to **label-none** (which `view_511` is) render
  fields as `<div class="field_600">` with **no `kn-detail` class**, so a
  selector must fall back to the bare `.field_XXX` class. `detailCell()` in
  `esig-contracts.js` is the reference; `tests/esig-contracts/` pins it against
  real captured markup.

## Knack reference — the objects this app's features touch

| Object | Name | Notes |
|---|---|---|
| `object_26` | GLOBAL: COMPANY | `field_208` name, `field_333` Monitoring Type, `field_600` MSA ID, `field_601` Signed MSA |
| `object_27` | REMOTE GUARDING: SERVICE | per-site; `field_209` name, `field_210` address, `field_226` cameras, `field_231` → company, `field_334` Monitoring Type, `field_319` STATUS |
| `object_29` | Monitored GG Callees | call list: name, email, phone, **password**, call-tree order 1–7 |
| `object_24/25` | Subscriptions / line items | where fees live — `field_194` per-license price, `field_198` monthly total |

Scenes: `scene_185` remote-monitoring (company list), `scene_187`
view-company-details (`view_511` details + `view_512` sites table).

## Styling other people's scenes

`page-polish.js` restyles Knack's own markup. Every rule it writes is
prefixed with a scene id from its `SCENES` list, because Knack reuses the same
classes (`.kn-table`, `.kn-detail-body`, `.kn-title`) on every view in the app —
an unscoped rule would reach scenes nobody reviewed. Adopt a scene by adding it
to that list, never by dropping the prefix.

## Security & external services

- **No API keys in this bundle, ever.** It is public twice over: the repo must
  be public for jsDelivr, and the bundle is downloaded by every browser that
  loads the app. The eSignatures key lives in Make, server-side.
- **Make webhook URLs in `config.js` are unauthenticated write endpoints.**
  Hiding them is not possible — the browser has to know them. Defend in the Make
  scenario instead: verify the Knack record exists, check the signer against a
  contact on that record, and be idempotent so a replay or double-click cannot
  create a second contract. `src/config.js` carries the full note.
- **`scriptProtectionEnabled` is true on this app.** Worth understanding before
  debugging a loader problem.

## Working on this repo

This is a copy-paste-and-modify codebase, not a design space. There is no
linter and no type system, and features are ultimately verified against the live
app — but `tests/` holds plain-node jsdom smoke tests built from real captured
markup (`node tests/esig-contracts/test-render.js`, after `cd tests && npm
install`). Add one next to anything you change there and keep them green. Bias
toward producing a diff:

1. Copy the nearest existing feature and match its layout, naming and event
   namespacing. Do not redesign the module shape.
2. Commit to one approach before writing. Pick the smallest diff.
3. Rebuild (`bash build.sh`) after any source change — a stale `dist/` means the
   SHA you push does not contain your change.
4. When stuck, ship the smaller version behind the same config shape.

Do not `Read dist/shield-bundle.js` in full — it is a `cat` of `src/` with
nothing new in it. Grep it with a path filter if you must verify a build.
