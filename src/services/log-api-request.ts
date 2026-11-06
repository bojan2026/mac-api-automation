import type { APIResponse } from "@playwright/test";
import type { AppLogger } from "../utils/logger.js";

export async function logApiRequest(
    logger: AppLogger,
    operation: string,
    send: () => Promise<APIResponse>
): Promise<APIResponse> {
    const startedAt = performance.now();
    logger.debug({ operation, method: "GET" }, "API request started");

    let response: APIResponse;
    try {
        response = await send();
    } catch (error) {
        // Playwright errors can include authorization headers and request URLs.
        logger.error(
            { operation, method: "GET", durationMs: Math.round(performance.now() - startedAt) },
            "API request failed"
        );
        throw error;
    }

    const fields = {
        operation,
        method: "GET",
        status: response.status(),
        durationMs: Math.round(performance.now() - startedAt)
    };
    if (response.ok()) {
        logger.info(fields, "API request completed");
    } else {
        logger.warn(fields, "API request returned a non-success status");
    }
    return response;
}
