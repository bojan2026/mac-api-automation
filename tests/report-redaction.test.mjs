import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";
import { test } from "node:test";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const users = JSON.parse(readFileSync(join(root, "src", "auth", "users.json"), "utf8"));
const password = 'Synthetic-only-password-"<&\\-2026';

function reportEntries(html) {
    const payload = html.match(/data:application\/zip;base64,([^"<]+)/)?.[1];
    assert.ok(payload, "HTML must contain embedded report data");
    const zip = Buffer.from(payload, "base64");
    const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    assert.ok(end >= 0, "Report ZIP must have a central directory");
    let offset = zip.readUInt32LE(end + 16);
    const entries = [];
    for (let index = 0; index < zip.readUInt16LE(end + 10); index++) {
        assert.equal(zip.readUInt32LE(offset), 0x02014b50);
        const method = zip.readUInt16LE(offset + 10);
        const size = zip.readUInt32LE(offset + 20);
        const local = zip.readUInt32LE(offset + 42);
        const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
        const data = zip.subarray(start, start + size);
        assert.ok(method === 0 || method === 8, "Unexpected report compression");
        entries.push((method === 8 ? inflateRawSync(data) : data).toString("utf8"));
        offset += 46 + zip.readUInt16LE(offset + 28)
            + zip.readUInt16LE(offset + 30) + zip.readUInt16LE(offset + 32);
    }
    return entries;
}

test("HTML reports redact successful and failed login credentials", () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), "mac-report-redaction-"));
    try {
        for (const redact of [false, true]) {
            const runFolder = join(temporaryRoot, redact ? "redacted" : "control");
            const reportFolder = join(runFolder, "report");
            const result = spawnSync(process.execPath, [
                join(root, "node_modules", "@playwright", "test", "cli.js"),
                "test", "--config", join(root, "tests", "report-redaction", "playwright.config.ts"),
                ...(redact ? [] : ["--reporter=html"])
            ], {
                cwd: root,
                encoding: "utf8",
                env: {
                    ...process.env,
                    API_BEARER_TOKEN: "",
                    API_TEST_USER: Object.keys(users)[0],
                    ...Object.fromEntries(Object.values(users).map(({ envKey }) => [envKey, password])),
                    PLAYWRIGHT_HTML_OUTPUT_DIR: reportFolder,
                    PLAYWRIGHT_TEST_OUTPUT_DIR: join(runFolder, "artifacts"),
                    PLAYWRIGHT_HTML_OPEN: "never"
                }
            });
            assert.ifError(result.error);
            let diagnostics = `${result.stdout}\n${result.stderr}`;
            for (const secret of [password, ...Object.values(users).map(({ username }) => username)]) {
                diagnostics = diagnostics.split(secret).join("[REDACTED]")
                    .split(JSON.stringify(secret).slice(1, -1)).join("[REDACTED]");
            }
            assert.equal(result.status, 0, `Synthetic login suite must pass:\n${diagnostics}`);
            const html = readFileSync(join(reportFolder, "index.html"), "utf8");
            const contents = [html, ...reportEntries(html), result.stdout, result.stderr].join("\n");
            assert.ok(contents.includes("synthetic login success"));
            assert.ok(contents.includes("synthetic login failure"));
            if (!redact) {
                assert.ok(contents.includes(JSON.stringify(password).slice(1, -1)),
                    "Unredacted control must reproduce the password leak");
                continue;
            }
            for (const secret of [password, ...Object.values(users).map(({ username }) => username)]) {
                assert.ok(!contents.includes(secret), "Report must not contain login credentials");
                assert.ok(!contents.includes(JSON.stringify(secret).slice(1, -1)),
                    "Report must not contain JSON-escaped login credentials");
            }
            assert.ok(contents.includes("[REDACTED]"), "Report must retain redacted login steps");
        }
    } finally {
        rmSync(temporaryRoot, { recursive: true, force: true });
    }
});
