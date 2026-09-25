-- Create municipal profiles only as they are edited. Keep the existing key-protected RPC.
CREATE OR REPLACE FUNCTION public.save_commune_profile_v12(
  p_key text,
  p_bfs_id integer,
  p_prime_client boolean,
  p_integrator text,
  p_software text,
  p_erp text,
  p_products text[],
  p_notes text,
  p_hosting text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_expected_hash text;
  v_vp_id uuid;
  v_software_id uuid;
  v_erp_id uuid;
  v_hosting_id uuid;
  v_unknown_products integer;
BEGIN
  SELECT key_hash INTO v_expected_hash
  FROM public."PrimeCommunesEditConfig" WHERE id = true;

  IF v_expected_hash IS NULL
     OR encode(extensions.digest(coalesce(p_key, ''), 'sha256'), 'hex') <> v_expected_hash THEN
    RAISE EXCEPTION 'Clé d''édition invalide' USING errcode = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public."Gemeinde" WHERE bfs_id = p_bfs_id) THEN
    RAISE EXCEPTION 'Commune OFS inconnue';
  END IF;
  IF length(coalesce(p_notes, '')) > 4000 THEN
    RAISE EXCEPTION 'Notes trop longues';
  END IF;

  IF nullif(btrim(coalesce(p_integrator, '')), '') IS NOT NULL THEN
    SELECT id INTO v_vp_id FROM public."VP"
    WHERE lower(name) = lower(btrim(p_integrator)) LIMIT 1;
    IF v_vp_id IS NULL THEN RAISE EXCEPTION 'Intégrateur inconnu'; END IF;
  END IF;
  IF nullif(btrim(coalesce(p_software, '')), '') IS NOT NULL THEN
    SELECT id INTO v_software_id FROM public."Software"
    WHERE active = true AND (lower(name) = lower(btrim(p_software)) OR lower(code) = lower(btrim(p_software))) LIMIT 1;
    IF v_software_id IS NULL THEN RAISE EXCEPTION 'Métier inconnu'; END IF;
  END IF;
  IF nullif(btrim(coalesce(p_erp, '')), '') IS NOT NULL THEN
    SELECT id INTO v_erp_id FROM public."ERP"
    WHERE active = true AND (lower(name) = lower(btrim(p_erp)) OR lower(code) = lower(btrim(p_erp))) LIMIT 1;
    IF v_erp_id IS NULL THEN RAISE EXCEPTION 'ERP inconnu'; END IF;
  END IF;
  IF nullif(btrim(coalesce(p_hosting, '')), '') IS NOT NULL THEN
    SELECT id INTO v_hosting_id FROM public."Hosting"
    WHERE active = true AND (lower(name) = lower(btrim(p_hosting)) OR lower(code) = lower(btrim(p_hosting))) LIMIT 1;
    IF v_hosting_id IS NULL THEN RAISE EXCEPTION 'Hébergeur inconnu'; END IF;
  END IF;

  SELECT count(*) INTO v_unknown_products
  FROM unnest(coalesce(p_products, '{}'::text[])) wanted(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM public."Product" p
    WHERE p.active = true AND lower(p.name) = lower(wanted.name)
  );
  IF v_unknown_products > 0 THEN RAISE EXCEPTION 'Module inconnu'; END IF;

  INSERT INTO public."GemeindeProfil" (
    bfs_id, vp_id, software_id, erp_id, hosting_id, prime_client, notes
  ) VALUES (
    p_bfs_id, v_vp_id, v_software_id, v_erp_id, v_hosting_id,
    coalesce(p_prime_client, false), coalesce(p_notes, '')
  )
  ON CONFLICT (bfs_id) DO UPDATE SET
    vp_id = excluded.vp_id,
    software_id = excluded.software_id,
    erp_id = excluded.erp_id,
    hosting_id = excluded.hosting_id,
    prime_client = excluded.prime_client,
    notes = excluded.notes;

  DELETE FROM public."GemeindeProduct" WHERE bfs_id = p_bfs_id;
  INSERT INTO public."GemeindeProduct" (bfs_id, product_id, confidence, notes)
  SELECT p_bfs_id, p.id, 'confirmed', 'Édition Prime Communes 1.1'
  FROM public."Product" p
  JOIN unnest(coalesce(p_products, '{}'::text[])) wanted(name)
    ON lower(p.name) = lower(wanted.name)
  WHERE p.active = true
  ON CONFLICT (bfs_id, product_id) DO UPDATE
  SET confidence = excluded.confidence,
      notes = excluded.notes,
      updated_at = now();

  RETURN jsonb_build_object('ok', true, 'bfs_id', p_bfs_id);
