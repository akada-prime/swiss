-- Restore the public live view security contract after CREATE OR REPLACE VIEW.
-- No business data is modified.

ALTER VIEW public."GemeindeAktuell"
SET (security_invoker = true);
