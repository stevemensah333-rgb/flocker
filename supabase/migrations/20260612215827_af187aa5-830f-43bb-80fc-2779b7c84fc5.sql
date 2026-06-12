CREATE TABLE public.egg_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  coop_id uuid REFERENCES public.coops(id) ON DELETE SET NULL,
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  eggs_collected integer NOT NULL DEFAULT 0,
  eggs_broken integer NOT NULL DEFAULT 0,
  eggs_sold integer NOT NULL DEFAULT 0,
  price_per_egg numeric NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.egg_records TO authenticated;
GRANT ALL ON public.egg_records TO service_role;

ALTER TABLE public.egg_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own egg records" ON public.egg_records
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE TABLE public.saved_rations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  name text NOT NULL,
  stage text,
  rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  cost_per_kg numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_rations TO authenticated;
GRANT ALL ON public.saved_rations TO service_role;

ALTER TABLE public.saved_rations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own saved rations" ON public.saved_rations
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_egg_records_updated_at BEFORE UPDATE ON public.egg_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saved_rations_updated_at BEFORE UPDATE ON public.saved_rations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();