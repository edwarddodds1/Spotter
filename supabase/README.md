# Spotter Supabase

## Local setup

1. Install Docker Desktop and ensure it is running.
2. Add the following secrets to a local `.env` or your shell:
   - `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`
   - `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`
3. Start Supabase locally:
   - `npx supabase start`
4. Apply the schema and seeds:
   - `npx supabase db reset`
5. Serve Edge Functions while iterating:
   - `npx supabase functions serve --env-file .env`

## Hosted project checklist

1. Create a new Supabase project.
2. Copy `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` into the Expo app `.env`.
3. Run the migration and seed on the hosted project.
4. Create Storage buckets:
   - `avatars`
   - `breed-reference`
   - `scans`
5. Upload reference photos into `breed-reference/<breed-id>.jpg`.
6. Set Edge Function secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
7. Deploy functions:
   - `npx supabase functions deploy rotate_featured_breed`
   - `npx supabase functions deploy reset_weekly_scores`
   - `npx supabase functions deploy get_area_leaderboard`

## Scheduled jobs

- `rotate_featured_breed`: daily at `00:00 Australia/Sydney`
- `reset_weekly_scores`: Monday at `00:00 Australia/Sydney`

## Notes

- `featured_breeds` is seeded with a rolling 90-day schedule.
- Global weekly scores use `league_id = null`; league-specific scores use the member league id.
- The area leaderboard function ranks users from their latest geotagged scan this week.
