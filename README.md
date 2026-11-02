# One More, Three Ways

Compare one new top with three outfits you already own, approve combinations you like, and filter the shortlist by budget.

This prototype includes **three real YouCam Clothes V3 upper-body outputs** from an authorized trial on November 2, 2026. The default recorded-result demo is a **saved replay**, with no new API requests, credentials or generation charges. All people and apparel inputs are synthetic, and prices are invented. This repository is published for review and evaluation; a contest submission has not yet been confirmed.

## Run the recorded-result demo

Requires Node.js 24 or later. From this repository:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run replay
```

Open **http://127.0.0.1:4176**. Stop with Ctrl+C. If npm does not start in your environment, run `node scripts/build.mjs` and then `node server/replay.mjs` with Node 24. No YouCam account, key, Vault, database setup or external image hosting is needed.

The UI says **SAVED API REPLAY · NO NEW CALLS**. Inspect the reference shirt, toggle all three original/result pairs, approve two or three combinations, change the budget and reload. A candidate needs at least two approvals and must fit the budget. The invented $48 shirt scores $24 for two approved outfits or $16 for three. This is a comparison score, not cost per wear or a fit prediction.

## Watch the actual UI demonstration

[English-captioned real UI demo — 2 minutes 10 seconds](demo/recorded-replay-demo.mp4) · [caption source](demo/captions.en.ass) · [English transcript](demo/transcript.en.md)

The video records actual operation of this local app with the saved API results. It is silent, with burned-in English captions and a persistent replay disclosure. Idle time and corrected keyboard gestures were cut; the retained footage is not sped up. It is not a live generation recording. No private account pages or unrelated app windows are included.

## Real API evidence and limitations

The trial uploaded three synthetic adult wardrobe images and one Ivory shirt reference through the official File API, then completed three Clothes V3 `upper_body` generation requests. The three downloaded 1024 × 1536 results are included. Inputs did not need public image hosting. Estimated total: **6 units; actual billed consumption remains unverified**.

Lower garments and shoes appear recognizable on visual inspection. Collar, sleeves, hem, placket and button placement differ from the reference, particularly neckline details in the skirt case. Exact garment construction, physical fit, identity or pixel preservation are not certified. Human quality approval for a larger nine-combination trial remains pending. The other six real combinations have not been generated.

The separate nine-pair SVG mock (`npm run dev`, port 4173) and fabricated-response fixtures are labeled separately and are not evidence of additional API outputs. The server-only live adapter is included for inspection, but is not started by the replay and must not be run without separately reviewed credentials, input rights and spending authorization.

## Verification

Build before the first full check because HTTP tests expect the compiled client:

```sh
node scripts/build.mjs
node --test test/*.test.mjs
node test/security.mjs
```

The public snapshot passes 33 automated tests, the client build and credential-boundary checks. [Actual GUI verification](docs/GUI_VERIFICATION.md) also covered three comparisons, approval/ranking, budget boundaries, invalid input and reload persistence. These checks do not establish API service reliability or product fidelity.

See [judge instructions](docs/JUDGE_TESTING.md), [quality review](docs/REPLAY_REVIEW_2026-11-02.md), [trial evidence](docs/FIRST_LIVE_TEST_RESULT_2026-11-02.md), [submission draft](docs/SUBMISSION_DRAFT.md), [asset provenance](ASSET_PROVENANCE.md), [rights notice](RIGHTS.md), [dependency notices](docs/THIRD_PARTY_NOTICES.txt), [release audit](docs/RELEASE_AUDIT.md), and [the complete public file list](PUBLIC_FILES.txt).

AI assistance was used for code, documentation and synthetic input creation. The entrant remains responsible for final eligibility, rights and submission review. This prototype makes no claim about actual wear frequency, environmental impact or medical benefit.
