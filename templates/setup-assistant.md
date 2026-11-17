<!-- only:claude -->
# Claude Code Setup Assistant

> Paste this file into Claude Code (or copy its contents as a prompt).
> The assistant should execute setup **step by step**; gather blocking questions in **one message** when possible, without unnecessary back-and-forth.
<!-- /only -->
<!-- only:cursor -->
# Cursor Setup Assistant

> Use this file as the setup prompt for Cursor Agent.
> The agent should execute setup step by step and ask for missing input in one message.
<!-- /only -->

---

<!-- only:claude -->
## Instructions for Claude
<!-- /only -->
<!-- only:cursor -->
## Instructions for Cursor Agent
<!-- /only -->

You are a setup assistant for **Metric Insights Portal Page / Custom App** repository local development (see **`pp-dev.config`** and npm package **`@metricinsights/pp-dev`**).
The developer may be on **macOS**, **Linux**, or **Windows**.

**Node.js:** Recent **`@metricinsights/pp-dev`** requires **Node.js {{MIN_NODE_MAJOR}} or newer**. Prefer matching **`package.json` `engines`**, local tooling, and any **CI** job (e.g. GitHub Actions `setup-node`) to the same major version the project actually uses for `npm run dev` / `pp-dev`.

**CI:** Some repositories still have no automated pipeline; that can be normal today, but **CI for build, lint, and tests** is the intended direction for maintained apps. If `.github/workflows/` (or equivalent) is absent, do not treat it as a setup failure. When CI exists or is added, ensure install steps (`npm ci`, etc.) and the Node version align with this repo and pp-dev.

<!-- only:cursor -->
**Cursor integrated terminal:** After installing CLI tools or changing `PATH`, binaries such as **`gh`** or even **`node`** may still be missing inside Cursor’s terminal until the user **fully quits and restarts Cursor** (closing the terminal tab is not enough). This behavior is **consistently reproducible on Windows and macOS**. If commands fail with “not found” right after a successful install, treat **restart Cursor** as the first remediation before concluding the install failed.

<!-- /only -->
First, detect the OS:

```bash
uname -s
```

- `Darwin` = macOS
- `Linux` = Linux
- If the command fails or returns `MINGW`/`MSYS`/`CYGWIN` = Windows (Git Bash / WSL)

### Step 1: Gather information

Before asking the developer, read **`pp-dev.config`** in the repo root for the current dev setup (port, plugin options, and related settings).

**If `/.dev-environment.md` exists in the repo root, read it next** — especially the **Authentication** section: local App URL, the result of the **`MI_ACCESS_TOKEN`** check and which users need a password. Follow that file as the source of truth for this machine; align questions and commands with the recorded OS/shell.

This workflow targets the **Portal Page / Custom App** dev server at **`http://localhost:<port>`**. The **default port is 3000**; if 3000 is already in use, the next free port is typically used (**3001**, **3002**, and so on). Resolve the actual port from **`pp-dev.config`**, the dev server output, or the URL in the browser once the server is up.

The server **must be running** before access — usually **`npm run dev`**, **`npx pp-dev`**, or for **Next.js** projects the same commands or **`npx pp-dev next`** (the main tooling is **`@metricinsights/pp-dev`** on npm). If the repo is Next.js (e.g. `next` in `package.json` or a `next.config.*` file), prefer clarifying which dev command this project uses.

Backend access uses **`MI_ACCESS_TOKEN`** in **`.env`**: the local dev proxy signs every request with it, so there is no login page. If `.env` is missing or the token is not configured yet, ask whether they will add it or treat it as pending. To validate, GET **`/data/page/index/auth/info`** on **localhost** — a JSON answer with **`user`** means the token works. Variable names, role tokens and the password path are described once, in the **`portal-env-credentials`** skill.

If the instance is **old** or cannot issue tokens, sign in at **`http://localhost:<port>/login`** with **`DEFAULT_USERNAME_ADMIN`** / **`DEFAULT_PASSWORD_ADMIN`** from **`.env`** — never paste a password into chat.

