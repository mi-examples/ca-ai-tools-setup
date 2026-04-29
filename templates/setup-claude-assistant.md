# Claude Code Setup Assistant

> Paste this file into Claude Code (or copy its contents as a prompt).
> The assistant should execute setup **step by step**; gather blocking questions in **one message** when possible, without unnecessary back-and-forth.

---

## Instructions for Claude

You are a setup assistant for **Metric Insights Portal Page / Custom App** repository local development (see **`pp-dev.config`** and npm package **`@metricinsights/pp-dev`**).
The developer may be on **macOS**, **Linux**, or **Windows**.

**Node.js:** Recent **`@metricinsights/pp-dev`** requires **Node.js 22 or newer**. Prefer matching **`package.json` `engines`**, local tooling, and any **CI** job (e.g. GitHub Actions `setup-node`) to the same major version the project actually uses for `npm run dev` / `pp-dev`.

**CI:** Some repositories still have no automated pipeline; that can be normal today, but **CI for build, lint, and tests** is the intended direction for maintained apps. If `.github/workflows/` (or equivalent) is absent, do not treat it as a setup failure. When CI exists or is added, ensure install steps (`npm ci`, etc.) and the Node version align with this repo and pp-dev.

First, detect the OS:

```bash
uname -s
```

- `Darwin` = macOS
- `Linux` = Linux
- If the command fails or returns `MINGW`/`MSYS`/`CYGWIN` = Windows (Git Bash / WSL)

### Step 1: Gather information

Before asking the developer, read **`pp-dev.config`** in the repo root for the current dev setup (port, plugin options, and related settings).

This workflow targets the **Portal Page / Custom App** dev server at **`http://localhost:<port>`**. The **default port is 3000**; if 3000 is already in use, the next free port is typically used (**3001**, **3002**, and so on). Resolve the actual port from **`pp-dev.config`**, the dev server output, or the URL in the browser once the server is up.

The server **must be running** before access — usually **`npm run dev`**, **`npx pp-dev`**, or for **Next.js** projects the same commands or **`npx pp-dev next`** (the main tooling is **`@metricinsights/pp-dev`** on npm). If the repo is Next.js (e.g. `next` in `package.json` or a `next.config.*` file), prefer clarifying which dev command this project uses.

Backend access normally uses an **API token** in **`.env`**. If `.env` is missing or the token is not configured yet, ask whether they will add it or treat it as pending.

If the backend instance version is **old**, token-based access may fail; fall back to UI login at **`http://localhost:<port>/login`** and request **username** and **password**.

Ask the developer for all required details in a single message:

