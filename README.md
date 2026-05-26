# Spotter

Spotter is an Expo app (iOS / Android / Web) for logging dog sightings, tracking Dogdex progress, and competing in leagues. The web build deploys to Vercel as a static SPA backed by a Supabase project (auth, Postgres, Storage).

---

## Quick start (local dev)

```bash
nvm use            # Node 20+, pinned in .nvmrc
npm install
cp .env.example .env  # then fill in your Supabase URL + publishable key
npm run start      # native + web dev menu
# or
npm run web        # web only
```

## Build static web output

```bash
npm run build:web
```

Exports static files to `dist/`. The build will **hard-fail** if Supabase env vars are missing whenever `VERCEL_ENV=production` (Vercel) or `EXPO_PUBLIC_FAIL_ON_MISSING_ENV=true` (local) — this is on purpose so we never ship a non-functional placeholder client.

Preview the export locally:

```bash
npm run preview:web
```

---

## Deploying to Vercel

1. Import this repo into Vercel.
2. **Build & Development Settings**
   - Build command: `npm run build:web`
   - Output directory: `dist`
3. **Environment Variables → Production** (also add to Preview if you test PRs)
   - `Supabase_URL` — `https://<project-ref>.supabase.co`
   - `Supabase_Publishable_Key` — `sb_publishable_…`
   - (`EXPO_PUBLIC_SITE_URL` optional; web auth uses the current origin automatically)
4. Deploy.

`vercel.json` configures static hosting + SPA rewrites so React Navigation routes resolve to `index.html` on refresh.

See `.env.example` for the full list of accepted env aliases.

---

## Supabase — production project setup (one-time)

Do this on a fresh hosted Supabase project before pointing Vercel at it.

1. **Apply migrations** (linear set in `supabase/migrations/`):

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

2. **Seed core data.** `db push` does **not** run `seed.sql` on the hosted DB — apply it manually in the SQL editor:

   - `supabase/seed.sql` — breeds catalogue + featured-breed schedule
   - `scripts/breed-thumbnails.sql` — Wikipedia reference photo URLs for breed banners (optional but recommended)

   Alternatively, with the service role key set locally:

   ```bash
   SUPABASE_SERVICE_ROLE_KEY=… node scripts/seed-breeds.mjs
   ```

3. **Storage buckets.** The initial migration auto-creates `avatars`, `breed-reference` (public-ish, auth-read) and `scans` (private, signed URLs). Verify they exist under Storage → Buckets.

4. **Auth configuration** (Supabase Dashboard → Authentication):
   - **URL Configuration → Site URL** — your production URL
   - **URL Configuration → Redirect URLs** — add every host you serve from, e.g.
     - `https://your-app.vercel.app/**`
     - `https://*-your-team.vercel.app/**` (Preview wildcard — depends on plan)
   - **Providers → Email** — confirm `Enable email confirmations = OFF` (matches the client which assumes immediate session)
   - **Providers → Google** — only if you want Google sign-in; otherwise leave disabled

5. **Smoke check:** create a brand-new account through the deployed site, take one scan, refresh — the scan should still be there.

### Optional one-off / admin scripts

All of these require `SUPABASE_SERVICE_ROLE_KEY` in your local env and should never be put in Vercel:

| Script | Purpose |
|--------|---------|
| `scripts/seed-breeds.mjs` | Upsert the 50 breed rows (alternative to `seed.sql`) |
| `scripts/fetch-breed-thumbnails.mjs` | Regenerate `breed-thumbnails.json` from Wikipedia |
| `scripts/fetch-breed-photos.mjs` | Upload hero photos into the `breed-reference` bucket |
| `scripts/restore-scans-from-storage.mjs` | Rebuild missing `scans` rows from storage objects (repair only) |

---

## Smoke checklist after deploy

After every prod deploy, walk through the same handful of paths a pilot user will hit. The full checklist lives in [`docs/PILOT_LAUNCH_CHECKLIST.md`](docs/PILOT_LAUNCH_CHECKLIST.md) (added in a later PR); for now the minimum bar is:

1. Root URL loads without the dev "Supabase not configured" banner (banner is dev-only).
2. Refreshing a non-root path still loads the app (SPA rewrite works).
3. Sign up with a fresh email → land on Dogdex.
4. Open camera → take a spot → assign breed → see it on Dogdex.
5. Delete a spot → refresh — it stays deleted (validates the new `scans_delete_self` RLS).
6. Reload tab → still signed in.
