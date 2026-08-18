CREATE OR REPLACE FUNCTION public.rename_member(
  p_event_id UUID,
  p_member_id BIGINT,
  p_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE members
  SET name = p_name
  WHERE id = p_member_id
    AND event_id = p_event_id;
END;
$$;