Ask the developer for all required details in a single message:

```
I need your details to configure the environment:

1. Confirm the dev server is running (`npm run dev`, `npx pp-dev`, or for Next.js also `npx pp-dev next`). Local app URL: http://localhost:<port> — default 3000; if busy, often 3001, 3002, etc. Use the port from pp-dev.config, server logs, or the live URL.

2. API token: is `MI_ACCESS_TOKEN` already set in .env? If not, say "not configured yet" or describe how you'll add it.

3. If token auth will not work: confirm DEFAULT_USERNAME_ADMIN and DEFAULT_PASSWORD_ADMIN are set in .env (gitignored) — do not paste passwords into .dev-environment.md or this chat.

4. QA roles (optional): which of MI_ACCESS_TOKEN_REGULAR / _POWER / _ADMIN, or QA_USER_* / QA_PASS_*, are set in .env? Names only — no values.
```

### Step 1.1: Build page working context

Before making implementation changes, create a concise page workflow map and store it in
**`.assistant-setup/page-workflow-context.md`**:

- List key app pages/routes used in day-to-day work.
- For each page, note primary user flow, required preconditions, and expected UI markers.
- Add known caveats (required permissions, slow endpoints, unstable filters, etc.).
- If routes are dynamic, include one concrete example URL per route pattern.

Keep this file lightweight and update it when page behavior changes.

### Step 1.2: Backend API context (version-aware)

