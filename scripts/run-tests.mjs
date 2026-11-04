import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const playwrightCli = resolve(
  projectRoot,
  "node_modules/@playwright/test/cli.js",
);
const reportRoot = resolve(projectRoot, "test-results");

function formatTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

function cleanGeneratedOutputs() {
  for (const entry of readdirSync(reportRoot, { withFileTypes: true })) {
    const entryPath = resolve(reportRoot, entry.name);
    const isOldReportFolder =
      entry.isDirectory() && /^mac-api-\d{4}-\d{2}-\d{2}_/.test(entry.name);
    const isPlaywrightOutput =
      entry.name === "artifacts" || entry.name === "html-report";

    if (isOldReportFolder) {
      for (const oldReport of readdirSync(entryPath, {
        withFileTypes: true,
      })) {
        if (oldReport.isFile() && /^mac-api-.*\.html$/.test(oldReport.name)) {
          const oldPath = resolve(entryPath, oldReport.name);
          const rootPath = resolve(reportRoot, oldReport.name);
          if (!existsSync(rootPath)) {
            copyFileSync(oldPath, rootPath);
          }
        }
      }
    }

    if (
      isOldReportFolder ||
      isPlaywrightOutput ||
      entry.name === ".last-run.json"
    ) {
      rmSync(entryPath, { recursive: true, force: true });
    }
  }
}

let runDate = new Date();
let reportName = `mac-api-${formatTimestamp(runDate)}`;
let reportFile = resolve(reportRoot, `${reportName}.html`);

while (existsSync(reportFile)) {
  runDate = new Date(runDate.getTime() + 1000);
  reportName = `mac-api-${formatTimestamp(runDate)}`;
  reportFile = resolve(reportRoot, `${reportName}.html`);
}

mkdirSync(reportRoot, { recursive: true });
const temporaryRoot = join(tmpdir(), `${reportName}-${process.pid}`);
const reportFolder = join(temporaryRoot, "report");
const testOutputFolder = join(temporaryRoot, "artifacts");

const result = spawnSync(
  process.execPath,
  [playwrightCli, "test", ...process.argv.slice(2)],
  {
    cwd: projectRoot,
    env: {
      ...process.env,
      PLAYWRIGHT_HTML_OUTPUT_DIR: reportFolder,
      PLAYWRIGHT_TEST_OUTPUT_DIR: testOutputFolder,
    },
    stdio: "inherit",
  },
);

let exitCode = result.status ?? 1;
if (result.error) {
  console.error(result.error.message);
  exitCode = 1;
}

try {
  const indexPath = resolve(reportFolder, "index.html");
  if (existsSync(indexPath)) {
    copyFileSync(indexPath, reportFile);
  } else if (!result.error) {
    console.error("Playwright did not generate an HTML report.");
    exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  exitCode = 1;
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
  cleanGeneratedOutputs();
}

if (existsSync(reportFile)) {
  console.log(`HTML report: ${reportFile}`);
}
process.exitCode = exitCode;
