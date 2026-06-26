update public.trips
set dates = 'Dates à décider ensemble'
where coalesce(card_type, 'catalog') = 'catalog';
