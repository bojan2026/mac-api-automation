import { z } from "zod";

export const customerSearchResponseSchema = z
    .object({
        geschaeftsPartner: z
            .object({
                geschaeftsPartnerId: z.string()
            })
            .passthrough()
    })
    .passthrough();
