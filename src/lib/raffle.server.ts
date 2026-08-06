import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const RAFFLE_ID = "11111111-1111-4111-8111-111111111111";

function createPublicClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("La configuración de la rifa no está disponible");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export async function fetchRaffle() {
  const client = createPublicClient();
  const [{ data: raffle, error: raffleError }, { data: numbers, error: numbersError }] =
    await Promise.all([
      client
        .from("raffles")
        .select("id,name,prize_name,prize_description,ticket_price,draw_date,whatsapp_number,logo_url,prize_image_url")
        .eq("id", RAFFLE_ID)
        .single(),
      client
        .from("raffle_numbers")
        .select("number,status,reserved_until")
        .eq("raffle_id", RAFFLE_ID)
        .order("number"),
    ]);
  if (raffleError || numbersError || !raffle) throw new Error("No pudimos cargar la rifa");
  const now = Date.now();
  return {
    raffle,
    numbers: (numbers ?? []).map((item) => ({
      ...item,
      status:
        item.status === "reserved" && item.reserved_until && Date.parse(item.reserved_until) <= now
          ? "available"
          : item.status,
    })),
  };
}

export async function reserveNumbers(input: {
  raffleId: string;
  phone: string;
  numbers: number[];
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("reserve_raffle_numbers", {
    p_raffle_id: input.raffleId,
    p_phone: input.phone,
    p_numbers: input.numbers,
  });
  if (error) {
    if (error.message.includes("user_limit_exceeded") || error.message.includes("invalid_numbers")) {
      throw new Error("Solo puedes tener hasta 10 números apartados por celular.");
    }
    if (error.message.includes("numbers_unavailable")) {
      throw new Error("Uno o más números acaban de ser apartados. Actualiza e intenta de nuevo.");
    }
    throw new Error("No pudimos crear el apartado. Revisa tus datos e intenta de nuevo.");
  }
  const reservation = data?.[0];
  if (!reservation) throw new Error("No pudimos confirmar el apartado");
  return reservation;
}

export async function findReservations(input: { raffleId: string; phone: string }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.rpc("release_expired_reservations");
  const { data: reservations, error } = await supabaseAdmin
    .from("reservations")
    .select("id,status,expires_at,created_at")
    .eq("raffle_id", input.raffleId)
    .eq("phone", input.phone)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw new Error("No pudimos consultar tus apartados");
  const ids = (reservations ?? []).map((item) => item.id);
  if (!ids.length) return [];
  const { data: numbers } = await supabaseAdmin
    .from("raffle_numbers")
    .select("reservation_id,number")
    .in("reservation_id", ids)
    .order("number");
  return (reservations ?? []).map((reservation) => ({
    ...reservation,
    numbers: (numbers ?? [])
      .filter((item) => item.reservation_id === reservation.id)
      .map((item) => item.number),
  }));
}