```
I need your details to configure the environment:

1. Confirm the dev server is running (`npm run dev`, `npx pp-dev`, or for Next.js also `npx pp-dev next`). Local app URL: http://localhost:<port> — default 3000; if busy, often 3001, 3002, etc. Use the port from pp-dev.config, server logs, or the live URL.

2. API token for backend access: is it already set in .env? If not, say "not configured yet" or describe how you'll add it.

3. If API token auth will not work (older backend): username and password for http://localhost:<port>/login
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

Record any confirmed API differences in **`.linear-assistant-setup.md`** under a short
`API Compatibility Notes` section.

### Step 1.3: Claude project instructions and agents

Before continuing with tooling setup, ensure this repository has Claude project instructions:

- If **`CLAUDE.md`** is missing in the repository root, create it.
- In **`CLAUDE.md`**, add a short section that tells Claude to use specialized agents from
  **`.claude/agents/*.md`** when available.
- If **`.claude/agents/figma-mcp.md`** exists, explicitly instruct Claude to use that agent
  for Figma MCP design-to-code tasks instead of ad-hoc styling decisions.
- Keep **`CLAUDE.md`** concise and repo-specific; avoid duplicating large setup instructions
  already captured in this file.

### Step 2: Install tools

Install each tool sequentially and verify after each install.

**Claude Code:** Some steps need a **browser or full TTY** (`gh auth login`, `linear-cli auth oauth`). The embedded Bash tool may not be enough. When interaction is required, ask the developer to run the command in their own terminal, or use Claude Code’s **`! command`** form so execution happens on the user’s machine—then continue with non-interactive checks (e.g. `gh auth status`, `linear-cli --version`, `linear-cli i list …`) via Bash when possible.

**2.1. Node.js version check + nvm (if needed)**

Run one of these scripts. It automatically checks Node major version and installs **nvm + Node.js 24** only when needed (Node missing or `<22`).

**macOS/Linux:**

```bash
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
if [ "$NODE_MAJOR" -ge 22 ]; then
  echo "Node.js $(node -v) satisfies minimum >=22. Skipping nvm/Node install."
else
  command -v nvm >/dev/null 2>&1 || curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  nvm install 24
  nvm use 24
fi
node -v
```

**Windows (PowerShell):**

```powershell
try { $nodeMajor = [int](node -p "process.versions.node.split('.')[0]") } catch { $nodeMajor = 0 }
if ($nodeMajor -ge 22) {
  Write-Host "Node.js $(node -v) satisfies minimum >=22. Skipping nvm/Node install."
} else {
  if (-not (Get-Command nvm -ErrorAction SilentlyContinue)) {
    winget install CoreyButler.NVMforWindows
    $env:Path = "$env:Path;$env:ProgramFiles\nvm"
  }
  nvm install 24
  nvm use 24
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

If `gh auth login` cannot run interactively in this session, tell the developer to complete it in a local terminal (or use **`! gh auth login`** in Claude Code), then run **`gh auth status`** again to confirm.

**2.3. linear-cli**

Check first whether `linear-cli` is already installed:

- **macOS/Linux**: `command -v linear-cli && linear-cli --version`
- **Windows (PowerShell)**: `Get-Command linear-cli -ErrorAction SilentlyContinue; if ($?) { linear-cli --version }`

If `linear-cli` is already available, skip installation and continue with PATH/auth checks. Install only when the command is missing.

Detect OS and architecture. Fetch releases from the GitHub API (newest first) and download the platform archive from [https://github.com/Finesssee/linear-cli/releases](https://github.com/Finesssee/linear-cli/releases). **The latest release may not ship every platform binary.** If the asset is missing for your OS/arch (404), iterate through older releases until a download succeeds—use the first tag that provides the expected filename.

**macOS:**

```bash
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
  ASSET="linear-cli-aarch64-apple-darwin.tar.gz"
else
  ASSET="linear-cli-x86_64-apple-darwin.tar.gz"
fi
mkdir -p ~/bin
LINEAR_CLI_VERSION=""
for tag in $(curl -sL "https://api.github.com/repos/Finesssee/linear-cli/releases?per_page=100" | grep '"tag_name"' | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/'); do
  if curl -fsL -o /tmp/linear-cli.tar.gz "https://github.com/Finesssee/linear-cli/releases/download/${tag}/${ASSET}"; then
    LINEAR_CLI_VERSION=$tag
    break
  fi
done
if [ -z "$LINEAR_CLI_VERSION" ]; then
  echo "No release found with ${ASSET} (checked recent releases)." >&2
  exit 1
fi
echo "Installing linear-cli ${LINEAR_CLI_VERSION}"
tar -xzf /tmp/linear-cli.tar.gz -C ~/bin/
chmod +x ~/bin/linear-cli
rm /tmp/linear-cli.tar.gz
~/bin/linear-cli --version
```

**Linux:**

```bash
ARCH=$(uname -m)
if [ "$ARCH" = "aarch64" ]; then
  ASSET="linear-cli-aarch64-unknown-linux-gnu.tar.gz"
else
  ASSET="linear-cli-x86_64-unknown-linux-gnu.tar.gz"
fi
mkdir -p ~/bin
LINEAR_CLI_VERSION=""
for tag in $(curl -sL "https://api.github.com/repos/Finesssee/linear-cli/releases?per_page=100" | grep '"tag_name"' | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/'); do
  if curl -fsL -o /tmp/linear-cli.tar.gz "https://github.com/Finesssee/linear-cli/releases/download/${tag}/${ASSET}"; then
    LINEAR_CLI_VERSION=$tag
    break
  fi
done
if [ -z "$LINEAR_CLI_VERSION" ]; then
  echo "No release found with ${ASSET} (checked recent releases)." >&2
  exit 1
fi
echo "Installing linear-cli ${LINEAR_CLI_VERSION}"
tar -xzf /tmp/linear-cli.tar.gz -C ~/bin/
chmod +x ~/bin/linear-cli
rm /tmp/linear-cli.tar.gz
~/bin/linear-cli --version
```

**Windows (PowerShell):**

```powershell
$assetName = "linear-cli-x86_64-pc-windows-msvc.zip"
$releases = Invoke-RestMethod -Uri "https://api.github.com/repos/Finesssee/linear-cli/releases?per_page=100"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\bin" | Out-Null
$version = $null
foreach ($rel in $releases) {
  $tag = $rel.tag_name
  $url = "https://github.com/Finesssee/linear-cli/releases/download/$tag/$assetName"
  try {
    Invoke-WebRequest -Uri $url -OutFile "$env:TEMP\linear-cli.zip" -ErrorAction Stop
    $version = $tag
    break
  } catch {
    continue
  }
}
if (-not $version) { throw "No release found with $assetName (checked recent releases)." }
Write-Host "Installing linear-cli $version"
Expand-Archive -Path "$env:TEMP\linear-cli.zip" -DestinationPath "$env:USERPROFILE\bin" -Force
Remove-Item "$env:TEMP\linear-cli.zip"
```

Ensure the install directory is in PATH:

- **macOS/Linux (zsh):**
  ```bash
  echo $PATH | grep -q "$HOME/bin" && echo "OK" || { echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc; }
  ```
- **macOS/Linux (bash):**
  ```bash
  echo $PATH | grep -q "$HOME/bin" && echo "OK" || { echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc; }
  ```
- **Windows:** Add `%USERPROFILE%\bin` to system PATH via Settings → Environment Variables, or:
  ```powershell
  $p = [Environment]::GetEnvironmentVariable("PATH","User"); if ($p -notlike "*$env:USERPROFILE\bin*") { [Environment]::SetEnvironmentVariable("PATH","$env:USERPROFILE\bin;$p","User") }
  ```

Authenticate and verify:

```bash
linear-cli --version
linear-cli auth oauth
linear-cli i list --assignee me
```

If `linear-cli auth oauth` needs a browser or TTY outside this session, have the developer run it locally (or **`! linear-cli auth oauth`** in Claude Code), then re-run **`linear-cli --version`** and **`linear-cli i list --assignee me`** here.

**PLAYWRIGHT_MCP_BLOCK**

### Step 3: Create local setup summary

Create **`.linear-assistant-setup.md`** in the project root with:

- Local app URL (`http://localhost:<port>` — default **3000**, otherwise next free port; record the actual port from `pp-dev.config` or the running server)
- API token status in `.env` (`set` or `not configured yet`)
- Login fallback (username noted if used for `/login`; omit password — never store passwords in this file)
- API compatibility notes (confirmed endpoint/field differences for the current instance version)
- Last verification date

Do not include Docker or MySQL instructions.

### Step 4: Developer environment profile (finalize after setup)

After installing tools, update **`.dev-environment.md`** with the final
local environment details:

- If the file is missing, create it from the generated template and fill in local details.
- Record OS, architecture, and available shells (PowerShell, cmd, bash, zsh, etc.) so future
  commands use the correct syntax for this machine.
- Keep shell notes explicit (for example: "primary shell is PowerShell; avoid `&&` and Bash
  heredocs").
- Add **`.dev-environment.md`** to **`.gitignore`** if not already present (this file is personal
  and should not be committed).

### Step 5: Final verification

Run:

```bash
node -v
gh auth status
linear-cli i list --assignee me --limit 3
```

Return:

```
OK / FAIL  GitHub CLI — authentication
OK / FAIL  linear-cli — authentication
OK / FAIL  .linear-assistant-setup.md created
```

If any check fails, suggest a concrete fix.
