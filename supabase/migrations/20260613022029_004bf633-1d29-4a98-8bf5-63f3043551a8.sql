DELETE FROM public.ingredient_prices a
USING public.ingredient_prices b
WHERE a.ctid < b.ctid
  AND a.farm_id = b.farm_id
  AND a.ingredient_name = b.ingredient_name;

ALTER TABLE public.ingredient_prices
  ADD CONSTRAINT ingredient_prices_farm_ingredient_unique
  UNIQUE (farm_id, ingredient_name);