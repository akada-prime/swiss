-- Prime Communes 1.5
-- Native hosting axis for Prime + innosolvcity clients.
-- Applied to production Supabase on 2026-09-07.

ALTER TABLE public."GemeindeProfil"
DISABLE TRIGGER gemeinde_profil_audit;

CREATE TABLE IF NOT EXISTS public."Hosting" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public."Hosting" IS
'Catalogue des modes/prestataires d’hébergement applicatif utilisés par les communes.';

DROP TRIGGER IF EXISTS hosting_updated_at ON public."Hosting";

CREATE TRIGGER hosting_updated_at
BEFORE UPDATE ON public."Hosting"
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public."GemeindeProfil"
ADD COLUMN IF NOT EXISTS hosting_id uuid
REFERENCES public."Hosting"(id)
ON DELETE SET NULL;

COMMENT ON COLUMN public."GemeindeProfil".hosting_id IS
'Hébergement applicatif courant lorsqu’il est connu. Initialement renseigné pour les clients Prime innosolvcity.';

CREATE INDEX IF NOT EXISTS gemeinde_profil_hosting_idx
ON public."GemeindeProfil"(hosting_id);

INSERT INTO public."Hosting" (code, name)
VALUES
  ('on_premise', 'On-premise'),
  ('az',         'AZ'),
  ('logione',    'LogiONE'),
  ('sysel',      'Sysel'),
  ('yverdon',    'Yverdon')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    active = true,
    updated_at = now();

DO $$
DECLARE
  target_ids integer[] := ARRAY[
    431,432,433,434,435,441,442,443,444,445,446,448,450,
    687,703,706,713,723,724,726,
    2206,2238,
    5414,5427,5451,5477,5480,5487,5495,5498,
    5551,5561,5565,5571,5586,5606,5613,5633,5638,5642,
    5646,5702,5711,5721,5725,5746,5819,5861,5886,5889,
    5890,5892,5922,
    6708,6709,6710,6711,6729,6730,6774,6778,6800,6809,6831
  ];
  matched integer;
BEGIN
  SELECT count(*)
  INTO matched
  FROM public."GemeindeProfil" gp
  JOIN public."Software" sw ON sw.id = gp.software_id
  WHERE gp.bfs_id = ANY(target_ids)
    AND gp.prime_client IS TRUE
    AND lower(sw.name) IN ('innosolvcity', 'innosolv');

  IF matched <> 64 THEN
    RAISE EXCEPTION
      'Hosting migration aborted: expected 64 Prime+innosolvcity municipalities, found %',
      matched;
  END IF;
END $$;

UPDATE public."GemeindeProfil" gp
SET hosting_id = h.id
FROM public."Hosting" h
WHERE h.code = 'on_premise'
  AND gp.bfs_id IN (
    443,446,2206,2238,
    5414,5477,5487,5495,5498,5586,5606,5613,5638,5642,
    5702,5711,5721,5725,5746,5861,5886,5889,5890,5892,5922,
    6711,6831
  );

UPDATE public."GemeindeProfil" gp
SET hosting_id = h.id
FROM public."Hosting" h
WHERE h.code = 'az'
  AND gp.bfs_id IN (
    431,432,433,434,435,441,442,444,445,448,450,687,703,706,
    713,724,726,
    5427,5451,5633,5819,
    6708,6709,6710,6729,6730,6774,6778,6800,6809
  );

UPDATE public."GemeindeProfil" gp
SET hosting_id = h.id
FROM public."Hosting" h
WHERE h.code = 'logione'
  AND gp.bfs_id IN (5480,5646);

UPDATE public."GemeindeProfil" gp
SET hosting_id = h.id
FROM public."Hosting" h
WHERE h.code = 'sysel'
  AND gp.bfs_id = 723;

UPDATE public."GemeindeProfil" gp
SET hosting_id = h.id
FROM public."Hosting" h
WHERE h.code = 'yverdon'
  AND gp.bfs_id IN (5551,5561,5565,5571);

CREATE OR REPLACE VIEW public."GemeindeAktuell" AS
SELECT DISTINCT ON (g.bfs_id)
  g.bfs_id,
  g.name,
  g.canton,
  g.market,
  g.active,
  ds.expected_population,
  ds.received_population,
  ds.received_on,
  ds.delivery_status,
  ds.comment,
  ds.ech_version,
  ds.missing_ewid,
  ds.ewid_error_rate,
  vp.name AS integrator,
  sw.name AS software,
  gp.sales_status,
  gp.confidence,
  gp.notes,
  gp.updated_at AS profile_updated_at,
  di.reference_date,
  di.completed_at AS delimo_updated_at,
  COALESCE((
    SELECT array_agg(p.name ORDER BY p.name)
    FROM public."GemeindeProduct" gpr
    JOIN public."Product" p ON p.id = gpr.product_id
    WHERE gpr.bfs_id = g.bfs_id
  ), '{}'::text[]) AS products,
  g.bezirk_code,
  b.name AS bezirk,
  gp.prime_client,
  erp.name AS erp,
  erp.code AS erp_code,
  hosting.name AS hosting,
  hosting.code AS hosting_code
FROM public."Gemeinde" g
LEFT JOIN public."Bezirk" b
  ON b.code = g.bezirk_code
LEFT JOIN public."GemeindeProfil" gp
  ON gp.bfs_id = g.bfs_id
LEFT JOIN public."VP" vp
  ON vp.id = gp.vp_id
LEFT JOIN public."Software" sw
  ON sw.id = gp.software_id
LEFT JOIN public."ERP" erp
  ON erp.id = gp.erp_id
LEFT JOIN public."Hosting" hosting
  ON hosting.id = gp.hosting_id
LEFT JOIN public."DelimoStand" ds
  ON ds.bfs_id = g.bfs_id
LEFT JOIN public."DelimoImport" di
  ON di.id = ds.import_id
 AND di.status = 'success'
ORDER BY
  g.bfs_id,
  di.completed_at DESC NULLS LAST;

ALTER TABLE public."Hosting" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS authenticated_read_hosting
ON public."Hosting";

CREATE POLICY authenticated_read_hosting
ON public."Hosting"
FOR SELECT
TO authenticated
USING (true);

GRANT SELECT ON public."Hosting" TO authenticated;
GRANT SELECT ON public."GemeindeAktuell" TO anon, authenticated;
