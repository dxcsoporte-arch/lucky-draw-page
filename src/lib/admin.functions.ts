import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchAdminRaffle, setRaffleNumberStatus } from "./admin.server";
import { adminRaffleSchema, updateNumberSchema } from "./admin.schemas";

export const getAdminRaffle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => adminRaffleSchema.parse(input))
  .handler(({ data, context }) => fetchAdminRaffle(context, data.raffleId));

export const updateRaffleNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateNumberSchema.parse(input))
  .handler(({ data, context }) => setRaffleNumberStatus(context, data));