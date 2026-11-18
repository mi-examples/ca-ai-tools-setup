---
name: portal-env-credentials
description: The one place that says where Portal Page credentials and URLs live—the `.env` variables for the MI instance, API tokens, role logins and the Figma token, how to sign in (token first, password otherwise), and the login URL. Use before signing in to the app, running QA or scripts that need credentials, or when a secret or URL is needed. Never commit secrets.
---

# Credentials and URLs (`.env`)

Everything secret or instance-specific lives in **`.env`** at the repository root. **`.env` is gitignored** —
commit only **`.env.example`** with placeholders. This skill is the only place that lists the names; other
skills point here.

## URLs

| What | Where it comes from |
| --- | --- |
| **Local app** — the page you develop and test | `http://localhost:<port>`, printed by `npm run dev` (default port 3000, the next free one otherwise). Recorded in `.dev-environment.md`. |
| **MI instance** behind the dev proxy | **`BASE_URL`** in `.env`; the same instance as `mi.url` in `pp-dev.config.ts`. |
| **Login page** | `/login` on the host you sign in on — the only login path. Which host that is, see **Signing in**; it is needed on the password path only. |

## Variables

| Variable | Purpose |
| --- | --- |
| **`BASE_URL`** | Metric Insights instance base URL (e.g. `https://your-org.metricinsights.com/`). Keep it in line with `mi.url` in `pp-dev.config.ts`. For a pre-1.0 `pp-dev` config (`backendBaseURL`), run `npx @metricinsights/pp-dev migrate` rather than hand-editing it — see the **`ai-development`** skill. |
| **`APPLICATION_ID`**, **`APPLICATION_KEY`** | MI application identifier and key, when API or integration work needs them. |
| **`MI_ACCESS_TOKEN`** | API token of your own MI user. `pp-dev` reads it and signs every proxied request with it. |
| **`MI_ACCESS_TOKEN_REGULAR`**, **`MI_ACCESS_TOKEN_POWER`**, **`MI_ACCESS_TOKEN_ADMIN`** | API tokens of the QA role users, for working as another role without a password. |
| **`DEFAULT_USERNAME_ADMIN`**, **`DEFAULT_PASSWORD_ADMIN`** | Username and password of the default admin user. |
| **`QA_USER_REGULAR`** / **`QA_PASS_REGULAR`**, **`QA_USER_POWER`** / **`QA_PASS_POWER`**, **`QA_USER_ADMIN`** / **`QA_PASS_ADMIN`** | Username and password of each QA role user. |
<!-- only:figma -->
| **`FIGMA_API_KEY`** | Figma personal access token (`https://www.figma.com/developers/api#access-tokens`) for the **Figma MCP** server registered in **`.mcp.json`** / **`.cursor/mcp.json`**. The server reads this variable from **`.env`** itself, so nothing has to be exported; there is no OAuth sign-in. Also works for direct Figma REST calls (e.g. `curl -H "X-Figma-Token: $FIGMA_API_KEY" https://api.figma.com/v1/files/<fileKey>`). Used by the **`figma-implementation`** skill. |
<!-- /only -->
<!-- only:no-figma -->
| **`FIGMA_API_KEY`** | Figma personal access token (`https://www.figma.com/developers/api#access-tokens`) for direct Figma REST calls (e.g. `curl -H "X-Figma-Token: $FIGMA_API_KEY" https://api.figma.com/v1/files/<fileKey>`). Figma MCP is not set up in this repository. |
<!-- /only -->

Roles are always named **Regular**, **Power** and **Admin** — in test cases, reports and Linear. Real
usernames stay in `.env`.

## Signing in

Use a token when the variable for that user is set; use the password pair otherwise. Both are normal — a
repository may have tokens for some users and passwords for others.

### 1. As yourself — `MI_ACCESS_TOKEN`

With the token in `.env` the dev proxy signs every request: there is no login page and no session to keep.
Check it with the dev server running:

```bash
curl -sk 'http://localhost:<port>/data/page/index/auth/info' -H 'Accept: application/json'
```

A JSON answer with a `user` property means the token works. JSON without `user`: the token is wrong or
expired — ask the developer to replace it. Not JSON at all: the instance is unreachable (VPN, upgrade).

### 2. As a role, with a token — `MI_ACCESS_TOKEN_<ROLE>`

