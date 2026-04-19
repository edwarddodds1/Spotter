-- Align breed.points with app tier table: 1 / 3 / 7 / 15 (scan awards + league rollups use this column).
update public.breeds set points = 1 where rarity = 'common';
update public.breeds set points = 3 where rarity = 'uncommon';
update public.breeds set points = 7 where rarity = 'rare';
update public.breeds set points = 15 where rarity = 'legendary';
