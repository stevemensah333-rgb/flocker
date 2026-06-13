CREATE TABLE public.flock_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  farm_id uuid NOT NULL,
  coop_id uuid,
  event_type text NOT NULL,
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  cost numeric NOT NULL DEFAULT 0,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flock_events TO authenticated;
GRANT ALL ON public.flock_events TO service_role;

ALTER TABLE public.flock_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own flock events"
  ON public.flock_events FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE TRIGGER update_flock_events_updated_at
  BEFORE UPDATE ON public.flock_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();