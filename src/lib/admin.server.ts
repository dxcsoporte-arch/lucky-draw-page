type AdminContext = {
  userId: string;
  claims: Record<string, unknown>;
};

const ADMIN_EMAIL = "dxcsoporte@gmail.com";

async function requireAdmin(context: AdminContext) {
  const email = typeof context.claims["email"] === "string" ? context.claims["email"].toLowerCase() : "";
  if (email !== ADMIN_EMAIL) throw new Error("No tienes permiso para administrar esta rifa.");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error: roleError } = await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });
  if (roleError) throw new Error("No pudimos validar el acceso de administrador.");

  const { data: role } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) throw new Error("No tienes permiso para administrar esta rifa.");
  return supabaseAdmin;
}

export async function fetchAdminRaffle(context: AdminContext, raffleId: string) {
  const client = await requireAdmin(context);
  await client.rpc("release_expired_reservations");
  const [{ data: raffle, error: raffleError }, { data: numbers, error: numberError }, { data: reservations, error: reservationError }] = await Promise.all([
    client.from("raffles").select("id,name,ticket_price").eq("id", raffleId).single(),
    client.from("raffle_numbers").select("number,status,reserved_until,reservation_id").eq("raffle_id", raffleId).order("number"),
    client.from("reservations").select("id,phone,status,expires_at,created_at").eq("raffle_id", raffleId).order("created_at", { ascending: false }).limit(100),
  ]);
  if (raffleError || numberError || reservationError || !raffle) throw new Error("No pudimos cargar el panel.");

  const numberRows = numbers ?? [];
  return {
    raffle,
    numbers: numberRows,
    reservations: (reservations ?? []).map((reservation) => ({
      ...reservation,
      numbers: numberRows.filter((item) => item.reservation_id === reservation.id).map((item) => item.number),
    })),
  };
}

export async function setRaffleNumberStatus(
  context: AdminContext,
  input: { raffleId: string; number: number; status: "paid" | "available" },
) {
  const client = await requireAdmin(context);
  const { data: current, error: currentError } = await client
    .from("raffle_numbers")
    .select("reservation_id")
    .eq("raffle_id", input.raffleId)
    .eq("number", input.number)
    .single();
  if (currentError) throw new Error("No encontramos ese boleto.");

  const { error } = await client
    .from("raffle_numbers")
    .update(input.status === "paid"
      ? { status: "paid", reserved_until: null }
      : { status: "available", reservation_id: null, reserved_until: null })
    .eq("raffle_id", input.raffleId)
    .eq("number", input.number);
  if (error) throw new Error("No pudimos actualizar el boleto.");

  if (current.reservation_id) {
    const { data: linked } = await client
      .from("raffle_numbers")
      .select("status")
      .eq("reservation_id", current.reservation_id);
    const allPaid = Boolean(linked?.length) && linked?.every((item) => item.status === "paid");
    await client.from("reservations").update({ status: allPaid ? "paid" : "pending" }).eq("id", current.reservation_id);
  }
  return { ok: true };
}