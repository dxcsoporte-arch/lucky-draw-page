import { createServerFn } from "@tanstack/react-start";
import { fetchRaffle, findReservations, reserveNumbers } from "./raffle.server";
import { phoneLookupSchema, reserveNumbersSchema } from "./raffle.schemas";

export const getRaffle = createServerFn({ method: "GET" }).handler(() => fetchRaffle());

export const createReservation = createServerFn({ method: "POST" })
  .inputValidator((input) => reserveNumbersSchema.parse(input))
  .handler(({ data }) => reserveNumbers(data));

export const lookupReservations = createServerFn({ method: "POST" })
  .inputValidator((input) => phoneLookupSchema.parse(input))
  .handler(({ data }) => findReservations(data));