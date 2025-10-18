# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ccmcp** is a zero-dependency Node.js CLI tool for managing Claude Code/Claude Desktop MCP (Model Context Protocol) servers. It enables users to list, enable, and disable MCP servers across macOS, Linux, and Windows platforms.

## Development Commands

### Running the CLI Locally
```bash
# List MCP servers
node ./src/ccmcp.js list

# Enable a server
node ./src/ccmcp.js enable <identifier>

# Disable a server (dry-run)
node ./src/ccmcp.js disable <identifier> --dry-run

# Use custom config path
node ./src/ccmcp.js list --config ~/.claude/settings.json
```

### Testing
Currently, there are no automated tests. When adding tests, they should cover:
- Config path resolution across all platforms
- Schema detection (object vs array, with/without enabled flags)
- Identifier matching (id, key, name with case-insensitivity)
- Enable/disable operations for both object and array schemas
- Levenshtein distance suggestions
- Atomic file writes and backup creation

### Publishing
The project uses a GitHub Actions workflow for versioning and publishing:
```bash
# Trigger via GitHub UI: Actions > Version and Release > Run workflow
# Choose release type: patch, minor, or major
```

The workflow automatically:
- Bumps version with `npm version <type>`
- Pushes commit and tag
- Publishes to npm with public access
- Creates GitHub Release with auto-generated notes

## Architecture

### Single-File Design
All logic resides in `src/ccmcp.js` (830+ lines). This is intentional for zero-dependency distribution and simplicity.

### Core Flow
1. **Argument Parsing** (`parseArgs`): Manual argv parsing with support for `--config`, `--json`, `--dry-run`, `--no-color`
2. **Config Discovery** (`resolveConfigPath`): Multi-platform path resolution with precedence:
   - `--config` flag override
   - `CLAUDE_CONFIG_DIR` environment variable
   - Platform-specific defaults (macOS: `~/Library/Application Support/Claude/`, Linux: `~/.config/claude/`, Windows: `%APPDATA%\Claude\`)
3. **Schema Detection** (`detectSchema`): Identifies whether `mcpServers` is object or array, and whether entries use `enabled` property
4. **Server Enumeration** (`enumerateServers`): Flattens both `mcpServers` and `mcpServersDisabled` into unified list with metadata
5. **Action Execution**: `actionList`, `actionEnable`, `actionDisable`

### Key Data Structures

#### Server Item (from `packItem`)
```javascript
{
  key: string,           // Object key (object schema only)
  id: string,            // Server id field
  name: string,          // Server name field
  def: object,           // Original server definition
  container: 'active'|'disabled',  // Which top-level key it's under
  status: 'enabled'|'disabled',    // Computed status
  command: string,       // Brief command string
  transport: string,     // Brief transport string
  shape: 'object'|'array',
  index: number          // Array index (array schema only)
}
```

#### Schema Detection Result
```javascript
{
  shape: 'object'|'array',
  hasEnabled: boolean    // Whether any entry has 'enabled' property
}
```

### Enable/Disable Logic

**Object Schema**:
- If `enabled` property exists: toggle boolean
- Otherwise: move entry between `mcpServers` and `mcpServersDisabled` objects

**Array Schema**:
- If `enabled` property exists: toggle boolean
- Otherwise: disable is unsupported (error instructs user to add `enabled` field or convert to object)

### Identifier Matching (`matchIdentifier`)

Priority order: `id` → `key` → `name` (case-insensitive exact match)

If no exact match:
- Returns Levenshtein-distance-sorted suggestions (up to 5)
- Exit code 2 for no match, 3 for ambiguous match

### File Safety

All writes use atomic rename pattern:
1. Create backup: `<file>.bak.YYYYMMDD-HHMMSS`
2. Write to temp file: `.<file>.tmp-<pid>-<timestamp>`
3. Atomic rename temp → target
4. Always preserve unknown JSON fields (2-space formatting)

### Color Output

Custom ANSI color utilities (`COLOR` object) with auto-detection:
- Disabled when: `--json`, `--no-color`, `NO_COLOR=1`, or non-TTY
- Colors: status (green/red), key (yellow), id (magenta), name (cyan), command (gray)
- Box-drawing characters for tables: `┌┬┐├┼┤└┴┘│─`

### Exit Codes
- `0`: Success
- `2`: No identifier match
- `3`: Ambiguous identifier
- `4`: IO error or config not found
- `5`: Invalid JSON or unsupported schema

## Platform Considerations

### Config Paths
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`, `~/.claude/settings.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`, `~/.claude/settings.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`, `%USERPROFILE%\.claude\settings.json`

### Path Handling
- `expandHome()` handles `~` prefix expansion
- Windows: Uses `process.env.APPDATA` with fallback to `AppData\Roaming`

## JSON Output Mode

When `--json` is specified:
- All output is JSON (no banner, no colors, no tables)
- `list`: Array of server objects
- `enable`/`disable`: Object with `{ ok, action, identifier, changes, configPath, backup?, dryRun?, error?, suggestions? }`

## Supported MCP Server Schemas

### Object (Recommended)
```json
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
```

### Array
```json
{
  "mcpServers": [
    {
      "id": "github",
      "name": "GitHub MCP",
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-github"],
      "enabled": true
    }
  ]
}
```

### Disabled Container
Tool-managed `mcpServersDisabled` mirrors the shape of `mcpServers` (object or array).

## Code Style Notes

- CommonJS modules (`require`, `module.exports`)
- Node >=18 target
- Zero dependencies (no package.json dependencies)
- Manual implementations: argument parsing, ANSI colors, Levenshtein distance
- Synchronous file I/O throughout
- Error objects carry `codeEx` property for exit codes
