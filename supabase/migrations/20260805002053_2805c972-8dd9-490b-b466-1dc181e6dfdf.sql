REVOKE ALL ON FUNCTION public.ensure_initial_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_raffle_number_status(uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_list_reservations(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
DROP FUNCTION public.ensure_initial_admin();
DROP FUNCTION public.admin_set_raffle_number_status(uuid, integer, text);
DROP FUNCTION public.admin_list_reservations(uuid);
DROP FUNCTION public.has_role(uuid, public.app_role);