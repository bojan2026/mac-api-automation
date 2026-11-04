import type { Reporter, TestCase, TestResult, TestStep } from "@playwright/test/reporter";
import users from "./users.json";

export default class RedactLoginReporter implements Reporter {
    private readonly secrets = [...new Set(
        Object.values(users).flatMap(({ username, envKey }) => [
            username,
            process.env[envKey]
        ]).filter((value): value is string => Boolean(value))
    )].sort((left, right) => right.length - left.length);

    private redact(value: unknown, seen = new WeakSet<object>()): void {
        if (typeof value !== "object" || value === null || seen.has(value)) return;
        seen.add(value);

        for (const [key, entry] of Object.entries(value)) {
            if (typeof entry === "string") {
                let redacted = entry;
                for (const secret of this.secrets) {
                    redacted = redacted.split(secret).join("[REDACTED]");
                    const escaped = JSON.stringify(secret).slice(1, -1);
                    redacted = redacted.split(escaped).join("[REDACTED]");
                }
                Reflect.set(value, key, redacted);
            } else {
                this.redact(entry, seen);
            }
        }
    }

    onStepBegin(_test: TestCase, _result: TestResult, step: TestStep): void {
        this.redact(step);
    }

    onStepEnd(_test: TestCase, _result: TestResult, step: TestStep): void {
        this.redact(step);
    }

    onTestEnd(_test: TestCase, result: TestResult): void {
        this.redact(result);
    }
}
