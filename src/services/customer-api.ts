import type { APIRequestContext, APIResponse } from "@playwright/test";
import { createLogger } from "../utils/logger.js";
import { logApiRequest } from "./log-api-request.js";

const logger = createLogger("CustomerApi");

export interface CustomerSearchParams {
    customerNumber: string;
    systemId: string;
}

export class CustomerApi {
    constructor(private readonly request: APIRequestContext) { }

    searchCustomerByNumber(params: CustomerSearchParams): Promise<APIResponse> {
        return logApiRequest(logger, "searchCustomerByNumber", () =>
            this.request.get(
                `/admintool/api/partner/${encodeURIComponent(params.customerNumber)}`,
                { params: { sysId: params.systemId } }
            )
        );
    }
}
