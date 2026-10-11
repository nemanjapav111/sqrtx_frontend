# Recap (2026-10-11, end of session) — frontend only; read this, then the LAST bullets of `PROJECT_NOTES.md`

Repo: `C:\Users\nemanja\Desktop\sqrtx_frontend` (Next.js 16: **read `node_modules/next/dist/docs/` before writing Next code**, see AGENTS.md). The backend (`C:\Users\nemanja\Desktop\sqrtx`) was not touched in this stretch. `SESSION_RECAP_2026-10-09.md` covers the AI search stack and the popups' look; this file covers 2026-10-10 and 2026-10-11 (all UI). `PROJECT_NOTES.md` has one dated bullet per decision, with measurements (the last ~14 bullets are this stretch).

**NOTHING IS COMMITTED.** Last commit `7164628 improved UI and search`; about 30 frontend files are modified and 6 are new (`SESSION_RECAP_2026-10-09.md`, this file, `app/components/{bar-icons,company-line,popup,use-popup-dismiss}.ts(x)`), `app/(sqrtx)/product/[id]/company-card.tsx` is deleted. Do not commit unless the owner asks. `npx tsc --noEmit` and ESLint (`app`, `lib`) were clean at the last run; `next build` was not run.

## What changed (all checked in the built-in browser unless noted)
**Product and service pages** (`app/[slug]/item-detail/item-detail.tsx`, used by `/product/<id>` and `/service/<id>` and the business's own copies)
- Same order on EVERY size now: photos (phone/tablet: swipeable strip + thumbnails; desktop: one photo + arrows) → name → price → the slim company line → "View contact" → a service's facts → text. Desktop right column: each 15px under the one above, one left edge. The big company card above the name is gone (`CompanyCard` and the `company` prop deleted).
- Phone and tablet: name 24px semibold and price 24px bold, left-aligned, no gap between them; tablet text sits in a 680px column (company line, button and description share its left edge, 83px at 820px). Photo height `clamp(280px,calc(100svh-306px),700px)`, same with one photo or many.
- Contact popup is `min(24rem, 100vw-2rem)` wide (emails stop being cut).
- `CompanyLine` (`app/components/company-line.tsx`, props `slug, name, city, logo`): logo up to 72×28 on phone/tablet, up to 100×58 from a 1120px window (two sizes as CSS variables); a link to the business's page.

**Lists**
- Marketplace Services list (`app/home/home-services.tsx`): the company's slim line is UNDER the service's name and price (the bigger company block above the photo is gone from the rows).
- Product cards (`app/home/home-feed.tsx`): order is name, price, company (company last, small grey, one row).
- Same padding as the product lists: phone block is 350px wide (`max-w-87.5`: 16px sides on a 375px phone, centered on wider ones) on the marketplace and business Services lists, the Companies list, and the business About and Contact pages; tablet: Services lists and Companies list have `md:px-7.5 md:pt-7.5` and a 740px block. Measured at 820px: left edge 33px on every list page.
- NOT given the tablet padding: business About and Contact (text columns with their own 50px above, 40px sides): ask the owner.

**Popups and viewer**
- Every popup that opens from a button (location list, account menu, category filter, contact box) closes only on a click outside, and that click does nothing else (`app/components/use-popup-dismiss.ts`). Not included: the typing dropdowns of the registration forms (they close on blur, which also saves what was typed).
- Full-screen photo viewer (`photo-viewer.tsx`, `zoom-stage.tsx`): one-finger flick changes the photo, the zoom bar no longer flickers (`ZoomStage` stays mounted and takes `photoId`), zoom buttons (`BarButton`) act on `pointerup` for touch. The owner confirmed the "first tap on + after a swipe" bug is solved.

**Earlier on 2026-10-10:** the list is kept when coming back from a product (`HomeProvider` memory), search-loading polish (shimmer, blur-up), marketplace bar 69px and the final logo (white 19px square, 16px bold "sqrtx"), shared bottom-bar icons (`app/components/bar-icons.tsx`), business logos far left at 68px on phone and tablet.

## Open / not checked
1. **Tablet:** only 820px was measured. Not looked at: landscape ~1024px, the 1120px switch, windows between 1090 and 1119px (the Services rows' desktop layout now starts at a 1090px window), a real tablet.
2. **Phone on the dev server cannot load the city list** (owner said "nevermind"): `.env.local` has `NEXT_PUBLIC_API_URL=http://127.0.0.1:3000` (the phone's own address) and the API's `CORS_ORIGINS` (`sqrtx/.env`) has only `localhost`. Fix if wanted: `NEXT_PUBLIC_API_URL=http://192.168.1.6:3000` + add `http://192.168.1.6:3001` to `CORS_ORIGINS` + restart both + let Windows Firewall pass port 3000.
3. Viewer: the ◀ ▶ arrow buttons have no pointerup treatment; "+" is disabled at maximum zoom (a design limit).
4. The business Contact page's map picture did not draw in the preview, so its look at the new 350px width was not seen.
5. The tablet's name/price/company column (680px) is not flush with the photo column's left edge (the photo is a wider, centered column): easy to change if wanted.
6. The AI search stack is finished (see the 10-09 recap); its open items there are unchanged.

## Working notes
- The owner runs the dev servers: frontend `next dev -p 3001`, backend `nest start --watch` on 3000. The built-in browser works on `http://localhost:3001`; the phone uses `http://192.168.1.6:3001` (allowed in `next.config.ts`; the address is the PC's and can change).
- The owner prefers: measurements before decisions, "no code" = answer only, short iterative requests, no commits unless asked, real credentials never entered. Answers are short; recommendations rather than option lists.
- Preview-pane quirks: set a viewport with `resize_window` and reset it with preset "desktop" when done; after a navigation wait several seconds (dev hydration is slow) before measuring, layout reads can be zero until a screenshot wakes the pane; take a screenshot before clicking by coordinate (or click by `ref`); screenshots sometimes time out, `javascript_tool` measurements still work.
- Scratch scripts (`edit-*.mjs`, mockup HTML/PNGs) live in the session scratchpad, not in the repo.
