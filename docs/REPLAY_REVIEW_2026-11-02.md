# Recorded result quality review and local replay — 2026-11-02

Scope: inspect the already completed trial, package its saved images for local comparison, and update English materials. This preparation made no new YouCam/Vault requests, image uploads, generation requests, deployment, push or submission.

## Evidence and visual observations

The reviewer viewed all three source images, the isolated Ivory shirt reference and all three cached results. This is an assistant's preliminary visual review, not an entrant's approval, fit test, identity measurement or quantified preservation metric. The person is a fictional synthetic adult. All result JPEGs are 1024 × 1536. Checksums in `public/replay/checksums.json` match the existing trial input/output files.

| Case | Lower-body comparison to input | Reference garment comparison | Decision |
| --- | --- | --- | --- |
| Everyday denim | Dark straight jeans and white sneakers appear retained, including the recognizable silhouette and stance. | Ivory collar and brown buttons reflected; sleeves are rolled/pushed up, neckline is open and hem is tucked. | Usable for a disclosed comparison; exact garment construction unverified. |
| City tailored | Beige trousers and black loafers appear retained. | Long sleeves and ivory collared shirt reflected; neckline, placket and button spacing differ. | Usable for a disclosed comparison; physical fit unverified. |
| Pleated skirt | Green pleated skirt and burgundy flats appear retained. | Ivory shirt reflected; two nearby button-like details at the open neckline have different alignment/spacing from the isolated reference. | Show honestly and request human review; do not characterize it as a proven gross rendering defect. |

The apparent person, stance and gray background remain recognizable. This does not establish exact pixel preservation or biometric identity. Shirt sleeve/neckline/hem changes are visible styling differences, not proof of sizing accuracy. **Human quality approval for a full nine-combination real trial remains pending.** Only three real outputs exist.

The [live trial report](FIRST_LIVE_TEST_RESULT_2026-11-02.md) records three successful generation POSTs and four private File API uploads. Published pricing estimated 6 units; actual consumed units remain unverified. Replay speed is unrelated to generation latency. No performance benchmark is claimed.

## What the local demo does

Run `npm run replay`, open `http://127.0.0.1:4176`, stop with Ctrl+C. It serves three saved source/result pairs and the reference from an exact seven-file map. It has no live adapter, credentials, external URLs, remote receipt identifiers, mutable task store or generation action. `POST /api/tasks` returns 405 before parsing/submission. Refresh only reads the fixed local recording.

The UI says SAVED API REPLAY; it presents one Ivory shirt with three comparisons, rather than implying nine real outputs. Original/result toggles, manual approval, budget filtering and the existing shortlist logic remain available. Prices are invented. A failed result-image load cannot count toward approval. Original nine-pair SVG mock and fake-transport fixtures remain separate modes.

## Verification

The public snapshot passes 33 automated tests, a production build and credential-boundary checks. Actual GUI comparison, approval/ranking, budget and reload checks are recorded in [GUI_VERIFICATION.md](GUI_VERIFICATION.md). The included English-captioned video uses genuine app operation, edited at normal speed. No new provider calls were made for replay or publication.

## Release tasks still pending

Review final entry qualifications and rights status. The repository, included test build and real-UI video are public; a separately approved YouTube/Vimeo account/channel and final contest entry are still needed. Complete [the English entry draft](SUBMISSION_DRAFT.md) without presenting this saved replay as live generation. No additional paid generation is required to inspect these three results.
