CREATE OR REPLACE FUNCTION public.reserve_raffle_numbers(
  p_raffle_id uuid,
  p_phone text,
  p_numbers integer[]
)
RETURNS TABLE(reservation_id uuid, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_id uuid := gen_random_uuid();
  new_expiry timestamptz := now() + interval '1 hour';
  requested_count integer;
  existing_pending_count integer;
  updated_count integer;
BEGIN
  IF p_phone IS NULL OR p_phone !~ '^[1-9][0-9]{9,14}$' THEN
    RAISE EXCEPTION 'invalid_phone';
  END IF;

  requested_count := cardinality(p_numbers);
  IF requested_count IS NULL
     OR requested_count < 1
     OR requested_count > 10
     OR requested_count <> (SELECT count(DISTINCT n) FROM unnest(p_numbers) AS n) THEN
    RAISE EXCEPTION 'invalid_numbers';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_numbers) AS n
    WHERE n < 0 OR n > 499
  ) THEN
    RAISE EXCEPTION 'invalid_numbers';
  END IF;

  -- Serializa todas las reservas del mismo celular dentro de esta rifa.
  -- La segunda solicitud concurrente espera y vuelve a contar después del commit.
  PERFORM pg_advisory_xact_lock(
    hashtext(p_raffle_id::text),
    hashtext(p_phone)
  );

  PERFORM public.release_expired_reservations();

  SELECT count(*)::integer
  INTO existing_pending_count
  FROM public.raffle_numbers AS rn
  JOIN public.reservations AS r ON r.id = rn.reservation_id
  WHERE r.raffle_id = p_raffle_id
    AND r.phone = p_phone
    AND r.status = 'pending'
    AND r.expires_at > now();

  IF existing_pending_count + requested_count > 10 THEN
    RAISE EXCEPTION 'user_limit_exceeded';
  END IF;

  INSERT INTO public.reservations (id, raffle_id, phone, expires_at)
  SELECT new_id, p_raffle_id, p_phone, new_expiry
  WHERE EXISTS (
    SELECT 1
    FROM public.raffles
    WHERE id = p_raffle_id
      AND status = 'active'
  );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'raffle_not_active';
  END IF;

  UPDATE public.raffle_numbers
  SET status = 'reserved',
      reservation_id = new_id,
      reserved_until = new_expiry
  WHERE raffle_id = p_raffle_id
    AND number = ANY(p_numbers)
    AND status = 'available';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> requested_count THEN
    RAISE EXCEPTION 'numbers_unavailable';
  END IF;

  RETURN QUERY SELECT new_id, new_expiry;
END;
$function$;