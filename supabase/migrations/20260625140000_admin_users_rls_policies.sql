-- Politicas RLS para admin_users (la app verifica OTP y mantiene sesion Supabase)

CREATE OR REPLACE FUNCTION public.is_votehub_principal_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'jsaborio1604@gmail.com'
    OR EXISTS (
      SELECT 1
      FROM public.admin_users
      WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        AND is_principal = true
    );
$$;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_select" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_insert" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_delete" ON public.admin_users;

CREATE POLICY "admin_users_select"
  ON public.admin_users
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "admin_users_insert"
  ON public.admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (is_principal = false AND public.is_votehub_principal_admin());

CREATE POLICY "admin_users_delete"
  ON public.admin_users
  FOR DELETE
  TO authenticated
  USING (is_principal = false AND public.is_votehub_principal_admin());
