import "dotenv/config";

import { defineConfig } from "@playwright/test";

const extraHTTPHeaders: Record<string, string> = process.env.API_BEARER_TOKEN
    ? { Authorization: `Bearer ${process.env.API_BEARER_TOKEN}` }
    : {};
const reportOutputFolder =
    process.env.PLAYWRIGHT_HTML_OUTPUT_DIR ?? "test-results/html-report";
const testOutputFolder =
    process.env.PLAYWRIGHT_TEST_OUTPUT_DIR ?? "test-results/artifacts";

export default defineConfig({
    testDir: "./tests",
    outputDir: testOutputFolder,
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    reporter: [
        [require.resolve("./src/auth/redact-login-reporter.ts")],
        ["list"],
        ["html", { outputFolder: reportOutputFolder, open: "never" }]
    ],
    use: {
        baseURL: process.env.API_BASE_URL ?? "https://test-meine.wienenergie.at",
        launchOptions: {
            channel: process.env.BROWSER_CHANNEL ?? "msedge"
        },
        extraHTTPHeaders,
        trace: "off",
        screenshot: "off",
        video: "off"
    }
});