END;
$$;

REVOKE ALL ON FUNCTION public.save_commune_profile_v12(text, integer, boolean, text, text, text, text[], text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_commune_profile_v12(text, integer, boolean, text, text, text, text[], text, text) TO anon, authenticated;


-- Catalogue and hosting for all municipalities already identified as BDI.
INSERT INTO public."Hosting" (code, name) VALUES ('ofisa', 'Ofisa')
ON CONFLICT (code) DO UPDATE SET name = excluded.name, active = true;

UPDATE public."GemeindeProfil" gp
SET hosting_id = h.id
FROM public."Software" sw, public."Hosting" h
WHERE sw.id = gp.software_id AND lower(sw.name) = 'bdi'
  AND h.code = 'ofisa' AND gp.hosting_id IS DISTINCT FROM h.id;

-- Marché VS 2026.xlsx: match the 30 edited rows by canton, name and stable OFS ID.
DO $$
BEGIN
  IF (SELECT count(*) FROM public."Gemeinde" g WHERE g.canton = 'VS'
      AND (g.name, g.bfs_id) IN (('Sion', 6266),
        ('Martigny', 6136),
        ('Monthey', 6153),
        ('Val de Bagnes', 6037),
        ('Crans-Montana', 6253),
        ('Fully', 6133),
        ('Savièse', 6265),
        ('Troistorrents', 6156),
        ('Saint-Maurice', 6217),
        ('Lens', 6240),
        ('Chamoson', 6022),
        ('Grimisuat', 6263),
        ('Chalais', 6232),
        ('Orsières', 6034),
        ('Saillon', 6140),
        ('Vionnaz', 6158),
        ('Anniviers', 6252),
        ('Val-d''Illiez', 6157),
        ('Massongex', 6215),
        ('Chippis', 6235),
        ('Arbaz', 6261),
        ('Mont-Noble', 6090),
        ('Dorénaz', 6212),
        ('Vérossaz', 6220),
        ('Collonges', 6211),
        ('Saint-Martin (VS)', 6087),
        ('Liddes', 6033),
        ('Icogne', 6239),
        ('Veysonnaz', 6267),
        ('Bourg-Saint-Pierre', 6032))) <> 30 THEN
    RAISE EXCEPTION 'VS source no longer matches its 30 OFS identifiers';
  END IF;
END $$;

INSERT INTO public."GemeindeProfil" (bfs_id)
SELECT g.bfs_id FROM public."Gemeinde" g
WHERE g.canton = 'VS' AND g.bfs_id IN (6266, 6136, 6153, 6037, 6253, 6133, 6265, 6156, 6217, 6240, 6022, 6263, 6232, 6034, 6140, 6158, 6252, 6157, 6215, 6235, 6261, 6090, 6212, 6220, 6211, 6087, 6033, 6239, 6267, 6032)
ON CONFLICT (bfs_id) DO NOTHING;

UPDATE public."GemeindeProfil" gp SET erp_id = e.id
FROM public."ERP" e WHERE lower(e.name) = 'abacus'
AND gp.bfs_id IN (6266, 6136, 6037, 6253, 6133, 6265, 6217, 6240, 6022, 6263, 6232, 6034, 6140, 6252, 6215, 6235, 6261, 6090, 6212, 6220, 6211, 6087, 6033, 6239, 6267, 6032);

UPDATE public."GemeindeProfil" gp SET vp_id = v.id
FROM public."VP" v WHERE lower(v.name) = 'ciges'
AND gp.bfs_id IN (6133, 6265, 6217, 6240, 6022, 6263, 6232, 6034, 6140, 6252, 6215, 6235, 6261, 6090, 6212, 6220, 6211, 6087, 6033, 6239, 6267, 6032);

UPDATE public."GemeindeProfil" gp SET software_id = s.id
FROM public."Software" s WHERE lower(s.name) = 'innosolvcity'
AND gp.bfs_id IN (6133, 6265, 6217, 6240, 6022, 6263, 6232, 6034, 6140, 6252, 6215, 6235, 6261, 6090, 6212, 6220, 6211, 6087, 6033, 6239, 6267, 6032);

-- The last three spreadsheet columns are comments; preserve prior notes.
UPDATE public."GemeindeProfil" SET notes = CASE
  WHEN position('Ciges : Actionnaire' in notes) > 0 THEN notes
  ELSE concat_ws(E'\n', nullif(btrim(notes), ''), 'Ciges : Actionnaire')
END WHERE bfs_id = 6266;
UPDATE public."GemeindeProfil" SET notes = CASE
  WHEN position('Commentaires : Pas content (était chez Ofisa)' in notes) > 0 THEN notes
  ELSE concat_ws(E'\n', nullif(btrim(notes), ''), 'Commentaires : Pas content (était chez Ofisa)')
END WHERE bfs_id = 6136;
UPDATE public."GemeindeProfil" SET notes = CASE
  WHEN position('Commentaires : En cours' in notes) > 0 THEN notes
  ELSE concat_ws(E'\n', nullif(btrim(notes), ''), 'Commentaires : En cours')
END WHERE bfs_id = 6153;
UPDATE public."GemeindeProfil" SET notes = CASE
  WHEN position('Ciges : Actionnaire' in notes) > 0 THEN notes
  ELSE concat_ws(E'\n', nullif(btrim(notes), ''), 'Ciges : Actionnaire')
END WHERE bfs_id = 6037;
UPDATE public."GemeindeProfil" SET notes = CASE
  WHEN position('Modules Extra : HRM Salaires' in notes) > 0 THEN notes
  ELSE concat_ws(E'\n', nullif(btrim(notes), ''), 'Modules Extra : HRM Salaires')
END WHERE bfs_id = 6253;
UPDATE public."GemeindeProfil" SET notes = CASE
  WHEN position('Ciges : Actionnaire' in notes) > 0 THEN notes
  ELSE concat_ws(E'\n', nullif(btrim(notes), ''), 'Ciges : Actionnaire')
END WHERE bfs_id = 6265;
UPDATE public."GemeindeProfil" SET notes = CASE
  WHEN position('Commentaires : AO mais pas bougé...' in notes) > 0 THEN notes
  ELSE concat_ws(E'\n', nullif(btrim(notes), ''), 'Commentaires : AO mais pas bougé...')
END WHERE bfs_id = 6156;
UPDATE public."GemeindeProfil" SET notes = CASE
  WHEN position('Commentaires : Ex-Ciges' in notes) > 0 THEN notes
  ELSE concat_ws(E'\n', nullif(btrim(notes), ''), 'Commentaires : Ex-Ciges')
END WHERE bfs_id = 6158;
UPDATE public."GemeindeProfil" SET notes = CASE
  WHEN position('Ciges : Futur-Actionnaire' in notes) > 0 THEN notes
  ELSE concat_ws(E'\n', nullif(btrim(notes), ''), 'Ciges : Futur-Actionnaire')
END WHERE bfs_id = 6252;
UPDATE public."GemeindeProfil" SET notes = CASE
  WHEN position('Commentaires : AO mais pas bougé...' in notes) > 0 THEN notes
  ELSE concat_ws(E'\n', nullif(btrim(notes), ''), 'Commentaires : AO mais pas bougé...')
END WHERE bfs_id = 6157;