Use Metric Insights API documentation as a baseline reference:
[https://help.metricinsights.com/m/API_Access](https://help.metricinsights.com/m/API_Access)

Important:

- This documentation is not always complete for every customer environment.
- Real endpoints, field names, and validation rules can differ by Metric Insights instance version.
- Always verify with a quick live check (token + 1-2 representative requests) before relying on a payload shape.

Record any confirmed API differences in **`.dev-environment.md`** under **API compatibility notes**
(see the generated template section).

<!-- only:claude -->
### Step 1.3: Claude project instructions and agents

The **`ca-ai-tools-setup`** installer writes **`AGENTS.md`** in the repository root on every run. When Claude is
selected, it also writes **`CLAUDE.md`**, **`.claude/settings.json`**, rules under **`.claude/rules/`**, skills
under **`.claude/skills/`** and subagents under **`.claude/agents/`**. Before continuing with tooling setup:

- If **`CLAUDE.md`** or **`AGENTS.md`** is missing (older clone or manual deletion), re-run the installer.
- Add repo-specific conventions to **`CLAUDE.md`** (tests, branching, ownership) and keep it concise. Shared
  rules and workflows live in the generated rules and skills; do not copy them into **`CLAUDE.md`**.
- Keep **`AGENTS.md`** aligned with the files under **`.claude/agents/`** (add or remove table rows when agents
  change).
- **Updates:** `ca-ai-tools-setup update` keeps an unedited **`CLAUDE.md`** on the current template. Once the
  repository edits it, it is never overwritten: a newer template is left under
  **`.assistant-setup/pending-updates/`** to be merged (see **`.assistant-setup/SETUP_STATUS.md`**). Existing
  **`AGENTS.md`** content is never replaced; the installer only merges missing generated agent rows.

<!-- /only -->
### Step 2: Install tools

Install each tool sequentially and verify after each install.

<!-- only:claude -->
**Claude Code:** Some steps need a **browser or full TTY** (`gh auth login`). The embedded Bash tool may not be enough. When interaction is required, ask the developer to run the command in their own terminal, or use Claude Code’s **`! command`** form so execution happens on the user’s machine—then continue with non-interactive checks (e.g. `gh auth status`) via Bash when possible.

<!-- /only -->
**2.1. Node.js version check + nvm (if needed)**

Run one of these scripts. It automatically checks Node major version and installs **nvm + Node.js {{MIN_NODE_MAJOR}}** only when needed (Node missing or `<{{MIN_NODE_MAJOR}}`).

**macOS/Linux:**

```bash
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
if [ "$NODE_MAJOR" -ge {{MIN_NODE_MAJOR}} ]; then
  echo "Node.js $(node -v) satisfies minimum >={{MIN_NODE_MAJOR}}. Skipping nvm/Node install."
else
  command -v nvm >/dev/null 2>&1 || curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  nvm install {{MIN_NODE_MAJOR}}
  nvm use {{MIN_NODE_MAJOR}}
fi
node -v
```

**Windows (PowerShell):**

```powershell
try { $nodeMajor = [int](node -p "process.versions.node.split('.')[0]") } catch { $nodeMajor = 0 }
if ($nodeMajor -ge {{MIN_NODE_MAJOR}}) {
  Write-Host "Node.js $(node -v) satisfies minimum >={{MIN_NODE_MAJOR}}. Skipping nvm/Node install."
} else {
  if (-not (Get-Command nvm -ErrorAction SilentlyContinue)) {
    winget install CoreyButler.NVMforWindows
    $env:Path = "$env:Path;$env:ProgramFiles\nvm"
  }
  nvm install {{MIN_NODE_MAJOR}}
  nvm use {{MIN_NODE_MAJOR}}
}
node -v
```

**2.2. GitHub CLI (gh)**

Check first whether `gh` is already installed:

- **macOS/Linux**: `command -v gh && gh --version`
- **Windows (PowerShell)**: `Get-Command gh -ErrorAction SilentlyContinue; if ($?) { gh --version }`

If `gh` is already available, skip installation and proceed to authentication. Install only when the command is missing.

- **macOS**: `brew install gh`
- **Linux (Debian/Ubuntu)**:
  ```bash
  (type -p wget >/dev/null || sudo apt-get install wget -y) \
  && sudo mkdir -p -m 755 /etc/apt/keyrings \
  && out=$(mktemp) && wget -nv -O$out https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  && cat $out | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
  && sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && sudo apt update && sudo apt install gh -y
  ```
- **Windows**: `winget install --id GitHub.cli` or `choco install gh`

Authenticate and verify:

```bash
gh auth login
gh auth status
```

<!-- only:claude -->
If `gh auth login` cannot run interactively in this session, tell the developer to complete it in a local terminal (or use **`! gh auth login`** in Claude Code), then run **`gh auth status`** again to confirm.

<!-- /only -->
**2.3. Linear (MCP)**

Linear is used through the **Linear MCP** connector. It normally comes with the organization's subscription, so
this setup adds no Linear server to **`.mcp.json`** / **`.cursor/mcp.json`** and there is nothing to install. The
Linear CLI earlier setups used can no longer be authorized.

Check that the Linear tools are available in this session — for example `get_issue`, `list_issues`,
`list_comments`, `save_comment` (the client may show them with its own server prefix). Then list the
developer's assigned issues with `list_issues` (assignee `me`) to confirm the connection works.

- **The tools respond:** record `Linear MCP: connected` and continue.
- **The tools are missing or return an error:** Linear MCP is not connected in this client. Ask the developer
  to enable or reconnect the Linear connector in the client's connector / MCP settings; if it is not offered
  there, the organization's admin has to make it available. Record `Linear MCP: not connected` and **continue
  with the rest of the setup** — this is not a setup failure.

Never guess the state or the content of an issue when the Linear tools are unavailable.

**MCP_SERVERS_BLOCK**

<!-- only:cursor -->
**Enable project MCP in Cursor (manual — required)**

Writing **`.cursor/mcp.json`** during bootstrap does **not** turn MCP servers on in the IDE. The developer must enable them once per machine/workspace:

1. Open **Cursor Settings** → **Features** → **MCP** (wording may be **Cursor Settings → MCP** in newer builds).
2. Find **Project MCP** (this repository) and **enable** each server that appears in **`.cursor/mcp.json`** (for example **figma**). If a server is listed but disabled, toggle it **on**.
3. **Figma MCP:** put the personal access token into **`.env`** at the repository root as **`FIGMA_API_KEY=...`** — the server reads that file itself — or set it as a system environment variable; see the **`portal-env-credentials`** skill. No OAuth sign-in is involved. Without the token every Figma request fails.
4. Use **Refresh** / reload MCP in that settings screen (or **fully quit and restart Cursor** if tools still do not appear — same remediation as for CLI `PATH` above).
5. In **Agent** chat, confirm MCP tools are available (server connected, tool list populated) before asking the agent to read Figma via MCP.

If bootstrap **did not** create **`.cursor/mcp.json`**, skip this subsection until MCP is added manually.

<!-- /only -->
**2.5. Playwright Agent CLI (browser automation — universal, not per-developer)**

UI checks and QA drive the browser with the **Playwright Agent CLI** (see the **`playwright-cli`** skill). It
is committed with the repo so every teammate gets it from **`npm install`** — no global install and no
per-machine setup.

Set it up once for the project (skip the install if `@playwright/cli` is already a devDependency):

```bash
# 1. Pin the CLI as a devDependency so `npm install` provides it for the whole team
npm install --save-dev @playwright/cli@{{PLAYWRIGHT_CLI_VERSION}}

# 2. Confirm it resolves via the local install (no global needed)
npx playwright-cli --version

# 3. Install the browser binaries the CLI drives (first time only)
npx playwright install chromium
```

Add the CLI workspace state to **`.gitignore`** and never commit it:

```gitignore
.playwright/       # CLI workspace state (sessions, browser profiles)
.playwright-cli/   # page snapshots, console logs
```

Invoke the CLI as **`npx playwright-cli ...`** (resolves the pinned local version;
`npx -y @playwright/cli@{{PLAYWRIGHT_CLI_VERSION}} ...` is a fallback when no local install is present).

### Step 3: Developer environment profile (finalize after setup)

After installing tools, update **`.dev-environment.md`** with your local profile. **This file is personal
and gitignored** — it is regenerated per machine and records your own instance URL, shell and paths, so
committing it would leak your environment into everyone else's checkout (generator metadata remains in
**`.assistant-setup/ca-ai-tools-setup.json`**, which *is* tracked):

