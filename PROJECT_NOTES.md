# sqrtx: project notes (handoff for a new chat)

Written 2026-09-26. Read this first, then look at the code. No secrets are in this file.

## What sqrtx is
A business directory/platform. Businesses register, create a public profile (logo, address, contact info), then add products and/or services. Visitors browse. Mobile first, black and white design, Inter font.

## The two projects
| | Path | Stack | Dev port |
|---|---|---|---|
| Frontend | `C:\Users\nemanja\Desktop\sqrtx_frontend` | Next.js 16 (App Router), React 19, Tailwind 4, TypeScript | 3001 (`npm run dev`) |
| Backend | `C:\Users\nemanja\Desktop\sqrtx` | NestJS on Fastify, TypeORM, Postgres (Supabase), R2 for images, Vitest | 3000 (`npm run start:dev`) |

The backend API contract is `sqrtx\API.md` (keep it updated when endpoints change). Next.js here is a newer version than most training data: read `node_modules/next/dist/docs/` before using Next APIs (see AGENTS.md).

## Accounts and services
- **Supabase** project handles login (Auth). Email confirmation is ON. The frontend talks to Supabase directly (`lib/supabase.ts`, publishable key in `.env.local`); the backend only verifies the Supabase JWT (ES256 via JWKS, also checks audience `authenticated` and the issuer). Tokens last 1 hour.
- **Trigger** in Supabase (made by hand, not in migrations): a new Supabase account creates a row in `public.users` (id, login_email). `users.id` has a foreign key to Supabase's auth users with cascade delete. Email changes are NOT synced yet.
- **Password policy** (set in Supabase AND in the form, keep in sync): 8+ characters with a-z, A-Z and 0-9.
- **Email sending**: Brevo custom SMTP with a Gmail sender (dev only). Brevo IP blocking must stay OFF (Supabase has no fixed IPs). Brevo free plan = 300 emails/day. Supabase's own limit was raised to 100/hour.
- **Domain `sqrtx.co` is NOT owned yet** (no DNS records existed when checked). So: `support@sqrtx.co` on the landing page is dead, Brevo domain authentication (SPF/DKIM) can't be done, and company URLs are shown as `sqrtx.co/<name>` using one constant (`SITE_HOST` in `lib/business-profile.ts`). Buy a domain before launch.
- **Database extras added by hand in Supabase** (not in migrations, because TypeORM can't touch the auth schema): CHECK constraints `users_onboarding_step_check` and `business_profiles_provides_check`, Row Level Security ON for all public tables, the trigger above. The backend connects as `postgres` (bypasses RLS).
- **Google Places** (address search): needs `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local` (empty until you add it). Enable "Places API (New)" + "Maps JavaScript API", restrict the key to your site addresses. Without it the form works but the address box says search is unavailable.
- `.env.local` variable names: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL` (http://localhost:3000), `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

## Designs (Figma file key `G2k3H118SJCHAd1NedaFUm`, name "digimall")
Phone frames used so far: landing `2210:5246`, register step 0 `2225:727`, login `2225:433`, business profile (step 1) `2225:580`. Landing also has tablet `2059:8607` and desktop `1917:1186` (built with `md:` at 768px and `xl:` at 1280px). The user says designs exist for the remaining screens (products, services, final page with terms, forgot password, tablet/desktop of the newer pages) but has not sent those links yet.

## Registration flow (how it works)
1. **Landing** (`/`) -> Register / Log in.
2. **Register** (`/register`): email + password. Creates the Supabase account, then a "check your email" page (resend with 60s countdown, change email, auto-continue if the link is opened in another tab of the same browser, "Confirmed on another device? Continue" signs in with the password kept in memory only). An already-registered email shows "Already registered" on the form (uses Supabase's empty `identities` heuristic, not officially guaranteed).
3. **Confirmation link** brings the user to `/register/company`.
4. **Login** (`/login`): after sign-in it calls `GET /onboarding/me` (`lib/onboarding.ts`) and sends the user to the page for their step (`pathForStep`).
5. **Business profile** (`/register/company`): create mode (POST multipart) and edit mode when coming Back (PATCH JSON + PUT logo). Google address search, category select (PLACEHOLDER category list in `lib/business-profile.ts`), "Your URL" is checked for availability when the user leaves the field (green check / "already taken"), Products/Services checkboxes become `provides` (products | services | both), logo upload.
6. **Products, services, final pages**: NOT BUILT. The routes `/register/products`, `/register/services`, `/register/final` are mapped in `lib/onboarding.ts` but the pages don't exist (404).

Server-side progress: `users.onboarding_step` = furthest step reached: `business_profile` -> `products` (if provides has products) -> `services` (if it has services) -> `final` -> `done`. Only the server moves it. Saving the profile advances it, `POST /onboarding/next {step}` advances products/services, `POST /onboarding/finish {about_company}` completes registration. Until `done`, the owner's profile, products and product images are hidden from every public endpoint. Owners see their products via `GET /product/mine`. Step rules are pure functions in `sqrtx/src/onboarding/onboarding-steps.ts`.

## Backend endpoints that exist (see API.md for details)
Products and product images (multipart uploads, 1-30 images, AVIF/WebP variants), business profile (`/business-profile/me` CRUD, `/me/logo`, public directory, `/check-url`), onboarding (`/onboarding/me|next|finish`). Not built: services module (entity exists, endpoints are placeholders), search, pagination for `GET /product`.

## Frontend code map
- `app/page.tsx` landing; `app/login`, `app/register`, `app/register/company` pages.
- `app/components`: `field.tsx` (`FieldShell` + `Field`), `big-logo.tsx`, eye icons. Import eye icons and other images from inside `app/` (not `/public`) so they get long-term caching.
- `lib/`: `supabase.ts`, `api.ts` (`apiFetch`: adds the Bearer token, refreshes once on 401, `ApiError`), `onboarding.ts`, `business-profile.ts` (fields, rules, API calls), `places.ts` (Google wrapper), `use-session.ts` (`useRequireSession`), `validation.ts`, `auth-messages.ts`.
- Common patterns: forms use `noValidate`, red underline after the first submit click, an "already sending" ref guard against double clicks, errors shown under the button.
- The arrow character is not in the Inter subset served by Google, so arrows are inline SVGs. Only the `latin` subset of Inter is loaded.

## Conventions and preferences of the user
- Wants lean, readable code with comments that explain why. When they say "no code" answer in words only and change nothing.
- Wants claims verified (docs, measurements, tests). Say plainly what could not be verified.
- Never ask for or handle secrets in chat: they enter SMTP keys and similar themselves in dashboards.
- Do NOT create real accounts, send real emails or purchase things. Test with intercepted `fetch` responses and stand-ins (see below); the user does real end-to-end runs.
- Text for messages/labels comes from the designs; anything not in a design is a placeholder and should be flagged.
- Checkboxes are 20px with a 44px tap row (approved deviation from the 11px in Figma).

## How work was tested (repeat this style)
- Frontend has no test runner. Pages were checked in the built-in browser at 360px width by replacing `window.fetch` with a stand-in for Supabase/API/Google, planting a fake session in `localStorage` (key `sb-<project-ref>-auth-token`), and reading results from the page. Measured layout against Figma coordinates (usually within 1px).
- Backend: Vitest unit tests with fake repositories, plus "mutation checks" (temporarily break a rule, confirm a test fails, restore). Real-database checks were done only with read-only queries or inside a transaction that is always rolled back. If the test runner crashes with a memory error use `npx vitest run --no-file-parallelism`.
- Before finishing frontend work run `npx tsc --noEmit`, `npx eslint app lib` and `npx next build`.

## Known gaps and suggested next steps (priority order)
1. Commit both projects regularly (the user commits themselves).
2. Build the products page, then services (needs the backend services module first), then the final page (about the company + terms of service + privacy policy + Finish).
3. Terms/privacy acceptance: DB columns exist on `users` (`terms_accepted_at`, `terms_version`, `privacy_version`), no endpoint or pages yet.
4. Forgot password (+ decide what "Forgot email?" does). Recommended: one-time-code links (works on any device) instead of the default same-browser flow; needs a Supabase email template edit. The links on the login page are `#` placeholders.
5. "Already signed in" handling on landing/login/register ("Continue registration").
6. Business category list (real values), where the Back arrow on step 1 should go (currently `/`), tablet/desktop versions of the newer pages.
7. Before launch: own domain, real email provider/domain authentication, CAPTCHA on sign-up, Content-Security-Policy, cleanup of never-confirmed accounts, reserved company URL words enforced in the API (currently only in the browser), rate limiting on the API, sync `users.login_email` on email change, case-insensitive uniqueness for `company_url` in the database, capture the hand-made DB changes in a migration or docs.
8. Unrelated old failing tests: 6 Nest-generated placeholder specs in the backend (app, product, product-image, business-profile controller).

## Gotchas
- After many edits the Next dev server can serve stale modules (errors like "Element type is invalid ... got: undefined"): restart `npm run dev` and hard refresh.
- After login, "You're logged in, but we couldn't load your registration progress" means the call to the backend failed: is the backend running on port 3000, does `NEXT_PUBLIC_API_URL` match, does the user have a `users` row?
- The Supabase default email service only sends to team members at 2 emails/hour, which is why custom SMTP (Brevo) is required.
