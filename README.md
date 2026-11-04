# MAC API Automation

Playwright API tests for the address lookup flow observed in the supplied HAR.
The service layer covers address suggestions and address identity lookup.
Customer, contract, and availability endpoints are outside this suite's scope.

## Setup

```sh
pnpm install
```

Copy `.env.example` to `.env` and set `API_BASE_URL` plus synthetic or approved
test data. The address search test requires `ADDRESS_SEARCH_LOCATION`,
`ADDRESS_SEARCH_ZIP_CODE`, and `ADDRESS_SEARCH_GROUP_FIELD`. The search test is
skipped when its required inputs are missing.

If `API_BEARER_TOKEN` is set, the API fixture uses it directly. Otherwise it
logs in to the MAC app in a browser using the configured service user, captures
the Bearer token from an outgoing request to the API origin, and uses that
token for API calls. The token is cached in memory until shortly before its JWT
expiry, when the fixture performs a fresh UI login. The login URL is
`${API_BASE_URL}/mac/#/`.
The browser defaults to the `msedge` channel, matching the E2E harness; set
`BROWSER_CHANNEL` to `chrome` to use Chrome instead.

Select a role with `API_TEST_USER` (for example, `mac-all`). Valid role names
are the keys in `src/auth/users.json`. Set the selected role's password variable
from that file in local `.env` or CI secrets; usernames stay in the JSON file.
Tokens are not written to disk or logs.
Do not store live credentials or exported HAR files in Git.

The first configured reporter redacts configured login usernames and passwords
from steps and failure diagnostics before the list and HTML reporters receive
them. Keep it first when changing reporters. Login traces, screenshots, and
videos must remain disabled; report redaction does not sanitize those artifacts.
Run `pnpm test:report-redaction` for an offline synthetic login regression that
checks the generated HTML's decoded report data on success and failure.

Treat all reports generated before this fix as sensitive, including copies,
CI artifacts, and temporary report directories. Restrict access and remove them
according to your retention policy. If reports were shared, rotate the login
credentials and revoke related sessions/tokens; redaction does not repair
existing reports.

## Run

```sh
pnpm typecheck
pnpm test:api
pnpm report
```

Each test run leaves only one timestamped HTML file in `test-results/`, for
example `test-results/mac-api-2026-10-28_16-26-59.html`. Playwright's temporary
report and test-artifact directories are removed when the run finishes.
`pnpm report` opens the latest report in the default application for HTML files
(using PowerShell's `Start-Process` on Windows).

The observed API base URL is the Wien Energie test environment. Confirm the
environment and use non-production test data before enabling live requests.

## Nx Integration

This repository is structured to become a sibling app of
`apps/mac-test-automation`. When integrating it into `mwe-frontends`, place the
repository contents in `apps/mac-api-automation` and use the included
`project.json` targets:

```sh
pnpm nx run mac-api-automation:typecheck
pnpm nx run mac-api-automation:api-test
pnpm nx run mac-api-automation:report
```

The Nx workspace owns dependency installation and its single `pnpm-lock.yaml`.
Merge any missing dependencies from this repository's `package.json` into the
workspace root `package.json` (the current schemas need `zod`), then run
`pnpm install` from the workspace root. Do not carry the standalone lockfile
into the Nx workspace. Keep `.env` local to this app and provide CI variables
through the pipeline instead.
