-- Helper: drop every existing policy on a table, then recreate owner-scoped
-- policies restricted to the authenticated role.

DO $$
DECLARE
  pol record;
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['alert_settings','whatsapp_links','whatsapp_link_codes','whatsapp_messages']
  LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- alert_settings: owner-only, authenticated
CREATE POLICY "Owners manage their alert settings"
ON public.alert_settings FOR ALL TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- whatsapp_links: owner-only, authenticated
CREATE POLICY "Owners manage their whatsapp links"
ON public.whatsapp_links FOR ALL TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- whatsapp_link_codes: owner-only, authenticated
CREATE POLICY "Owners manage their whatsapp link codes"
ON public.whatsapp_link_codes FOR ALL TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- whatsapp_messages: full owner-scoped CRUD, authenticated
CREATE POLICY "Owners view their whatsapp messages"
ON public.whatsapp_messages FOR SELECT TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Owners insert their whatsapp messages"
ON public.whatsapp_messages FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners update their whatsapp messages"
ON public.whatsapp_messages FOR UPDATE TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners delete their whatsapp messages"
ON public.whatsapp_messages FOR DELETE TO authenticated
USING (owner_id = auth.uid());