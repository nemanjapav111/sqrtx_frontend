# Recap (2026-10-09, evening) — read this first in the next session

Repos: frontend `C:\Users\nemanja\Desktop\sqrtx_frontend` (Next.js 16, **read `node_modules/next/dist/docs/` before writing Next code**, see AGENTS.md) and backend `C:\Users\nemanja\Desktop\sqrtx` (NestJS, Supabase/pgvector).
`PROJECT_NOTES.md` (frontend) is the detailed log of every decision and measurement; its LAST bullets describe the current state. `sqrtx/API.md` has the search section. This file is the short version.
(`SESSION_RECAP.md`, without a date, is an OLDER recap about the account pages: unrelated.)

**Nothing from this session is committed.** Both repos were clean at their last commits (backend `ecbea02 improved ai search`, frontend `7164628 improved UI and search`). Do not commit unless the owner asks.

Uncommitted now:
- Backend: `API.md`, `src/search/{noise-floor,relevance,search-profile,smart-search.service}.ts` and their four `.spec.ts` files (the hide rule).
- Frontend: `PROJECT_NOTES.md`, `app/home/{home-header,home-nav,home-search,location-picker}.tsx`, `app/[slug]/{category-filter,visitor-icon}.tsx`, `app/[slug]/item-detail/item-detail.tsx`, `app/components/category-select.tsx`, `app/register/company/address-field.tsx`, and the NEW `app/components/popup.tsx`.

The owner runs the dev servers themselves: frontend `next dev -p 3001`, backend `nest start --watch` on 3000 (both were up and answering 200 at the end). Backend tests: `npx vitest run` = 52 files / 674 tests pass; `tsc --noEmit` clean in both repos; ESLint clean on the touched frontend files.

## 1. The AI search stack is FINISHED (owner: "keep 256. our ai stack is finished")
- ONE engine, `hybrid`: EmbeddingGemma 2 texts (`eg2_embedding` halfvec(512), 8-bit `model_int8.onnx`) + SigLIP 2 So400m NaFlex photos (`so400m_embedding` halfvec(1152), fp32, **256 patches**). Merge = DBSF text 0.6 / photo 0.4, fixed spreads text 0.0158 / photo 0.0136. Businesses: text only (`eg2_profile_embedding`).
- The previous stack (SigLIP 2 base, EmbeddingGemma 300M, the `engine=` switch, old columns/indexes, 2 GB of model files) is REMOVED from code, Supabase and disk. Database checked read-only: all 14 products, 3 services, 3 businesses carry the current model names; nothing waiting in the `embedding_dirty` queue.
- Tried and NOT adopted (numbers in PROJECT_NOTES.md, last bullets): int8 NaFlex tower (dynamic and calibrated static: cosine to fp32 0.71–0.85, words→photos top-10 −6 points), bf16 (no ONNX Runtime CPU kernel), 384/576/1024 patches (same ranking, 1.6–7× slower; the exported graph only had two hard-coded 256 constants in the pooling head), community fixed-resolution So400m builds (fp16 = fp32 exactly; 224/256/384 px, patch 14/16, squash vs letterbox vs edge-pad: same ranking; flat gray/white padding hurts). Why "white shoelaces" does not match: the single whole-photo vector, not resolution/precision.
- Image upload checked: already tuned (2.3 s server work per photo, CPU bound; defaults are best). Reading the 604 px card for the photo vector would save ~0.3 s but moves the vector (cosine 0.97–0.99), so not done.

## 2. The HIDE RULE changed (backend, done and tested, not committed)
- Search level (is there an answer at all?) is UNCHANGED: best item's text + 2×photo must reach the learned bar, else "no results".
- Item level (which items stay) is NEW, the owner's rule: an item is hidden only if text < τ_text AND photo < τ_photo (keep if either is good; a missing score never passes its own limit). `keepItem()` in `relevance.ts`.
- τ_text / τ_photo are learned per catalogue from the 61 `NOTHING_QUERIES` as the 75th percentile of their best text / best photo score, clamped (text 0.55–0.80, photo 0.03–0.12), defaults 0.65 / 0.06. Settings: `SMART_SEARCH_MIN_ITEM_TEXT`, `SMART_SEARCH_MIN_ITEM_PHOTO` (replace `..._MIN_ITEM_SCORE`), `SMART_SEARCH_MIN_BEST_SCORE` unchanged.
- Measured on the 500-product pool (thresholds learned on half the unrelated searches, judged on the rest, 200 times): right items kept 86.0% vs 81.5% for the old cut, precision 33.5% vs 28.5%. The same rule also deciding "any answer at all" was worse, so the bar stays.
- Live on the 14 real products (limits there: bar 0.660, text 0.623, photo 0.030): never more items than before, fewer in most searches ("bmw" 13→5, "tshirt" 12→6, "tennis racket" 5→1); on 22 searches with known right answers it kept 58/59 right items (the one "loss" was the Mercedes for "citroen"). The owner asked about lowering the text limit to 0.6: measured, NOT recommended (on the pool it shows ~229 items per search; on the real 14 it adds ~1.8 wrong items per search); keep the learned value.
- Caveat to remember: on the pool no right item was ever saved by its photo alone (every pool item has a good text). The photo half of the rule is for items with poor texts ("Comfy sneakers.", "test"): re-measure on real listings. A 14-product catalogue is too small for the limits to bite ("jacket", "car", gibberish still show many items, as before).

