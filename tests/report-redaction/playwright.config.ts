import { defineConfig } from "@playwright/test";
import config from "../../playwright.config.js";

export default defineConfig(config, {
    testDir: ".",
    testMatch: "login.fixture.ts",
    retries: 0,
    workers: 1,
    use: {
        ...config.use,
        actionTimeout: 500,
        trace: "off",
        screenshot: "off",
        video: "off"
    }
});
