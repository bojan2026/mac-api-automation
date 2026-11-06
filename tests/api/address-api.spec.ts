import { expect, test } from "@fixtures/api-fixtures.js";
import { addressSearchParams } from "@fixtures/address-search-fixtures.js";
import { addressSearchResponseSchema } from "@schemas/address-schemas.js";

test("address search returns grouped suggestions", async ({ addressApi }) => {
    const response = await addressApi.searchAddresses(addressSearchParams);

    expect(response.status()).toBe(200);
    const body = addressSearchResponseSchema.parse(await response.json());
    expect(body.responseHeader.status).toBe(0);
    expect(Object.keys(body.grouped).length).toBeGreaterThan(0);
});