## 3. Frontend UI (done, verified in the browser, not committed)
- **Desktop navbar** (from 1120px): bar 68px (was 76; phone/tablet bars unchanged, 69px with their line), search field 40px × 400px (text 15px), links 14px with 20px gaps (24px from 1280px), location button 40px high, 13px text.
- **Nav no longer moves when a city is chosen**: the location button has a FIXED width (116px desktop, 124px tablet; long names cut with "…", chevron at the right end). Cause was the button width following its label. Verified at 1366, 1120 and 800px with "All", "RS", "Valjevo" and a 27-letter name: every x position identical. About 12 characters fit; "Banja Koviljača"-length names are cut; no hover tooltip (the full name is in the aria-label and the list).
- Button label "ALL" → **"All"** (`location-picker.tsx`).
- **All popups share the location picker's look** via `app/components/popup.tsx` (POPUP_CARD / PANEL / ROW / ROW_ON / HEADING / NOTE / TICK): light #e5e7eb border, soft shadow, 8px padding, rows without lines (44px phone / 40px from 768px, 16/15px text), light grey hover, tick on the chosen row. Applied to: account menu, category filter (now 240px wide), category list and address suggestions in the forms, contact box on a product page. Not touched: photo viewer (lightbox), price-type buttons.
- **Same gap for every popup = 16px** from what is SEEN of the trigger (the location picker's gap): `POPUP_GAP` in `popup.tsx` (+ `POPUP_BELOW`, `POPUP_BELOW_LINE`). Measured 16.0px for account menu, location picker, category filter and contact box at 1366 and 800px. Side effect: on desktop the account menu's top edge is 63px, the location list's 58px.
- NOT verified in a browser: the category list and address suggestions of the registration forms (behind the login; checked by tsc/eslint/reading only). Not changed: the phone's bottom-bar location list (opens upwards, flush above the bar).

## 4. Open items / ideas (none started)
1. Re-measure the photo weight, the bar, the two item limits and the photo-search lines on REAL (Serbian) listings; also the photo side of the hide rule on items with poor texts.
2. If the owner wants white-lace-type attributes: richer item text (auto-captions or seller attributes embedded with EG2), a vision-language re-check of the top results, or attribute tags from small classifiers on the frozen photo vectors.
3. Small UI follow-ups the owner may ask for: a hover tooltip with the full city name; the same 16px logic for the phone's bottom-bar list; smaller phone/tablet bars (would also mean shrinking the business bar, which is kept equal on purpose); look at the form dropdowns after logging in.
4. Server memory for the models: about 4 GB or more (So400m towers are 3.6 GB on disk).

## 5. Working notes
- Evaluation scripts, vectors and the measurements are in the session scratchpad `C:\Users\nemanja\AppData\Local\Temp\claude\C--Users-nemanja-Desktop-sqrtx-frontend\54243806-1111-4386-85df-bb74bbba0519\scratchpad` (about 280 MB: `rel_or*.py` = hide-rule pool tests, `live_*.mjs` = real-database checks, `t_*.mjs` / `e*`/`t256*` = model experiments, `pylibs` = onnx packages for the Orange Python 3.8). It may not survive; the numbers that matter are in PROJECT_NOTES.md.
- The owner prefers: measurements before decisions, "no code" means answer only, scratch downloads deleted when done, no commits unless asked. Real credentials are never entered; the built-in browser works on `localhost:3001` (set a viewport of 1366 px for the desktop layout, reset it with preset "desktop" afterwards).
- Production models folder `sqrtx/models/` (EG2 + So400m, ~4.9 GB) was never changed by the experiments.
