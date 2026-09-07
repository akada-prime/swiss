-- Prime Communes 1.5
-- GemeindeAktuell is the intentional public read projection consumed by the site
-- with the Supabase anon key. security_invoker=true makes the view require
-- direct SELECT rights on every underlying RLS table and forces the frontend
-- onto its local fallback, which drops ERP / modules / hosting data.
-- Keep the underlying tables protected; expose only the curated view contract.

ALTER VIEW public."GemeindeAktuell"
SET (security_invoker = false);
