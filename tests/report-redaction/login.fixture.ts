import { createServer } from "node:http";
import { test, expect } from "@playwright/test";
import { getApiBearerToken } from "../../src/auth/api-bearer-token.js";

for (const fails of [false, true]) {
    test(`synthetic login ${fails ? "failure" : "success"}`, async ({ browser }) => {
        test.fail(fails, "Exercise failed password-fill diagnostics.");
        const server = createServer((_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(`
                <label>Username or email <input aria-label="Username or email"></label>
                <label>Password <input aria-label="Password" type="password"
                    ${fails ? "readonly" : ""}></label>
                <button onclick="login()">Sign In</button>
                <h1></h1>
                <script>
                    function login() {
                        document.querySelector('h1').textContent = 'Willkommen im Mitarbeiter*';
                        fetch('/capture', { headers: { Authorization: 'Bearer synthetic-token' } });
                    }
                </script>
            `);
        });
        await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

        try {
            const address = server.address();
            if (!address || typeof address === "string") {
                throw new Error("Synthetic login server did not bind a TCP port.");
            }
            const token = await getApiBearerToken(browser, `http://127.0.0.1:${address.port}`);
            expect(token).toBe("synthetic-token");
        } finally {
            await new Promise<void>((resolve, reject) => {
                server.close((error) => error ? reject(error) : resolve());
                server.closeAllConnections();
            });
        }
    });
}