`pp-dev` 1.5 and newer serves every added user on its own host, so roles run side by side and their
sessions never mix. It needs `MI_ACCESS_TOKEN` (yours) and the dev server opened on `localhost`.

Add the role once per dev-server run — the token is read from `.env` and never shows up in the command or
its output:

```bash
node --env-file=.env -e "fetch('http://localhost:<port>/@api/users',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'regular',token:process.env.MI_ACCESS_TOKEN_REGULAR})}).then(async r=>console.log(r.status,await r.text()))"
```

Then open the page as that role at **`http://regular.localhost:<port>`** (`power.localhost`,
`admin.localhost` likewise). `409 NAME_TAKEN` means the role is already added — just open its host.
`GET /@api/users` lists the users that exist.

### 3. As a role or the admin, with a password

When there is no token for the user, or the instance cannot issue one. Use **`QA_USER_<ROLE>`** /
**`QA_PASS_<ROLE>`**, or **`DEFAULT_USERNAME_ADMIN`** / **`DEFAULT_PASSWORD_ADMIN`** for the default admin.

**Where to sign in** depends on the dev proxy:

| Dev proxy | Sign in at |
| --- | --- |
| `MI_ACCESS_TOKEN` is set (`pp-dev` 1.5 and newer) | the role's own host: `http://<role>.localhost:<port>/login` |
| no `MI_ACCESS_TOKEN` | `http://localhost:<port>/login` |

With your token set, `localhost:<port>` always answers **as you**: the proxy adds your token to every
request, so a login there would test your permissions, not the role's. Give the role its own host first:

```bash
node -e "fetch('http://localhost:<port>/@api/users',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'regular',kind:'session'})}).then(async r=>console.log(r.status,await r.text()))"
```

The answer carries `user.loginUrl` — open that. `409 NAME_TAKEN`: the role is already added, and
`GET /@api/users` lists its `loginUrl`. `pp-dev` older than 1.5 has no such hosts: with a token set it
cannot work as another user, so upgrade it.

**Fill the login form** with this command. Node reads `.env` and hands the values straight to the
browser: no shell touches them (a shell changes `$`, quotes and `#` in a password), and nothing is
printed — the CLI's own output would show the password, so it is discarded:

```bash
node --env-file=.env -e "const {spawnSync}=require('node:child_process');const cli=require.resolve('@playwright/cli/playwright-cli.js');for(const a of [['fill','<user-ref>',process.env.QA_USER_REGULAR],['fill','<pass-ref>',process.env.QA_PASS_REGULAR,'--submit']])console.log(a[1],spawnSync(process.execPath,[cli,...a],{stdio:'ignore'}).status===0?'filled':'FAILED')"
```

Take `<user-ref>` and `<pass-ref>` from `npx playwright-cli snapshot`, and put the variables of the
user you need. It prints `<ref> filled` or `<ref> FAILED` per field; take a new snapshot to see the
signed-in page. Never write a password into a command yourself.

Sessions are kept per host, so roles on their own hosts stay signed in side by side in one browser
session. On the single `localhost:<port>` host only one user is signed in at a time.

Default role when none is asked for: **Admin**.

## Rules

1. Never print a token or a password: no `cat .env`, no echoing a variable, nothing pasted into chat,
   Linear, test documentation or any tracked file. Refer to a secret by its variable name.
2. Read `.env` with Node, never with a shell: `node --env-file=.env …`, or `dotenv` in a Node script, and
   pass the values on as arguments from `process.env`. Sourcing the file in a shell, or parsing it in
   PowerShell, changes passwords that contain `$`, quotes or `#`.
3. A variable that is not set is reported, not guessed: say which name is missing and stop.
4. Never commit a populated `.env`. New variables go into `.env.example` as placeholders.

## Older names

Earlier setups used other names. If a repository still has them, read the values from there and suggest
moving them to the names above:

| Older name | Use instead |
| --- | --- |
| `MI_USERNAME` / `MI_PASSWORD` in `.mi-credentials.local.env` | `DEFAULT_USERNAME_ADMIN` / `DEFAULT_PASSWORD_ADMIN` in `.env` |
| `PP_USER` / `PP_PASS` | `DEFAULT_USERNAME_ADMIN` / `DEFAULT_PASSWORD_ADMIN` in `.env` |
| `PAGE_URL`, `PP_LOCAL_APP_URL` | the local app URL (see **URLs**) |

## Setup

```bash
cp .env.example .env
# Edit .env locally; never git add .env
```
