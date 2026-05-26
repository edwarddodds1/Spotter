# Spotter — pilot launch checklist

Run through this before sending the pilot link to a new tester. Items marked **✓ automated** are verified by CI on every push to `main`.

---

## 1. Supabase (hosted: `vkivspaugunafxmkiqzt`)

- [ ] All migrations applied, including `20260525210000_pilot_rls_hardening.sql`.
  - Verify in Dashboard → Database → Migrations.
- [ ] `breeds` table has 50/50 rows with `reference_photo_url` set.
- [ ] `scans` and `breed-reference` storage buckets exist (private + public/auth respectively).
- [ ] Auth → URL configuration:
  - Production URL added to **Site URL** and **Redirect URLs**.
  - `https://*.vercel.app` added for preview deploys.
- [ ] Auth → Providers → Email: `Enable email confirmations` = **OFF** for the pilot.
- [ ] RLS check (SQL editor as an authenticated user):
  - [ ] Can delete own scan.
  - [ ] Cannot delete another user's scan.
  - [ ] Cannot select a friend's `is_private = true` scan.
  - [ ] Cannot update an arbitrary `dog_profiles` row (deferred — currently unrestricted; see notes below).

## 2. Vercel project

- [ ] Environment variables (Production + Preview):
  - `Supabase_URL`
  - `Supabase_Publishable_Key`
  - Optional: `EXPO_PUBLIC_SITE_URL` (e.g. `https://spotter.vercel.app`)
  - Optional: `EXPO_PUBLIC_SENTRY_DSN` if you want error reports beyond `console.error`.
- [ ] Latest deployment built without warnings about missing Supabase env vars.
- [ ] SPA rewrite rule covers `/(.*)` → `/index.html` (Expo router not used; static export).

## 3. CI ✓ automated

The GitHub Actions workflow at `.github/workflows/ci.yml` runs on push to `main` and PRs:

- [ ] `npm run typecheck` passes.
- [ ] `npm run build:web` succeeds.
- [ ] `npm run smoke:web` passes (Playwright boots `dist/`, asserts `#root` populates, no console errors).

If CI is red, fix it before sharing the deploy.

## 4. Manual end-to-end (per release)

Run on the deployed Vercel URL in an incognito window.

- [ ] Sign up with a fresh email → lands in the app, no Park Pals / fake friends.
- [ ] Spot tab → capture / upload photo → assign breed → Dogdex shows scan.
- [ ] Delete spot from Social → refresh → still gone.
- [ ] Replace photo in EditScan → confirm new image shows in Dogdex, Social, profile.
- [ ] Leagues tab shows "Coming soon" (not the league builder).
- [ ] Friends button (Social) shows "Coming soon".
- [ ] Forgot password is hidden on AuthScreen.
- [ ] Settings → Privacy and Terms screens render the placeholder copy.

## 5. Error monitoring

- [ ] If `EXPO_PUBLIC_SENTRY_DSN` is set, trigger a deliberate error (e.g. add a temp throw behind a hidden button) and confirm the event arrives in Sentry, then revert.
- [ ] If unset, accept that errors only land in browser console / `console.error` — pilot users won't see anything broken, but you'll have no telemetry.

## 6. Rollback

- [ ] Note the previous Vercel deployment URL in case you need to instantly revert via Vercel → Deployments → "Promote to Production".

---

## Known deferred items (track in v2)

- `dog_profiles` UPDATE RLS is still permissive. Tightening this requires moving `spotService.saveSpot`'s `total_scans` bump to a server-side trigger first so repeat scans of someone else's dog keep working. Deferred from PR1/PR2.
- Friends + Leagues live UI behind `PILOT_SOCIAL_ENABLED = false` until friend graph + league join routes ship.
- Native `@sentry/react-native` not installed yet — current reporter is web-first and POSTs to Sentry's HTTP API; native uses `console.error`.
