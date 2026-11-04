import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const reportRoot = resolve(projectRoot, "test-results");

const latestReport = (
  existsSync(reportRoot) ? readdirSync(reportRoot, { withFileTypes: true }) : []
)
  .filter(
    (entry) =>
      entry.isFile() &&
      /^mac-api-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.html$/.test(entry.name),
  )
  .map((entry) => entry.name)
  .sort()
  .at(-1);

if (!latestReport) {
  console.error("No timestamped API report found. Run pnpm test:api first.");
  process.exitCode = 1;
} else {
  const reportPath = resolve(reportRoot, latestReport);
  const command =
    process.platform === "win32"
      ? "powershell.exe"
      : process.platform === "darwin"
        ? "open"
        : "xdg-open";
  const args =
    process.platform === "win32"
      ? [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          "$ErrorActionPreference = 'Stop'; Start-Process -FilePath $env:MAC_API_REPORT_PATH",
        ]
      : [reportPath];
  const result = spawnSync(command, args, {
    cwd: reportRoot,
    stdio: "inherit",
    env: { ...process.env, MAC_API_REPORT_PATH: reportPath },
  });

  if (result.error) {
    console.error(result.error.message);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? 1;
    if (process.exitCode !== 0) {
      console.error(
        `Could not open report: ${reportPath} (${result.signal ? `signal ${result.signal}` : `exit code ${process.exitCode}`}).`,
      );
    }
  }
}
