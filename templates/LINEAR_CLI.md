# Linear CLI Reference

Rust-based CLI for Linear.app. Use `linear-cli` (not Linear MCP) for all Linear operations — 10-50x more token-efficient.

## Auth

```bash
linear-cli config set-key lin_api_xxxxx   # API key
linear-cli auth oauth                      # OAuth (browser, auto-refresh)
```

## Command Aliases

| Alias | Full         | Domain                    |
| ----- | ------------ | ------------------------- |
| `i`   | `issues`     | Issues                    |
| `p`   | `projects`   | Projects                  |
| `t`   | `teams`      | Teams                     |
| `c`   | `cycles`     | Cycles/Sprints            |
| `l`   | `labels`     | Labels                    |
| `cm`  | `comments`   | Comments                  |
| `d`   | `documents`  | Documents                 |
| `g`   | `git`        | Git integration           |
| `j`   | `jj`         | Jujutsu integration       |
| `s`   | `search`     | Search                    |
| `b`   | `bulk`       | Bulk operations           |
| `u`   | `users`      | Users                     |
| `st`  | `statuses`   | Workflow states           |
| `tpl` | `templates`  | Templates                 |
| `up`  | `uploads`    | Uploads/Attachments       |
| `ws`  | `workspaces` | Workspaces                |
| `sy`  | `sync`       | Sync local folders        |
| `ctx` | `context`    | Current issue from branch |

## Issues

```bash
linear-cli i list                              # All issues
linear-cli i list -t Engineering -s "In Progress"  # Filter by team/status
linear-cli i list --assignee me                # My issues
linear-cli i get LIN-123                       # View issue
linear-cli i get LIN-1 LIN-2 LIN-3            # Batch fetch
linear-cli i create "Title" -t TEAM -p 2       # Create (priority: 1=urgent, 4=low)
linear-cli i create "Title" -t TEAM -s "Backlog"  # With status
linear-cli i update LIN-123 -s Done            # Update status
linear-cli i start LIN-123 --checkout          # Assign + In Progress + branch
linear-cli i stop LIN-123                      # Unassign + reset status
linear-cli i delete LIN-123 --force            # Delete
cat desc.md | linear-cli i create "Title" -t ENG -d -   # Pipe description
cat issue.json | linear-cli i create "Title" -t ENG --data -  # JSON input
```

## Comments

```bash
linear-cli cm list ISSUE_ID                    # List comments
linear-cli cm list ISSUE_ID --output json      # JSON (great for LLMs)
linear-cli cm create ISSUE_ID -b "Comment body"
```

## Git Integration

```bash
linear-cli g checkout LIN-123                  # Create/checkout branch for issue
linear-cli g checkout LIN-123 -b custom-name   # Custom branch name
linear-cli g branch LIN-123                    # Show branch name
linear-cli g create LIN-123                    # Create branch (no checkout)
linear-cli g pr LIN-123                        # Create PR linked to issue
linear-cli g pr LIN-123 --draft                # Draft PR
linear-cli g pr LIN-123 --base main            # Specify base branch
```

## Jujutsu Integration

```bash
linear-cli j checkout LIN-123                  # Create bookmark
linear-cli j bookmark LIN-123                  # Show bookmark name
linear-cli j pr LIN-123                        # Create PR via jj git push
```

## Projects

```bash
linear-cli p list                              # List projects
linear-cli p get PROJECT_ID                    # View project
linear-cli p create "Q1 Roadmap" -t Engineering
linear-cli p update PROJECT_ID --name "New Name"
linear-cli p delete PROJECT_ID --force
linear-cli p add-labels PROJECT_ID LABEL_ID
```

## Teams

```bash
linear-cli t list
linear-cli t get TEAM_ID
```

## Users

```bash
linear-cli u list
linear-cli u get me                            # Current user
```

## Cycles/Sprints

```bash
linear-cli c list -t Engineering
linear-cli c current -t Engineering            # Current cycle
```

## Labels

```bash
linear-cli l list                              # Project labels
linear-cli l list --type issue                 # Issue labels
linear-cli l create "Feature" --color "#10B981"
linear-cli l delete LABEL_ID --force
```

## Documents

```bash
linear-cli d list
linear-cli d get DOC_ID
linear-cli d create "Doc Title" -p PROJECT_ID
linear-cli d update DOC_ID --title "New title"
```

