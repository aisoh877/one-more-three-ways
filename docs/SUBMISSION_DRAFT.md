# One More, Three Ways — English submission draft

**Submission draft — not submitted.** Updated November 2, 2026. Three real API outputs have been verified technically. The available local demo is an explicitly labeled saved replay, not live generation during evaluation. Entrant review and final contest requirements remain pending.

## Tagline

Compare one new top with three outfits you already own, then choose with your own judgment.

## Inspiration

A product image shows a top in isolation. A shopping decision is more personal: will this work with the clothes I already own? We built a small comparison tool that starts with an existing wardrobe and keeps the shopper in control.

## What it does

The recorded demonstration compares one Ivory shirt against three synthetic adult wardrobe images. Viewers inspect each original, the reference garment and the generated result, then approve combinations they like. A top needs at least two approved combinations and must fit the viewer's budget to enter the shortlist. The original mock workflow also demonstrates three candidates across nine combinations; six of those combinations have not been generated with the real API.

The score is the invented demo price divided by the number of approved combinations. It is a transparent comparison measure, not cost per wear or a prediction of fit, purchases or environmental benefit. Buying nothing remains a valid outcome.

## How we built it

The React interface runs with a Node.js server. A server-only YouCam Clothes V3 adapter requests `upper_body` garment replacement. In the authorized November 2 trial, four synthetic input images were uploaded through the official File API, and three generation requests completed successfully. Results were downloaded locally; inputs did not require public hosting.

The live integration keeps durable SQLite receipts, bounds polling, and avoids automatically resubmitting uncertain paid requests. The saved replay packages only local input/result images and minimal public receipts. It loads no credentials or live task store, and rejects generation requests. Refreshing or recording the replay does not call YouCam. Automated fixtures test failure and recovery paths separately from actual provider evidence.

## Challenges and observations

A top is useful here only if the original outfit remains recognizable. Preliminary visual review found recognizable jeans, trousers, skirt and footwear in all three results. However, the reference garment's collar, sleeves, hem, placket and button arrangement are reinterpreted. The skirt result's neckline/button spacing merits closer human review. We do not claim exact garment construction, pixel identity or physical fit. The human quality gate for expanding to nine real outputs remains open.

## Accomplishments and learning

Three of three real generation requests succeeded, and all three cached 1024 × 1536 results are available in the local comparison demo. The trial's estimated cost is 6 units; actual billed consumption is unverified. The saved replay supports original/result comparisons, explicit approvals, a transparent budget filter and persistent preferences without additional API use. Local automated verification is documented separately; successful offline tests do not establish service reliability or garment fidelity.

A useful shopping aid needs visible human choices and honest limits. A generated visualization can support a decision without certifying how a garment will fit or look in real life.

## Built with

YouCam Clothes V3 and File API, React, Node.js, SQLite, esbuild, JavaScript and CSS. Synthetic adult/model and product input assets; original SVGs for the separate mock workflow. AI assistance was used for implementation and documentation.

## Required entrant decisions before release

- Review the actual three outputs and limitations, asset rights, authorship, eligibility and dependency notices; select a source license.
- Repository and local test-build access: https://github.com/aisoh877/one-more-three-ways . The demo runs locally using the included instructions.
- A real-UI English-captioned demo is included in the repository. A public YouTube/Vimeo submission link still needs an approved account/channel. The video discloses saved replay and the actual API workflow.
- Complete entry fields and submit after final review. No hosted deployment or contest receipt is claimed.

Further paid generation is not required to inspect these three results and is outside this preparation step.
