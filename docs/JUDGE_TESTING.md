# Local evaluation instructions (English)

Updated November 2, 2026. This build replays **three real, completed YouCam Clothes V3 upper-body results**. It does not generate new images during evaluation. All people and apparel inputs are synthetic; prices are invented. The source and included test build are available from this repository; no hosted website or account is required.

## Start the recorded-result demo

Use Node.js 24 or later, then run from the repository root:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run replay
```
If npm waits without starting in your environment, the equivalent commands (verified directly with Node 24) are:

```sh
node scripts/build.mjs
node server/replay.mjs
```


Open `http://127.0.0.1:4176`. No API key, YouCam login, Vault access or payment setup is needed. Stop with Ctrl+C. Keep `public/replay/` with the source tree: it contains three original PNGs, the Ivory shirt PNG, three result JPEGs and their checksums. Start from the repository root; another process already using port 4176 must be stopped by its owner first.

## Five-minute walkthrough

1. Confirm **SAVED API REPLAY · NO NEW CALLS** and the disclosure. Only one candidate (Ivory shirt) and three completed results appear. There is no Prepare/Generate button. This is deliberate: it cannot create new paid requests.
2. Inspect the reference shirt and each full-body result. Toggle **Compare original**, then **Show result** for all three cards. Lower garments and shoes appear retained, but collar, sleeves, hem and button spacing differ. Look 3 neckline details deserve review. No exact-product or physical-fit guarantee is made.
3. Approve two combinations at budget `80`. The invented $48 shirt qualifies with a $24 comparison score. Approve the third: the score becomes $16. These approvals are your preference, not a provider quality certification.
4. Enter budget `48` (included), `47` (excluded), `0` (none eligible) and `bad` (invalid). Restore `80`. Remove approvals until only one remains: no candidate qualifies. Buying nothing is valid.
5. Restore two approvals and reload. Budget and approvals persist for this replay origin/revision; recorded receipt identifiers stay fixed. Refresh saved tasks reloads local state without provider polling or submission. If browser storage is disabled, the app reports that choices may not persist.
6. Try keyboard navigation, comparison toggles and approval checkboxes. A saved image that cannot load must not count toward ranking.

The original nine-pair SVG workflow is separately available via `npm run dev` at port 4173. It is explicitly MOCK, uses invented compositions and simulated failures, and is not evidence of six additional API outputs. Do not combine its performance or output claims with the recorded real trial.

## Evidence and limits

See [quality review](REPLAY_REVIEW_2026-11-02.md) and [live-trial report](FIRST_LIVE_TEST_RESULT_2026-11-02.md). Three generation requests succeeded; estimated consumption is 6 units, while the actual billed amount remains unverified. Replay speed does not measure API latency. Human approval for expanding to nine real combinations is pending. The recorded UI video and repository are available here. The final contest submission and required YouTube/Vimeo link are separate steps.
