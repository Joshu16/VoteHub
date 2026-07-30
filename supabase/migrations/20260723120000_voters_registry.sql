-- Padron electoral en Supabase (por grado) con funciones RPC optimizadas

CREATE TABLE IF NOT EXISTS public.voters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cedula text NOT NULL,
  nombre text NOT NULL DEFAULT '',
  primer_apellido text NOT NULL DEFAULT '',
  segundo_apellido text NOT NULL DEFAULT '',
  grado text NOT NULL DEFAULT '',
  especialidad text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT voters_cedula_unique UNIQUE (cedula)
);

CREATE INDEX IF NOT EXISTS voters_cedula_idx ON public.voters (cedula);
CREATE INDEX IF NOT EXISTS voters_grado_idx ON public.voters (grado);

ALTER TABLE public.voters ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_votehub_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_votehub_principal_admin()
    OR EXISTS (
      SELECT 1
      FROM public.admin_users
      WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
$$;

CREATE OR REPLACE FUNCTION public.get_voter_by_cedula(p_cedula text)
RETURNS TABLE (
  cedula text,
  nombre text,
  primer_apellido text,
  segundo_apellido text,
  grado text,
  especialidad text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.cedula,
    v.nombre,
    v.primer_apellido,
    v.segundo_apellido,
    v.grado,
    v.especialidad
  FROM public.voters v
  WHERE v.cedula = regexp_replace(coalesce(p_cedula, ''), '\D', '', 'g')
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_voters_registry_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total', (SELECT count(*)::bigint FROM public.voters),
    'by_grado', coalesce((
      SELECT jsonb_object_agg(grado, cnt)
      FROM (
        SELECT grado, count(*)::bigint AS cnt
        FROM public.voters
        GROUP BY grado
        ORDER BY grado
      ) s
    ), '{}'::jsonb)
  );
$$;

CREATE OR REPLACE FUNCTION public.replace_voters_registry(p_voters jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count bigint;
BEGIN
  IF NOT public.is_votehub_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_voters IS NULL OR jsonb_typeof(p_voters) <> 'array' THEN
    RAISE EXCEPTION 'Formato invalido';
  END IF;

  TRUNCATE public.voters;

  INSERT INTO public.voters (cedula, nombre, primer_apellido, segundo_apellido, grado, especialidad)
  SELECT
    cedula,
    nombre,
    primer_apellido,
    segundo_apellido,
    grado,
    especialidad
  FROM (
    SELECT DISTINCT ON (cedula)
      regexp_replace(coalesce(r.cedula, ''), '\D', '', 'g') AS cedula,
      trim(coalesce(r.nombre, '')) AS nombre,
      trim(coalesce(r.primer_apellido, '')) AS primer_apellido,
      trim(coalesce(r.segundo_apellido, '')) AS segundo_apellido,
      trim(coalesce(r.grado, '')) AS grado,
      trim(coalesce(r.especialidad, '')) AS especialidad
    FROM jsonb_to_recordset(p_voters) AS r(
      cedula text,
      nombre text,
      primer_apellido text,
      segundo_apellido text,
      grado text,
      especialidad text
    )
    WHERE regexp_replace(coalesce(r.cedula, ''), '\D', '', 'g') <> ''
    ORDER BY cedula
  ) deduped;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  RETURN jsonb_build_object('inserted', inserted_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_voter_by_cedula(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_voters_registry_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_voters_registry(jsonb) TO authenticated;
