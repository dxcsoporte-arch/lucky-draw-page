import { z } from "zod";

export const adminRaffleSchema = z.object({
  raffleId: z.string().uuid(),
});

export const updateNumberSchema = adminRaffleSchema.extend({
  number: z.number().int().min(0).max(499),
  status: z.enum(["paid", "available"]),
});