import type { APIRequestContext, APIResponse } from "@playwright/test";

export interface CustomerSearchParams {
    customerNumber: string;
    systemId: string;
}

export class CustomerApi {
    constructor(private readonly request: APIRequestContext) { }

    searchCustomerByNumber(params: CustomerSearchParams): Promise<APIResponse> {
        return this.request.get(
            `/admintool/api/partner/${encodeURIComponent(params.customerNumber)}`,
            { params: { sysId: params.systemId } }
        );
    }
}