- If the file is missing, create it from the generated template. Do not add it to the setup PR.
- **Local app URL convention** (`http://localhost:<port>` — default **3000**, otherwise next free port; record
  the configured default and how developers discover overrides).
- **Authentication** section: **`MI_ACCESS_TOKEN`** status and the result of the check (`/data/page/index/auth/info`), which role tokens are set, and which users need a password — **usernames only**; tokens and passwords stay in **`.env`**.
- **API compatibility notes** for your Metric Insights instance (confirmed endpoint/field differences;
  see Step 1.2).
- **Last verification date** for your profile (when URL, auth, and API checks were last confirmed).
- **Supported OS, architectures, and shells** (PowerShell, cmd, bash, zsh, etc.) so future commands use the
  correct syntax for each platform.
- Keep platform notes explicit (for example: "PowerShell users should avoid `&&` and Bash heredocs").
- Never commit **`.dev-environment.md`** — `ca-ai-tools-setup` adds it to **`.gitignore`** for exactly
  this reason. Credentials and tokens belong in **`.env`**, also ignored.

### Step 4: Final verification

Run:

```bash
node -v
gh auth status
```

Then call `list_issues` (assignee `me`) through the Linear MCP.
<!-- only:cursor -->

If **`gh`** / **`node`** are reported missing despite a finished install and PATH update, ask the developer to **fully restart Cursor**, then run the checks again (see **Cursor integrated terminal** above).
<!-- /only -->

Return:

```
OK / FAIL           GitHub CLI — authentication
OK / NOT CONNECTED  Linear MCP — tools respond
OK / FAIL           .dev-environment.md profile complete
```

`NOT CONNECTED` is not a failed setup: say that Linear MCP is not available in this client and that the developer
should connect it there or ask a workspace admin.

If any check fails, suggest a concrete fix.
<!-- only:cursor -->

For **command not found** immediately after install, suggest **restarting Cursor** before deeper troubleshooting.
<!-- /only -->
