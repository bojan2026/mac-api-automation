import type { APIRequestContext, APIResponse } from "@playwright/test";
import { createLogger } from "../utils/logger.js";
import { logApiRequest } from "./log-api-request.js";

const logger = createLogger("AddressApi");

export interface AddressSearchParams {
    location: string;
    zipCode: string;
    groupField: string;
    street?: string;
    building?: string;
}

export interface AddressIdentityParams {
    rows: number;
    olavGba: string;
    door?: string;
    location?: string;
}

export class AddressApi {
    constructor(private readonly request: APIRequestContext) { }

    searchAddresses(params: AddressSearchParams): Promise<APIResponse> {
        const query: Record<string, string> = {
            location: params.location,
            zipCode: params.zipCode,
            groupField: params.groupField,
            ...(params.street !== undefined ? { street: params.street } : {}),
            ...(params.building !== undefined ? { building: params.building } : {})
        };

        return logApiRequest(logger, "searchAddresses", () =>
            this.request.get("/admintool/api/solr/olav/select", { params: query })
        );
    }

    findAddressIdentity(params: AddressIdentityParams): Promise<APIResponse> {
        const query: Record<string, string> = {
            rows: String(params.rows),
            olavGba: params.olavGba,
            ...(params.door !== undefined ? { door: params.door } : {}),
            ...(params.location !== undefined ? { location: params.location } : {})
        };

        return logApiRequest(logger, "findAddressIdentity", () =>
            this.request.get("/admintool/api/solr/olav/select/ident", {
                params: query
            })
        );
    }

}