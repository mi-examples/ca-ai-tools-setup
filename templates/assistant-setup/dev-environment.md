# Developer Local Environment

> **This file is personal and gitignored — never commit it.** It is regenerated per machine and records
> your own instance URL, shell and paths, so committing it leaks your environment into everyone else's
> checkout. `ca-ai-tools-setup` adds it to `.gitignore` for that reason.
>
> Do not store tokens, passwords, session values, or other secrets here either — those belong in
> `.env`, also ignored (see the `portal-env-credentials` skill).

## System and Shell Context

Use this section to avoid shell syntax mistakes and reduce prompt/token overhead.

- OS: `<Windows | macOS | Linux>`
- Architecture: `<x64 | arm64 | ...>`
- Primary shell for this repository: `<PowerShell | bash | zsh | cmd>`
- Other available shells: `<PowerShell, bash, cmd, ...>`
- Shell to avoid for command examples: `<if any>`

### Shell-Specific Notes

- If using **PowerShell**, avoid `&&` and Bash heredoc syntax.
- If using **cmd**, avoid PowerShell variable syntax (`$env:...`) and Bash-only operators.
- If using **bash/zsh**, prefer POSIX syntax and avoid PowerShell cmdlets.

## Local URLs

- App URL: `<http://localhost:3000>`
- API base URL: `<http://localhost:3000/api>`
- Login URL: `<http://localhost:3000/login>`

## Authentication

Variable names, the sign-in steps and the login URL are in the **`portal-env-credentials`** skill. Record here
only what is true for this machine and instance — never a token or a password.

- `MI_ACCESS_TOKEN` in `.env`: `<set | not configured>`
- Token check (`GET <App URL>/data/page/index/auth/info` answers JSON with `user`): `<passed on YYYY-MM-DD | failed: reason>`
- Role tokens in `.env` (`MI_ACCESS_TOKEN_REGULAR`, `MI_ACCESS_TOKEN_POWER`, `MI_ACCESS_TOKEN_ADMIN`): `<which are set>`
- Users that need a password sign-in at `/login`: `<none | which and why>`
- Usernames of the QA role users (usernames only): `<Regular: … | Power: … | Admin: …>`
- Notes: `<where the tokens come from, how they are renewed, instance quirks>`

## API compatibility notes

Metric Insights instance docs can diverge from [published API reference](https://help.metricinsights.com/m/API_Access). After token-backed smoke checks, record differences that matter for this repo.

- Last verified: `<YYYY-MM-DD>` (URL, auth, and representative API calls)
- Differences: `<endpoints, fields, validation quirks>`

## Tooling

- Node.js version: `<v{{MIN_NODE_MAJOR}}.x>`
- Package manager: `<npm | pnpm | yarn>`
- GitHub CLI (`gh`): `<installed | missing>`
- Linear MCP: `<connected | not connected>`

## Notes

Add shared workflow notes, quick commands, supported-platform differences, and environment caveats.
