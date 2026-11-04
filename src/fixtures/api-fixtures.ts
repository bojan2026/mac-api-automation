import { request as playwrightRequest, test as base } from "@playwright/test";

import { AddressApi } from "../services/address-api.js";
import { getApiBearerToken } from "../auth/api-bearer-token.js";

interface ApiFixtures {
    addressApi: AddressApi;
}

export const test = base.extend<ApiFixtures>({
    addressApi: async ({ baseURL, browser }, use) => {
        const token = await getApiBearerToken(browser, baseURL);
        const requestContext = await playwrightRequest.newContext({
            baseURL,
            extraHTTPHeaders: {
                Authorization: `Bearer ${token}`
            }
        });

        try {
            await use(new AddressApi(requestContext));
        } finally {
            await requestContext.dispose();
        }
    }
});

export { expect } from "@playwright/test";