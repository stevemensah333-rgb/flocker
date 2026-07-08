-- 1. downloads: validate the platform value on public inserts
DROP POLICY IF EXISTS "Anyone can record a download" ON public.downloads;
CREATE POLICY "Anyone can record a valid download"
ON public.downloads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  platform IN ('mac', 'windows', 'linux', 'android', 'ios', 'web')
);

-- 2. feedback: validate rating range and message length on public inserts
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;
CREATE POLICY "Anyone can submit valid feedback"
ON public.feedback
FOR INSERT
TO anon, authenticated
WITH CHECK (
  rating BETWEEN 1 AND 5
  AND char_length(message) BETWEEN 1 AND 2000
);

-- 3. user_roles: explicit admin-only write policies (prevent privilege escalation)
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Restrict EXECUTE on SECURITY DEFINER functions.
-- Trigger functions are never called directly via the API.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_flock_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_new_coop() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- has_role is used inside RLS policies evaluated for authenticated users only.
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;