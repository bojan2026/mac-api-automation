import { request as playwrightRequest, test as base } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

import { getApiBearerToken } from "@auth/api-bearer-token.js";
import { AddressApi } from "@services/address-api.js";
import { CustomerApi } from "@services/customer-api.js";

interface ApiFixtures {
    apiRequest: APIRequestContext;
    addressApi: AddressApi;
    customerApi: CustomerApi;
}

export const test = base.extend<ApiFixtures>({
    apiRequest: async ({ baseURL, browser }, use) => {
        const token = await getApiBearerToken(browser, baseURL);
        const requestContext = await playwrightRequest.newContext({
            baseURL,
            extraHTTPHeaders: {
                Authorization: `Bearer ${token}`
            }
        });

        try {
            await use(requestContext);
        } finally {
            await requestContext.dispose();
        }
    },
    addressApi: async ({ apiRequest }, use) => {
        await use(new AddressApi(apiRequest));
    },
    customerApi: async ({ apiRequest }, use) => {
        await use(new CustomerApi(apiRequest));
    }
});

export { expect } from "@playwright/test";