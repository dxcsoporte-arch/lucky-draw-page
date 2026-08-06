import { z } from "zod";

export const reserveNumbersSchema = z.object({
  raffleId: z.string().uuid(),
  phone: z.string().trim().regex(/^[1-9][0-9]{9,14}$/, "Ingresa un celular válido con lada"),
  numbers: z.array(z.number().int().min(0).max(499)).min(1).max(10),
});

export const phoneLookupSchema = z.object({
  raffleId: z.string().uuid(),
  phone: z.string().trim().regex(/^[1-9][0-9]{9,14}$/, "Ingresa un celular válido con lada"),
});