-- Badges v2: Pokemon-style discovery / collection / streak / social ladder.
--
-- The client rebuilt the badge taxonomy from scratch. To avoid the social
-- feed referencing "ghost" unlock cards for badges we no longer render,
-- delete every badge_unlocks row whose `badge` value belongs to the
-- retired v1 set. New unlock rows will repopulate organically from the
-- client as users hit the new thresholds.

delete from public.badge_unlocks
where badge in (
  'first_spot',
  'ten_breeds',
  'quarter_dex',
  'half_dex',
  'full_dex',
  'rare_finder',
  'legend_spotter',
  'featured_hunter',
  'century',
  'social_pup',
  'top_dog_owner'
);
