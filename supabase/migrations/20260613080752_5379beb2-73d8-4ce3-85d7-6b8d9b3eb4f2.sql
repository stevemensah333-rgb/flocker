CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  category text NOT NULL DEFAULT 'general',
  link text,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own notifications"
ON public.notifications FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE INDEX idx_notifications_owner_created ON public.notifications (owner_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: new flock health/event -> notification
CREATE OR REPLACE FUNCTION public.notify_flock_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (owner_id, farm_id, title, body, category, link)
  VALUES (
    NEW.owner_id,
    NEW.farm_id,
    'New ' || COALESCE(NEW.event_type, 'health') || ' record',
    COALESCE(NEW.note, 'A new health record was logged for your flock.'),
    'health',
    '/events'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_flock_event
AFTER INSERT ON public.flock_events
FOR EACH ROW EXECUTE FUNCTION public.notify_flock_event();

-- Trigger: new flock added -> notification
CREATE OR REPLACE FUNCTION public.notify_new_coop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (owner_id, farm_id, title, body, category, link)
  VALUES (
    NEW.owner_id,
    NEW.farm_id,
    'New flock added',
    NEW.name || ' (' || COALESCE(NEW.count, 0) || ' birds) was added to your farm.',
    'flock',
    '/coops'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_coop
AFTER INSERT ON public.coops
FOR EACH ROW EXECUTE FUNCTION public.notify_new_coop();