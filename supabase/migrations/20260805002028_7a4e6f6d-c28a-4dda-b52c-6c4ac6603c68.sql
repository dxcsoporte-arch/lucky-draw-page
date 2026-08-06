CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_initial_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR lower(COALESCE(auth.jwt() ->> 'email', '')) <> 'dxcsoporte@gmail.com' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_initial_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_raffle_number_status(
  p_raffle_id uuid,
  p_number integer,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_reservation_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_number < 0 OR p_number > 499 OR p_status NOT IN ('paid', 'available') THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;

  SELECT reservation_id INTO current_reservation_id
  FROM public.raffle_numbers
  WHERE raffle_id = p_raffle_id AND number = p_number
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'number_not_found'; END IF;

  IF p_status = 'paid' THEN
    UPDATE public.raffle_numbers
    SET status = 'paid', reserved_until = NULL
    WHERE raffle_id = p_raffle_id AND number = p_number;

    IF current_reservation_id IS NOT NULL THEN
      UPDATE public.reservations SET status = 'paid'
      WHERE id = current_reservation_id;
    END IF;
  ELSE
    UPDATE public.raffle_numbers
    SET status = 'available', reservation_id = NULL, reserved_until = NULL
    WHERE raffle_id = p_raffle_id AND number = p_number;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_raffle_number_status(uuid, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_reservations(p_raffle_id uuid)
RETURNS TABLE(
  id uuid,
  phone text,
  status text,
  expires_at timestamptz,
  created_at timestamptz,
  numbers integer[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  PERFORM public.release_expired_reservations();

  RETURN QUERY
  SELECT r.id, r.phone, r.status, r.expires_at, r.created_at,
    COALESCE(array_agg(rn.number ORDER BY rn.number) FILTER (WHERE rn.number IS NOT NULL), ARRAY[]::integer[])
  FROM public.reservations r
  LEFT JOIN public.raffle_numbers rn ON rn.reservation_id = r.id
  WHERE r.raffle_id = p_raffle_id
  GROUP BY r.id, r.phone, r.status, r.expires_at, r.created_at
  ORDER BY r.created_at DESC
  LIMIT 100;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_reservations(uuid) TO authenticated;