# ccmcp - Claude Code MCP switcher

A zero-dependency npx CLI to list, enable, and disable Claude Code/Claude Desktop MCP servers.
Supports macOS, Linux, and Windows, with config discovery via CLAUDE_CONFIG_DIR or OS defaults.

## ✨ Features
- List active and disabled MCP servers
- Enable/disable by id, key (object key), or name
- Safe writes: backup + atomic rename
- JSON output and dry-run mode
- Works with object- or array-shaped mcpServers
- Attractive UI: ASCII banner, colorized output, and box-drawn tables for list and suggestion displays
- Color control: auto-detect TTY, disable with --no-color or NO_COLOR=1; always off in --json

## 📋 Requirements
- Node.js >= 18
- Claude Code or Claude Desktop installed

## 🚀 Install / Use
- **One-off via npx** (after publish):
  - npx ccmcp list
  - npx ccmcp enable github
  - npx ccmcp disable my-mcp-id --dry-run
- **Global install via npm**:
  1. Install globally: `npm install -g ccmcp`
  2. Use the tool: `ccmcp list`
  3. Enable MCP: `ccmcp enable github`
  4. Disable MCP: `ccmcp disable github`
- **Local npx usage** (no installation required):
  1. List servers: `npx ccmcp list`
  2. Enable server: `npx ccmcp enable github`
  3. Disable server: `npx ccmcp disable github --dry-run`
- **Local development**:
  - node ./src/ccmcp.js list
  - node ./src/ccmcp.js enable github --config ~/.claude/settings.json
  - Windows (CMD): node .\src\ccmcp.js enable github --config %USERPROFILE%\.claude\settings.json
  - Windows (PowerShell): node .\src\ccmcp.js enable github --config "$env:USERPROFILE\.claude\settings.json"

## 💻 Commands
- list [--json] [--config PATH] [--no-color]
  - Prints a colorized, boxed table with STATUS, KEY, ID, NAME, COMMAND/TRANSPORT
- enable <identifier> [--config PATH] [--dry-run] [--json] [--no-color]
- disable <identifier> [--config PATH] [--dry-run] [--json] [--no-color]
- --help, --version

## 🎯 Identifier resolution
- Case-insensitive exact match.
- Priority: id > key > name.
- Ambiguity: exits 3 and shows candidates.
- No match: exits 2 and shows nearest suggestions.

## 🔍 Config discovery
Order of precedence:
1) --config PATH
2) CLAUDE_CONFIG_DIR:
   - $CLAUDE_CONFIG_DIR/settings.json
   - $CLAUDE_CONFIG_DIR/claude_desktop_config.json
3) OS defaults:
   - macOS:
     - ~/Library/Application Support/Claude/claude_desktop_config.json
     - ~/.claude/settings.json
   - Linux:
     - ~/.config/claude/claude_desktop_config.json
     - ~/.claude/settings.json
   - Windows:
     - %APPDATA%\Claude\claude_desktop_config.json
     - %USERPROFILE%\.claude\settings.json
If none found, exit 4 with guidance.

## 📦 Supported schemas
- mcpServers as object (recommended):
  - { "github": { command, args, id?, name?, enabled? }, ... }
  - Toggle behavior:
    - If enabled present: set boolean.
    - Else: move entry between mcpServers and mcpServersDisabled.
- mcpServers as array:
  - [ { id?, name?, command?, args?, enabled? }, ... ]
  - Toggle behavior:
    - If enabled present: set boolean.
    - Disable without enabled: unsupported; add enabled or use object.
- mcpServersDisabled:
  - Only created/used by this tool when moving entries.
  - Mirrors shape (object/array) of mcpServers.

## 🔐 Write safety
- Validates JSON before modification.
- Creates backup: <file>.bak.YYYYMMDD-HHMMSS
- Atomic write: tmp file then rename.
- Preserves unknown fields and formatting (2-space JSON).

## 🚪 Exit codes
- 0: success
- 2: no match
- 3: ambiguous match
- 4: IO or config not found
- 5: invalid JSON / unsupported schema

## 📝 Examples
- List:
  - npx ccmcp list
- Disable by key:
  - npx ccmcp disable github
- Enable by id with dry-run:
  - npx ccmcp enable my-mcp-id --dry-run
- Use custom config:
  - npx ccmcp list --config ~/.claude/settings.json

## 📊 JSON output
- Example list:
  - npx ccmcp list --json
  - Outputs array of { status, key, id, name, command, transport, container }
- Example enable (dry-run):
  - npx ccmcp enable github --dry-run --json
  - Outputs planned changes and configPath

## 🔧 Troubleshooting
- Ensure config is valid JSON (check with jq).
- If array-shaped mcpServers lacks enabled, add "enabled": true/false or convert to object.
- Use --config to point directly at your settings.json.
- On Windows, defaults are `%APPDATA%\Claude\claude_desktop_config.json` and `%USERPROFILE%\.claude\settings.json`. Quote paths with spaces (e.g., "Application Support"). You can also set `CLAUDE_CONFIG_DIR` and use `%CLAUDE_CONFIG_DIR%\settings.json`.

## 📚 Reference
- Claude Code MCP: https://docs.claude.com/en/docs/claude-code/mcp
- Example mcpServers object:
  {
    "mcpServers": {
      "github": {
        "command": "npx",
        "args": ["-y", "@anthropic-ai/mcp-server-github"],
        "id": "github",
        "enabled": true
      }
    }
  }

## 📄 License
MIT

## 🎉 Release and Publish

Use the included GitHub Action to version, create a GitHub Release, and publish to npm (usable via npx).

- Workflow file: [release.yml](.github/workflows/release.yml:1)
- Package entry: [package.json](./package.json:1)

Prerequisites:
- Create a repository secret named NPM_TOKEN containing an npm access token with publish rights to the package scope.
- Ensure the package name in [package.json](./package.json:1) is available on npm (or within your org scope).

Steps:
- Manually trigger the workflow (Actions &gt; Version and Release &gt; Run workflow).
- Choose release_type: patch, minor, or major.
- The workflow will:
  - Run npm version &lt;type&gt; (creates a commit and Git tag).
  - Push the version commit and tag.
  - Publish the package to npm using NPM_TOKEN.
  - Create a GitHub Release for the new tag with auto-generated notes.

Result:
- Users can install and run via npm/npx:
  - npx ccmcp list
  - npm i -g ccmcp &amp;&amp; ccmcp list

Notes:
- The workflow uses Node 18 and publishes with public access.
- The files published are restricted by the "files" array in [package.json](./package.json:1).
- If you prefer automated releases on tag push, extend [release.yml](.github/workflows/release.yml:1) with:
  on:
    push:
      tags:
        - 'v*'
  and push an annotated tag like v0.1.1.
