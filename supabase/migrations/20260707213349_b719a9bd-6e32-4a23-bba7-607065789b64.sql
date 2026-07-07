DROP POLICY "Users manage their own notifications" ON public.notifications;
CREATE POLICY "Users manage their own notifications" ON public.notifications
FOR ALL TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);