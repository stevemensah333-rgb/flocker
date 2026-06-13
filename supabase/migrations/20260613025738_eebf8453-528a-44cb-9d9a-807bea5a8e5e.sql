-- whatsapp_links
CREATE TABLE public.whatsapp_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  farm_id uuid NOT NULL,
  phone text NOT NULL UNIQUE,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_links TO authenticated;
GRANT ALL ON public.whatsapp_links TO service_role;
ALTER TABLE public.whatsapp_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own whatsapp links" ON public.whatsapp_links FOR ALL
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- whatsapp_link_codes
CREATE TABLE public.whatsapp_link_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  farm_id uuid NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_link_codes TO authenticated;
GRANT ALL ON public.whatsapp_link_codes TO service_role;
ALTER TABLE public.whatsapp_link_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own whatsapp link codes" ON public.whatsapp_link_codes FOR ALL
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- whatsapp_messages
CREATE TABLE public.whatsapp_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid,
  farm_id uuid,
  direction text NOT NULL,
  phone text NOT NULL,
  body text,
  intent text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own whatsapp messages" ON public.whatsapp_messages FOR SELECT
  USING (owner_id = auth.uid());

-- alert_settings
CREATE TABLE public.alert_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  farm_id uuid NOT NULL UNIQUE,
  feed_stock_kg_threshold numeric NOT NULL DEFAULT 50,
  daily_mortality_threshold integer NOT NULL DEFAULT 5,
  monthly_budget numeric NOT NULL DEFAULT 0,
  daily_summary_enabled boolean NOT NULL DEFAULT true,
  alerts_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_settings TO authenticated;
GRANT ALL ON public.alert_settings TO service_role;
ALTER TABLE public.alert_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own alert settings" ON public.alert_settings FOR ALL
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TRIGGER update_alert_settings_updated_at BEFORE UPDATE ON public.alert_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_whatsapp_links_phone ON public.whatsapp_links(phone);
CREATE INDEX idx_whatsapp_link_codes_code ON public.whatsapp_link_codes(code);