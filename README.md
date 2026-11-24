# SCW Shield — Knack custom JS

Custom JavaScript for the **SCW Shield** Knack app
(`scwinstallation.knack.com/scw-shield`).

> **Not the installation-services bundle.** That one lives at
> [scw-knack-custom-js](https://github.com/mitzvetsia/scw-knack-custom-js) and
> targets a different Knack application. Knack ids are allocated per
> application, so the two are not interchangeable — `SCW.appOk()` stands every
> feature down if this bundle is loaded in the wrong app.

## Deploy

```bash
bash save.sh "what changed"
```

Builds, commits, pushes, and pre-warms the CDN. Then pin the Knack loader to the
printed URL:

```
https://cdn.jsdelivr.net/gh/mitzvetsia/scw-shield-knack-js@<sha>/dist/shield-bundle.js
```

jsDelivr serves any git ref, so every push is immediately testable. No release
step. SHA URLs are immutable — no cache staleness.

This repo must stay **public**; jsDelivr's `/gh/` endpoint cannot serve private
repos. Never put an API key in it.

## Features

| File | What it does |
|---|---|
| `src/features/esig-contracts.js` | Contract state + "Create MSA" / "Create Covered Location Form" buttons on the Remote Monitoring pages, wired to Make → eSignatures.com |

See [CLAUDE.md](CLAUDE.md) for conventions, the Knack object map, and the
security notes.
