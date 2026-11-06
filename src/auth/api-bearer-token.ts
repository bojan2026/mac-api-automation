import type { Browser, Page, Request } from "@playwright/test";
import users from "@auth/users.json";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("ApiAuthentication");

interface CachedToken {
    value: string;
    expiresAt: number;
}

interface UserConfiguration {
    username: string;
    envKey: string;
}

const TOKEN_EXPIRY_SKEW_MS = 60_000;
const TOKEN_CAPTURE_TIMEOUT_MS = 60_000;
const USER_SELECTION_ENV_KEY = "API_TEST_USER";

let cachedToken: CachedToken | undefined;
let tokenRefresh: Promise<CachedToken> | undefined;

type UserRole = keyof typeof users;

function getAvailableUserRoles(): UserRole[] {
    return Object.keys(users) as UserRole[];
}

function resolveUserRole(roleName: string): UserRole {
    const normalizedRoleName = roleName.trim().toLowerCase();
    const role = getAvailableUserRoles().find(
        (availableRole) => availableRole.toLowerCase() === normalizedRoleName
    );

    if (!role) {
        throw new Error(
            `User "${roleName}" not found in src/auth/users.json. Valid roles: ${getAvailableUserRoles().join(", ")}.`
        );
    }

    return role;
}

function getUserConfiguration(): UserConfiguration {
    const roleName = process.env[USER_SELECTION_ENV_KEY];

    if (!roleName) {
        throw new Error(
            `Missing ${USER_SELECTION_ENV_KEY}. Set it in .env or CI secrets. Valid roles: ${getAvailableUserRoles().join(", ")}.`
        );
    }

    const role = resolveUserRole(roleName);
    return users[role];
}

function readUserCredentials(): { username: string; password: string } {
    const user = getUserConfiguration();
    const password = process.env[user.envKey];

    if (!password) {
        throw new Error(
            `Set ${user.envKey} in the local environment to log in as the API test user.`
        );
    }

    return { username: user.username, password };
}

function getTokenExpiration(token: string): number {
    const payload = token.split(".")[1];
    if (!payload) return 0;

    try {
        const claims: unknown = JSON.parse(
            Buffer.from(payload, "base64url").toString("utf8")
        );
        if (
            typeof claims === "object" &&
            claims !== null &&
            "exp" in claims &&
            typeof claims.exp === "number"
        ) {
            return claims.exp * 1_000 - TOKEN_EXPIRY_SKEW_MS;
        }
    } catch {
        return 0;
    }

    return 0;
}

function waitForCapturedToken(
    page: Page,
    apiOrigin: string
): { promise: Promise<string>; stop: () => void } {
    let resolveToken: (token: string) => void = () => {};
    const promise = new Promise<string>((resolve) => {
        resolveToken = resolve;
    });

    const onRequest = (request: Request): void => {
        try {
            if (new URL(request.url()).origin !== apiOrigin) return;
        } catch {
            return;
        }

        const authorization = request.headers().authorization;
        const match = authorization?.match(/^Bearer\s+(.+)$/i);
        if (match?.[1]) resolveToken(match[1]);
    };

    page.on("request", onRequest);
    return {
        promise,
        stop: () => page.off("request", onRequest)
    };
}

async function loginAndCaptureToken(
    browser: Browser,
    baseURL: string | undefined
): Promise<CachedToken> {
    if (!baseURL) {
        throw new Error("Playwright baseURL must be configured to log in and capture an API token.");
    }

    const { username, password } = readUserCredentials();
    const appUrl = new URL("/mac/#/", baseURL).toString();
    const apiOrigin = new URL(baseURL).origin;
    const context = await browser.newContext();

    try {
        const page = await context.newPage();
        const captured = waitForCapturedToken(page, apiOrigin);

        try {
            await page.goto(appUrl);
            await page.getByRole("textbox", { name: "Username or email" }).fill(username);
            await page.getByRole("textbox", { name: "Password" }).fill(password);
            await page.getByRole("button", { name: "Sign In" }).click();
            await page
                .getByRole("heading", { name: "Willkommen im Mitarbeiter*" })
                .waitFor({ state: "visible", timeout: TOKEN_CAPTURE_TIMEOUT_MS });

            let timeoutId: NodeJS.Timeout | undefined;
            try {
                const token = await Promise.race([
                    captured.promise,
                    new Promise<never>((_, reject) => {
                        timeoutId = setTimeout(
                            () =>
                                reject(
                                    new Error(
                                        "Login succeeded, but no Bearer Authorization header was observed for the API origin."
                                    )
                                ),
                            TOKEN_CAPTURE_TIMEOUT_MS
                        );
                    })
                ]);
                return { value: token, expiresAt: getTokenExpiration(token) };
            } finally {
                if (timeoutId) clearTimeout(timeoutId);
            }
        } finally {
            captured.stop();
        }
    } finally {
        await context.close();
    }
}

export async function getApiBearerToken(
    browser: Browser,
    baseURL: string | undefined
): Promise<string> {
    const configuredToken = process.env.API_BEARER_TOKEN?.trim();
    if (configuredToken) {
        logger.debug("Using the configured API token");
        return configuredToken;
    }

    if (cachedToken && cachedToken.expiresAt > Date.now()) {
        logger.debug("Reusing the cached API token");
        return cachedToken.value;
    }

    if (!tokenRefresh) {
        const startedAt = performance.now();
        logger.info("Starting browser login to obtain an API token");
        tokenRefresh = loginAndCaptureToken(browser, baseURL)
            .then((token) => {
                cachedToken = token;
                logger.info(
                    { durationMs: Math.round(performance.now() - startedAt) },
                    "Browser login completed; API token captured"
                );
                return token;
            })
            .catch((error: unknown) => {
                logger.error(
                    { durationMs: Math.round(performance.now() - startedAt) },
                    "Browser login failed"
                );
                throw error;
            })
            .finally(() => {
                tokenRefresh = undefined;
            });
    } else {
        logger.debug("Waiting for the in-progress API token refresh");
    }

    return (await tokenRefresh).value;
}
