import { addressSearchResponseSchema } from "../../src/schemas/address-schemas.js";
import { expect, test } from "../../src/fixtures/api-fixtures.js";

const searchParams = {
    location: process.env.ADDRESS_SEARCH_LOCATION ?? "",
    zipCode: process.env.ADDRESS_SEARCH_ZIP_CODE ?? "",
    groupField: process.env.ADDRESS_SEARCH_GROUP_FIELD ?? "",
    street: process.env.ADDRESS_SEARCH_STREET || undefined,
    building: process.env.ADDRESS_SEARCH_BUILDING || undefined
};

const hasSearchInput = Boolean(
    searchParams.location && searchParams.zipCode && searchParams.groupField
);

test.skip(!hasSearchInput, "Set address search inputs in the local environment.");

test("address search returns grouped suggestions", async ({ addressApi }) => {
    const response = await addressApi.searchAddresses(searchParams);

    expect(response.status()).toBe(200);
    const body = addressSearchResponseSchema.parse(await response.json());
    expect(body.responseHeader.status).toBe(0);
    expect(Object.keys(body.grouped).length).toBeGreaterThan(0);
});
