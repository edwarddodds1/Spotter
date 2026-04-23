# Spotter

Spotter is an Expo app (iOS/Android/Web) for logging dog sightings, tracking Dogdex progress, and competing in leagues.

## Run locally

```bash
npm install
npm run start
```

Web dev mode:

```bash
npm run web
```

## Build static web output

```bash
npm run build:web
```

This exports static files to `dist/`.

## Deploy on Vercel (public friend-testing link)

1. Import this repo into Vercel.
2. In **Project Settings -> Environment Variables**, add:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - (optional) `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
3. Build command: `npm run build:web`
4. Output directory: `dist`
5. Deploy.

`vercel.json` in this repo is configured for static hosting and SPA rewrites so app routes resolve to `index.html`.

## Optional: preview exported build locally

```bash
npm run preview:web
```

## Web smoke-test checklist

After deploy, verify:

1. App opens from the root URL.
2. Refreshing while on a non-root route still loads the app (SPA rewrite works).
3. Tabs load: Dogdex, Social, Spot, Leagues, Profile.
4. Spot flow works in browser (or gracefully falls back when camera/location permissions are denied).
5. Map/journal sections render without runtime crashes.
6. Supabase-backed data appears when env vars are set.

## Auth/profile smoke checklist

After configuring Supabase and deploying, verify:

1. Sign up with email/password works (confirmation email sent if enabled).
2. Sign in with existing email/password succeeds.
3. Forgot password sends a reset email.
4. Google sign-in redirects back and authenticates correctly.
5. Edit profile username/city/country, save, then reload app — values persist.
6. Update avatar, then reload app — avatar remains updated.
7. With no active session, app shows auth screen (no automatic demo bypass).

