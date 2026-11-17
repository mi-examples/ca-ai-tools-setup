---
name: portal-env-credentials
description: Where Portal Page credentials and instance URLs live—the `.env` variables for the MI instance, application keys, login users and the Figma token, and the rules for using them. Use before logging in to the app, running QA or scripts that need credentials, or when a secret or instance URL is needed. Never commit secrets.
---

# Environment variables (`.env`)

Secrets and instance-specific values live in **`.env`** at the repo root. **`.env` is gitignored** — commit only **`.env.example`** (placeholders).

## Variables (team standard)

| Variable | Purpose |
|----------|---------|
| **`BASE_URL`** | Metric Insights **instance** base URL (e.g. `https://your-org.metricinsights.com/`). Align with **`pp-dev.config.ts`** `mi.url` when they describe the same backend. For a pre-1.0 `pp-dev` config (`backendBaseURL`), run `npx @metricinsights/pp-dev migrate` rather than hand-editing it — see the **`ai-development`** skill. |
| **`APPLICATION_ID`** | MI application identifier (API / integrations as required). |
| **`APPLICATION_KEY`** | MI application key (API / integrations as required). |
| **`DEFAULT_USERNAME_ADMIN`** | Default **username** for Portal login during **development** and **testing** (local or scripted flows). |
| **`DEFAULT_PASSWORD_ADMIN`** | Default **password** for that user — **never** paste into committed files, Linear, or chat. |
| **`FIGMA_API_KEY`** | **Figma** Personal Access Token (`https://www.figma.com/developers/api#access-tokens`) used by the **Figma MCP** server registered in **`.mcp.json`** / **`.cursor/mcp.json`** and by direct **Figma REST** calls (e.g. `curl -H "X-Figma-Token: $FIGMA_API_KEY" https://api.figma.com/v1/files/<fileKey>`). Used by the **`figma-implementation`** and **`figma-code-connect`** skills. Never commit a real token. |

## Rules for agents

1. **Testing** (the **`testing-flow`** and **`testing-with-linear`** skills): prefer role vars **`QA_USER_*`** / **`QA_PASS_*`** from **`.env`** for multi-role QA; **`DEFAULT_USERNAME_ADMIN`** / **`DEFAULT_PASSWORD_ADMIN`** for quick admin login — not hardcoded strings in repo sources.
2. **Development** (the **`ai-development`** skill): same — use **`.env`** for local login and any script that needs admin; keep **`BASE_URL`** / keys consistent with **`pp-dev.config.ts`** (`mi.url`) and MI docs.
3. **Override:** process env **`PP_USER`** / **`PP_PASS`** may still override defaults for one-off runs; **`PP_LOCAL_APP_URL`** (optional) overrides the Playwright entry URL.
4. Load **`.env`** in Node automation via **`dotenv`**, or export the variables in the shell before commands — do not commit a populated **`.env`**.
5. Do not paste real passwords into **`test-documentation/`** or any committed file.

## Setup

```bash
cp .env.example .env
# Edit .env locally; never git add .env
```
