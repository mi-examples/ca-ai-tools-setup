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

Summary (keep updated):

- API token (`MI_ACCESS_TOKEN`) in `.env` (read by **local dev server** / proxy to real backend — not managed manually outside `.env`): `<set | not configured>`
- Session/cookie login needed: `<yes | no>` (when token is missing or the instance does not support it)
- UI login URL (`/login`): `<URL>` — record **username only** in this file if relevant; **never store passwords here**
- Password / session flows: use **`.mi-credentials.local.env`** (gitignored), see below
- Notes: `<token source, refresh flow, instance quirks>`

### API token (`MI_ACCESS_TOKEN`)

Put the token in **`.env`** as:

```bash
MI_ACCESS_TOKEN=<your_token>
```

The **local dev server** reads **`MI_ACCESS_TOKEN`** and forwards traffic to the **real backend** through its **proxy**. You do **not** need to attach or “manage” the token from outside that pipeline (no manual `Authorization` headers on curl for this flow unless you are deliberately bypassing the dev server for a one-off debug).

**Smoke-check** (dev server running; request stays on **localhost** — the proxy applies the token server-side):

1. **`GET <APP_URL>/data/page/index/auth/info`** with **`Accept: application/json`** only (replace `<APP_URL>` with your **Local URLs** → App URL).
2. **Success:** JSON body includes a **`user`** property — the token works end-to-end through the proxy.
3. **JSON response but error / no `user`:** ask the human to verify or **rotate/update `MI_ACCESS_TOKEN`** in **`.env`** (still no need to pass the token manually from outside).
4. **Response is not JSON** (HTML, plain text, empty): the backend may be **upgrading**, misconfigured, or unreachable — try again later, or connect **VPN** / correct network path if required upstream.

Pick command examples for **your primary shell** from **System and Shell Context**.

**bash / zsh:**

```bash
curl -sk '<APP_URL>/data/page/index/auth/info' \
  -H 'Accept: application/json'
```

**PowerShell** (`curl` is `curl.exe`):

```powershell
curl.exe -sk '<APP_URL>/data/page/index/auth/info' -H 'Accept: application/json'
```

### Session cookies (login + password)

Use this when **`MI_ACCESS_TOKEN` is unset** or the **instance does not support** token auth for the routes you need. Authenticate with **username and password**, then reuse **session cookies** for subsequent requests.

Do **not** paste passwords into **`.dev-environment.md`**. Store secrets only in **`.mi-credentials.local.env`** (see **Credentials file**) and load them into the environment before running the commands below.

**Step 1 — login and save cookies**

**bash / zsh:**

```bash
curl -sk -c /tmp/mi_session.txt '<APP_URL>/auth/login' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d "{\"username\":\"${MI_USERNAME}\",\"password\":\"${MI_PASSWORD}\",\"remember\":\"0\"}"
```

**PowerShell** (cookie jar under `%TEMP%`; build JSON from env vars loaded from the credentials file):

```powershell
$cookieFile = Join-Path $env:TEMP 'mi_session.txt'
$body = @{ username = $env:MI_USERNAME; password = $env:MI_PASSWORD; remember = '0' } | ConvertTo-Json -Compress
curl.exe -sk -c $cookieFile '<APP_URL>/auth/login' `
  -H 'Content-Type: application/json' -H 'Accept: application/json' -d $body
```

Use the **same App URL** as in **Local URLs** above (replace `<APP_URL>`; no trailing slash).

**Step 2 — call a protected route with cookies**

**bash / zsh:**

```bash
curl -sk -b /tmp/mi_session.txt '<APP_URL>/data/editor/page/entity/10/form' \
  -H 'Accept: application/json'
```

**PowerShell:**

```powershell
curl.exe -sk -b $cookieFile '<APP_URL>/data/editor/page/entity/10/form' -H 'Accept: application/json'
```

**Step 3 — remove the local cookie file**

```bash
rm -f /tmp/mi_session.txt
```

```powershell
Remove-Item -Force $cookieFile -ErrorAction SilentlyContinue
```

Delete the cookie file when finished so the session secret does not linger on disk longer than needed.

### Credentials file (gitignored)

Keep login secrets out of git and out of **`.dev-environment.md`**:

1. Create **`.mi-credentials.local.env`** in the repo root (one line per variable, no quotes unless needed):

   ```bash
   MI_USERNAME=<USERNAME>
   MI_PASSWORD=<PASSWORD>
   ```

2. Add **`/.mi-credentials.local.env`** to **`.gitignore`** if it is not already ignored.

3. **bash / zsh** — load variables for the current shell (no extra tools):

   ```bash
   set -a && [ -f .mi-credentials.local.env ] && . ./.mi-credentials.local.env && set +a
   ```

4. **PowerShell** — load into process env (no extra tools; splits on the **first** `=` so values may contain `=`):

   ```powershell
   Get-Content .mi-credentials.local.env | ForEach-Object {
     $line = $_.Trim()
     if ($line -eq '' -or $line.StartsWith('#')) { return }
     $i = $line.IndexOf('=')
     if ($i -gt 0) {
       $name = $line.Substring(0, $i).Trim()
       $val = $line.Substring($i + 1).Trim().Trim('"')
       Set-Item -Path "Env:$name" -Value $val
     }
   }
   ```

Then run the curl flows above; **`MI_USERNAME`** / **`MI_PASSWORD`** will be available as environment variables.

### Credentials (reference — secrets only in `.mi-credentials.local.env`)

- App login: `<USERNAME> / <PASSWORD>` *(fill values only in **`.mi-credentials.local.env`**, not in this file)*

## API compatibility notes

Metric Insights instance docs can diverge from [published API reference](https://help.metricinsights.com/m/API_Access). After token-backed smoke checks, record differences that matter for this repo.

- Last verified: `<YYYY-MM-DD>` (URL, auth, and representative API calls)
- Differences: `<endpoints, fields, validation quirks>`

## Tooling

- Node.js version: `<v22.x>`
- Package manager: `<npm | pnpm | yarn>`
- GitHub CLI (`gh`): `<installed | missing>`
- Linear CLI (`linear-cli`): `<installed | missing>`

## Notes

Add any personal workflow notes, quick commands, and environment caveats.
