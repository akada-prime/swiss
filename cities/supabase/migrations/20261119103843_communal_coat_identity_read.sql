-- Only the public OFS identifier is needed to validate image-cache requests.
grant select (bfs_id) on public."Gemeinde" to service_role;
