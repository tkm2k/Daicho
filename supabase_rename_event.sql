CREATE OR REPLACE FUNCTION rename_event(p_event_id uuid, p_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  trimmed text := trim(p_name);
BEGIN
  IF trimmed IS NULL OR length(trimmed) = 0 THEN
    RAISE EXCEPTION 'Event name must not be empty';
  END IF;
  IF length(p_name) > 100 THEN
    RAISE EXCEPTION 'Event name must be 100 characters or less';
  END IF;

  UPDATE events SET name = trimmed WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
END;
$$;
