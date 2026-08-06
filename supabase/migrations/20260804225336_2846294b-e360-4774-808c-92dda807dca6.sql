CREATE TABLE public.raffles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  prize_name TEXT NOT NULL CHECK (char_length(prize_name) BETWEEN 2 AND 140),
  prize_description TEXT NOT NULL DEFAULT '' CHECK (char_length(prize_description) <= 500),
  prize_image_url TEXT,
  logo_url TEXT,
  ticket_price NUMERIC(10,2) NOT NULL CHECK (ticket_price > 0),
  draw_date TIMESTAMPTZ,
  whatsapp_number TEXT NOT NULL CHECK (whatsapp_number ~ '^[1-9][0-9]{9,14}$'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.raffles TO anon, authenticated;
GRANT ALL ON public.raffles TO service_role;
ALTER TABLE public.raffles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active raffles" ON public.raffles FOR SELECT TO anon, authenticated USING (status = 'active');

CREATE TABLE public.raffle_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  number INTEGER NOT NULL CHECK (number BETWEEN 0 AND 499),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','reserved','paid')),
  reservation_id UUID,
  reserved_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (raffle_id, number)
);
GRANT SELECT ON public.raffle_numbers TO anon, authenticated;
GRANT ALL ON public.raffle_numbers TO service_role;
ALTER TABLE public.raffle_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view raffle number status" ON public.raffle_numbers FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  phone TEXT NOT NULL CHECK (phone ~ '^[1-9][0-9]{9,14}$'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','expired','cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.reservations TO service_role;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.raffle_numbers ADD CONSTRAINT raffle_numbers_reservation_fk FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE SET NULL;
CREATE INDEX raffle_numbers_raffle_status_idx ON public.raffle_numbers(raffle_id, status);
CREATE INDEX reservations_phone_idx ON public.reservations(phone, created_at DESC);
CREATE INDEX reservations_expiry_idx ON public.reservations(status, expires_at);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER set_raffles_updated_at BEFORE UPDATE ON public.raffles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_raffle_numbers_updated_at BEFORE UPDATE ON public.raffle_numbers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_reservations_updated_at BEFORE UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.release_expired_reservations() RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE released_count INTEGER;
BEGIN
  UPDATE public.raffle_numbers rn SET status = 'available', reservation_id = NULL, reserved_until = NULL
  FROM public.reservations r
  WHERE rn.reservation_id = r.id AND r.status = 'pending' AND r.expires_at <= now();
  GET DIAGNOSTICS released_count = ROW_COUNT;
  UPDATE public.reservations SET status = 'expired' WHERE status = 'pending' AND expires_at <= now();
  RETURN released_count;
END; $$;
REVOKE ALL ON FUNCTION public.release_expired_reservations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_reservations() TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_raffle_numbers(p_raffle_id UUID, p_phone TEXT, p_numbers INTEGER[])
RETURNS TABLE(reservation_id UUID, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id UUID := gen_random_uuid(); new_expiry TIMESTAMPTZ := now() + interval '1 hour'; requested_count INTEGER; updated_count INTEGER;
BEGIN
  IF p_phone !~ '^[1-9][0-9]{9,14}$' THEN RAISE EXCEPTION 'invalid_phone'; END IF;
  requested_count := cardinality(p_numbers);
  IF requested_count IS NULL OR requested_count < 1 OR requested_count > 20 OR requested_count <> (SELECT count(DISTINCT n) FROM unnest(p_numbers) n) THEN RAISE EXCEPTION 'invalid_numbers'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_numbers) n WHERE n < 0 OR n > 499) THEN RAISE EXCEPTION 'invalid_numbers'; END IF;
  PERFORM public.release_expired_reservations();
  INSERT INTO public.reservations(id, raffle_id, phone, expires_at) SELECT new_id, p_raffle_id, p_phone, new_expiry WHERE EXISTS (SELECT 1 FROM public.raffles WHERE id = p_raffle_id AND status = 'active');
  IF NOT FOUND THEN RAISE EXCEPTION 'raffle_not_active'; END IF;
  UPDATE public.raffle_numbers SET status='reserved', reservation_id=new_id, reserved_until=new_expiry WHERE raffle_id=p_raffle_id AND number=ANY(p_numbers) AND status='available';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> requested_count THEN RAISE EXCEPTION 'numbers_unavailable'; END IF;
  RETURN QUERY SELECT new_id, new_expiry;
END; $$;
REVOKE ALL ON FUNCTION public.reserve_raffle_numbers(UUID,TEXT,INTEGER[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_raffle_numbers(UUID,TEXT,INTEGER[]) TO service_role;

INSERT INTO public.raffles (id, name, prize_name, prize_description, ticket_price, draw_date, whatsapp_number, status)
VALUES ('11111111-1111-4111-8111-111111111111', 'Rifas La Suerte', 'Ford Raptor 2024', 'Una camioneta espectacular, lista para estrenar. También puedes personalizar aquí el premio de tu próxima rifa.', 250, now() + interval '30 days', '521234567890', 'active');
INSERT INTO public.raffle_numbers (raffle_id, number)
SELECT '11111111-1111-4111-8111-111111111111', generate_series(0,499);