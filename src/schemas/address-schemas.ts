import { z } from "zod";

const solrGroupSchema = z
    .object({
        matches: z.number(),
        groups: z
            .array(
                z
                    .object({
                        groupValue: z.string().nullable(),
                        doclist: z
                            .object({
                                numFound: z.number().optional(),
                                start: z.number().optional(),
                                docs: z.array(z.record(z.string(), z.unknown())).optional()
                            })
                            .passthrough()
                    })
                    .passthrough()
            )
            .optional()
    })
    .passthrough();

export const addressSearchResponseSchema = z
    .object({
        responseHeader: z
            .object({
                status: z.number(),
                QTime: z.number(),
                params: z.record(
                    z.string(),
                    z.union([z.string(), z.array(z.string())])
                )
            })
            .passthrough(),
        grouped: z.record(z.string(), solrGroupSchema)
    })
    .passthrough();