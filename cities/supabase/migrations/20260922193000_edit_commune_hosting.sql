-- Extend the existing key-protected municipal editor with the Hosting catalogue.
-- Keep v11 callable by older clients while the frontend switches to v12.
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

  UPDATE public."GemeindeProfil"
  SET vp_id = v_vp_id,
      software_id = v_software_id,
      erp_id = v_erp_id,
      hosting_id = v_hosting_id,
      prime_client = coalesce(p_prime_client, false),
      notes = coalesce(p_notes, '')
  WHERE bfs_id = p_bfs_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil communal manquant'; END IF;

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
