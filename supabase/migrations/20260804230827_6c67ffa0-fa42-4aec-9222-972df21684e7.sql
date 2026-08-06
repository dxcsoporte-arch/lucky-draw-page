CREATE OR REPLACE FUNCTION public.reserve_raffle_numbers(p_raffle_id UUID, p_phone TEXT, p_numbers INTEGER[])
RETURNS TABLE(reservation_id UUID, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID := gen_random_uuid();
  new_expiry TIMESTAMPTZ := now() + interval '1 hour';
  requested_count INTEGER;
  existing_pending_count INTEGER;
  updated_count INTEGER;
BEGIN
  IF p_phone !~ '^[1-9][0-9]{9,14}$' THEN
    RAISE EXCEPTION 'invalid_phone';
  END IF;

  requested_count := cardinality(p_numbers);
  IF requested_count IS NULL
     OR requested_count < 1
     OR requested_count > 10
     OR requested_count <> (SELECT count(DISTINCT n) FROM unnest(p_numbers) n) THEN
    RAISE EXCEPTION 'invalid_numbers';
  END IF;

  IF EXISTS (SELECT 1 FROM unnest(p_numbers) n WHERE n < 0 OR n > 499) THEN
    RAISE EXCEPTION 'invalid_numbers';
  END IF;

  PERFORM public.release_expired_reservations();

  PERFORM pg_advisory_xact_lock(hashtext(p_raffle_id::text || ':' || p_phone));

  SELECT count(*)::INTEGER
    INTO existing_pending_count
  FROM public.raffle_numbers rn
  JOIN public.reservations r ON r.id = rn.reservation_id
  WHERE r.raffle_id = p_raffle_id
    AND r.phone = p_phone
    AND r.status = 'pending'
    AND r.expires_at > now();

  IF existing_pending_count + requested_count > 10 THEN
    RAISE EXCEPTION 'user_limit_exceeded';
  END IF;

  INSERT INTO public.reservations(id, raffle_id, phone, expires_at)
  SELECT new_id, p_raffle_id, p_phone, new_expiry
  WHERE EXISTS (
    SELECT 1 FROM public.raffles
    WHERE id = p_raffle_id AND status = 'active'
  );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'raffle_not_active';
  END IF;

  UPDATE public.raffle_numbers
  SET status = 'reserved', reservation_id = new_id, reserved_until = new_expiry
  WHERE raffle_id = p_raffle_id
    AND number = ANY(p_numbers)
    AND status = 'available';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> requested_count THEN
    RAISE EXCEPTION 'numbers_unavailable';
  END IF;

  RETURN QUERY SELECT new_id, new_expiry;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_raffle_numbers(UUID,TEXT,INTEGER[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_raffle_numbers(UUID,TEXT,INTEGER[]) TO service_role;