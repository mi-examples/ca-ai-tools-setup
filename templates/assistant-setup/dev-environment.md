# Developer Local Environment

> Fill this file with your personal local setup details.
> Keep it out of git: add `.dev-environment.md` to `.gitignore`.

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

- API token status: `<set | not configured>`
- Session login required: `<yes | no>`
- Notes: `<token source, refresh flow, limitations>`

## Tooling

- Node.js version: `<v22.x>`
- Package manager: `<npm | pnpm | yarn>`
- GitHub CLI (`gh`): `<installed | missing>`
- Linear CLI (`linear-cli`): `<installed | missing>`

## Notes

Add any personal workflow notes, quick commands, and environment caveats.
