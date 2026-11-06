import { expect, test } from "@fixtures/api-fixtures.js";
import { customerSearchParams } from "@fixtures/customer-search-fixtures.js";
import { customerSearchResponseSchema } from "@schemas/customer-schemas.js";

test("customer number search returns the matching customer", async ({ customerApi }) => {
    const response = await customerApi.searchCustomerByNumber(customerSearchParams);

    expect(response.status()).toBe(200);
    const body = customerSearchResponseSchema.parse(await response.json());
    expect(body.geschaeftsPartner.geschaeftsPartnerId)
        .toBe(customerSearchParams.customerNumber);
});
