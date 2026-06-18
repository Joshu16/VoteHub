-- Contenido editable de la pagina de informacion publica (fila unica id = 1)

CREATE TABLE IF NOT EXISTS public.landing_content (
  id integer PRIMARY KEY CHECK (id = 1),
  hero_title text NOT NULL DEFAULT '',
  hero_subtitle text NOT NULL DEFAULT '',
  hero_cta_label text NOT NULL DEFAULT '',
  current_party_name text NOT NULL DEFAULT '',
  current_party_description text NOT NULL DEFAULT '',
  current_party_image text,
  current_party_members text NOT NULL DEFAULT '[]',
  important_dates text NOT NULL DEFAULT '[]',
  extra_sections text NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.landing_content (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.landing_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "landing_content_select" ON public.landing_content;
DROP POLICY IF EXISTS "landing_content_insert" ON public.landing_content;
DROP POLICY IF EXISTS "landing_content_update" ON public.landing_content;

CREATE POLICY "landing_content_select"
  ON public.landing_content
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "landing_content_insert"
  ON public.landing_content
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "landing_content_update"
  ON public.landing_content
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.landing_content TO anon, authenticated;
