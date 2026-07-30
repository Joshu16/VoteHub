-- Votos agrupados por grado y partido para estadisticas por generacion

CREATE OR REPLACE FUNCTION public.get_votes_by_grado(p_year integer)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH election AS (
    SELECT id
    FROM public.elections
    WHERE year = p_year
    LIMIT 1
  ),
  vote_counts AS (
    SELECT
      coalesce(nullif(trim(v.grado), ''), 'Sin grado') AS grado,
      p.id AS party_id,
      p.name AS party_name,
      count(*)::bigint AS votes
    FROM public.votes vo
    JOIN election e ON vo.election_id = e.id
    JOIN public.parties p ON p.id = vo.party_id
    LEFT JOIN public.voters v ON v.cedula = vo.voter_cedula
    WHERE lower(trim(p.name)) <> 'voto nulo'
    GROUP BY 1, p.id, p.name
  )
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'grado', grado,
        'party_id', party_id,
        'party_name', party_name,
        'votes', votes
      )
      ORDER BY grado, party_name
    ),
    '[]'::jsonb
  )
  FROM vote_counts;
$$;

GRANT EXECUTE ON FUNCTION public.get_votes_by_grado(integer) TO anon, authenticated;