## Statuses

```bash
linear-cli st list -t Engineering
linear-cli st get "In Progress" -t Engineering
```

## Templates

```bash
linear-cli tpl list
linear-cli tpl show bug --output json
```

## Search

```bash
linear-cli s issues "authentication bug"
linear-cli s projects "backend" --limit 10
```

## Bulk Operations

```bash
linear-cli b update -s Done LIN-1 LIN-2 LIN-3
linear-cli b assign --user me LIN-1 LIN-2
linear-cli b label --add bug LIN-1 LIN-2
linear-cli b move --project "Q1" LIN-1 LIN-2
linear-cli b delete --force LIN-1 LIN-2 LIN-3
```

## Uploads

```bash
linear-cli up fetch "https://uploads.linear.app/..." -f image.png  # Download
linear-cli up fetch "https://uploads.linear.app/..." | base64       # Stdout
```

## Sync Local Folders

```bash
linear-cli sy status                           # Compare local vs Linear
linear-cli sy push -t Engineering --dry-run    # Preview
linear-cli sy push -t Engineering              # Create projects
```

## Import/Export

```bash
# Export
linear-cli export csv -t Engineering -o issues.csv
linear-cli export json -t Engineering -o issues.json
linear-cli export markdown -t Engineering -o issues.md

# Import
linear-cli import csv issues.csv -t Engineering
linear-cli import json issues.json -t Engineering
```

## Workspaces

```bash
linear-cli ws list                             # List workspaces
linear-cli ws add personal                     # Add workspace
linear-cli ws switch personal                  # Switch
linear-cli ws current                          # Show current
linear-cli ws remove personal                  # Remove
```

## Interactive TUI

```bash
linear-cli ui                                  # Launch TUI
linear-cli ui --team ENG                       # With team filter
linear-cli ui issues                           # Browse issues
linear-cli ui projects                         # Browse projects
```

## Context

```bash
linear-cli context                             # Current issue from git branch
linear-cli context --output json               # JSON output
linear-cli agent                               # Agent-focused summary
```

## Agent-Optimized Flags

| Flag                | Purpose                           |
| ------------------- | --------------------------------- |
| `--output json`     | Machine-readable JSON             |
| `--compact`         | No pretty-print JSON              |
| `--fields a,b,c`    | Limit fields (supports dot paths) |
| `--sort field`      | Sort by field                     |
| `--order asc\|desc` | Sort direction                    |
| `--quiet` / `-q`    | Suppress decorative output        |
| `--id-only`         | Output only created/updated ID    |
| `--api-key KEY`     | Override API key                  |
| `--dry-run`         | Preview without executing         |
| `--no-color`        | Disable color output              |
| `--width N`         | Table width                       |
| `--no-truncate`     | Don't truncate table columns      |
| `-d -` / `--data -` | Read from stdin                   |

## Environment Variables

| Variable                 | Purpose                    |
| ------------------------ | -------------------------- |
| `LINEAR_CLI_OUTPUT=json` | Default all output to JSON |

## Exit Codes

| Code | Meaning       |
| ---- | ------------- |
| `0`  | Success       |
| `1`  | General error |
| `2`  | Not found     |
| `3`  | Auth error    |
| `4`  | Rate limited  |

## JSON Error Shape

```json
{"error": true, "message": "...", "code": N, "details": {...}, "retry_after": N}
```

## Common Workflows

```bash
# Daily standup
linear-cli i list --assignee me

# Start work on issue
linear-cli i start LIN-123 --checkout

# Finish + PR
linear-cli i update LIN-123 -s Done
linear-cli g pr LIN-123

# Quick create, capture ID
ID=$(linear-cli i create "Bug" -t ENG -q --id-only)

# Token-efficient JSON
linear-cli i list --output json --fields identifier,title,state.name --compact
```

## Shell Completions

```bash
linear-cli completions bash > ~/.bash_completion.d/linear-cli
linear-cli completions zsh > ~/.zsh/completions/_linear-cli
linear-cli completions fish > ~/.config/fish/completions/linear-cli.fish
```

## Help

```bash
linear-cli --help                              # General help
linear-cli <command> --help                    # Command-specific help
linear-cli agent                               # Agent-focused capabilities
linear-cli common                              # Common tasks reference
```
