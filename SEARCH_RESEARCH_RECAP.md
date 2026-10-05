# sqrtx search research: recap for the next session (2026-10-05)

Read this first, then `PROJECT_NOTES.md` item 33 (the long line with every number, one paragraph per test).
**Nothing is built.** All of this is research on the owner's laptop. No search code exists in the backend or frontend yet.

## 1. What was decided

| Part | Choice |
|---|---|
| Photo model | SigLIP 2 **base**, NaFlex checkpoint (`google/siglip2-base-patch16-naflex`), fp32 PyTorch, 256 patches, searches lowercased and padded to 64 tokens, vectors L2-normalised |
| Text model | EmbeddingGemma 300M, **4-bit ONNX**, 512 numbers (MRL, re-normalised); prompts `task: search result \| query: ...` and `title: ... \| text: ...` |
| What goes into the Gemma text | title + seller's category + business category + description (adding BOTH category fields gave about +10 points in English) |
| Merge | **DBSF** (per list, per search: top 100, (score - (mean - 3 sd)) / (6 sd), sum, equal weights) |
| Dropped by the owner | BM25 / keyword list, SKU gate, diacritic normalisation. Image captions are parked. MetaCLIP 2 and Jina models are not usable (CC-BY-NC). |
| Store | pgvector columns exist but are `vector(512)` and empty; SigLIP base needs 768 numbers (halfvec); store the model name with every vector so photos can be re-embedded later |
| Hosting idea | SigLIP 2 in its own PyTorch service; Gemma (and a re-ranker, if any) in an inference server such as TEI |

## 2. English results (Shopify list: 400 products, DBSF)

| Kind of search | Right result first | recall@10 | Note |
|---|---|---|---|
| Category names (30) | 77% | 68% | photos alone get 87% |
| Category paraphrases (83) | 89% | 87% | |
| Short phrases (60) | 95% | 63% | |
| Phrases with a typo (20) | 90% | 60% | |
| Shop type (21) | 81% | 48% (ceiling 72%) | answer is partly circular |
| Name, exact title (100) | 100% | 100% | |
| Name, first 3 words (100) | 98% | 99% | |
| Colour alone (9) / material alone (15) | 100% / 80% | 15% (ceiling 18%) / 40% (ceiling 71%) | answer key = text OR photo, photos labelled by eye |
| Colour + object (43) / material + object (72) | 86% / 60% | 95% / 87% | |

A right product is in the top 10 in 93-100% of searches of every kind. All attribute numbers use the text-OR-photo key (the first, text-only key was biased toward Gemma; see PROJECT_NOTES "CORRECTION").
Why the weak spots exist (explained, not all proven): sibling categories look alike in text, shop type and material are not visible, typos blur the text vector, small objects on white backgrounds fool the photo list, equal weights suit neither list everywhere.

## 3. Serbian and other languages
- Serbian is weak: photos alone 43-46% (116 products), DBSF about 47-54% (English 86%); Gemma on English listings 20-35%. Serbian product text helps (+7-9 points) but does not reach English.
- On real Croatian shop listings (GLAMI, fashion) photos alone get 62% / 62% / 65% / 57% (English / Croatian / Serbian / Serbian without diacritics) and every fusion was worse than photos alone because the Gemma text list was weak.
- SigLIP 2 so400m improves Serbian by 9-10 points but is 4-7x slower for photos and 8x for searches on the laptop.
- Idea not tested: fine-tune only the SigLIP text tower for Serbian (distillation from the English tower; photo vectors stay valid).

## 4. Re-ranker (cross-encoder), not decided
- Gains are almost all in Serbian; English stays about the same when BLENDED with DBSF.
- bge-reranker-v2-m3 (Apache 2.0): best in Serbian (80% first, blended, top 50) but about 300 ms per pair on CPU int8, so about 15 s for 50 candidates. gte-multilingual-reranker-base (Apache 2.0): 112 ms per pair, 73% Serbian (re-ranker only, top 30). Batching does not help on CPU.
- FlashRank models: fast (1.3 s for 50) but no gain. mxbai-rerank-base-v2: correct but 1.3 s per pair in fp32; the only int8 ONNX is inaccurate. Jina rerankers and MetaCLIP 2: CC-BY-NC.
- Under 100 ms for 50 candidates needs a GPU (estimate, not measured). On CPU: show DBSF results first and re-order later, rerank only non-English searches, fewer candidates (30 looked as good as 50).

## 5. Licences to remember
EmbeddingGemma uses the Gemma terms (not Apache). SigLIP 2, bge/gte rerankers, TEI, Shopify catalogue: Apache 2.0. Amazon Berkeley Objects: CC BY 4.0 (credit Amazon.com). MetaCLIP 2 and Jina CLIP / rerankers: non-commercial only.

## 6. What was NOT tested
Scale (400 products only), approximate vector search in the database, real visitor searches and clicks, apparel ("red dress with blue flowers": the Shopify list has almost no clothing), size / price / brand / long searches, several photos per product, synonyms, server speed (all timings are from an i5-8265U laptop, 8 GB RAM; real int8 speed-ups need AVX-512 VNNI or AMX).

## 7. In progress when the session ended: "material from the photo" test on Amazon data
Goal: measure how much the PHOTO carries colour and material when the text cannot help.
- Downloaded (scratchpad `abo/`): ABO listings (0.1 GB) and small images (3.0 GB). 2,530 products from 23 product types (up to 110 each), 122 searches (14 colour, 18 material, 45 colour + object, 45 material + object).
- Answers = the seller's structured colour / material fields, never shown to a model. Gemma text = title + category + first bullets with every colour and material word removed (0 left from the word list; a masked and a raw version are saved in `pool.json`).
- NOT done: Gemma embeddings (`abo-gemma.mjs masked`, then `raw` for a "how much does text cheat" reference), SigLIP photo vectors (`naflex/abo_vec.py`, about 35 minutes), the scoring script (`abo_eval.py`, still to write: Gemma masked alone, photos alone, DBSF, Gemma raw as reference). Total about an hour on the laptop.
- A quicker version on the Shopify list (remove colour / material words from the 400 texts, re-embed, rerun the 139 searches) was offered, not run.

## 8. Where things are
- Scratchpad (temporary session folder, copy what matters): `C:\Users\nemanja\AppData\Local\Temp\claude\C--Users-nemanja-Desktop-sqrtx-frontend\7983bbba-3e15-497e-b64a-3022947e649c\scratchpad\` with `shop\` (Shopify metadata, 400 photos, vectors, queries, `visual-labels.txt`, `glami\`), `naflex\` (Python scripts and the portable Python in `py\`), `abo\` (Amazon data and scripts), `embtest\` (Node + Gemma model cache).
- The frontend repo also has uncommitted changes from earlier work (services UI, company block, logo sizing, fit-text; see `git status`). Backend repo: `C:\Users\nemanja\Desktop\sqrtx`.
- Other open product work (not search): launch blockers (rate limits, CAPTCHA, security headers / CSP, Brevo domain, payment provider), signed-in testing of owner pages, placeholder About text for sqrtx.

## 9. Suggested next steps
1. Finish section 7 (or the quick Shopify masked-text version), because it answers "does the photo carry colour and material".
2. Test DBSF weights per kind of search (text-defined facts vs visual ones) on both datasets.
3. Test at scale: a few thousand Shopify-catalogue products (the full set has 48,289 products, 9.5 GB, Apache 2.0) with approximate search in Postgres.
4. Decide the Serbian plan (text-tower fine-tune vs GPU re-ranker) and whether to add a re-ranker at all.
5. Build the English version behind a feature flag with the existing keyword search as a fallback; log every search and click.
