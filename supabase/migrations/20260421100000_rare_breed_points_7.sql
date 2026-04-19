-- Bump rare tier from 5 → 7 if an older DB already applied the previous rarity migration.
update public.breeds set points = 7 where rarity = 'rare';
