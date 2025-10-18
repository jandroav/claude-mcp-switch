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
The project uses Node.js built-in test runner (Node 18+):

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Watch mode (re-run on file changes)
npm run test:watch

# Coverage report
npm run test:coverage
```

#### Test Structure
- `test/unit/` - Unit tests for individual modules
  - `utils.test.js` - Utility functions (expandHome, truncate, safeStr, etc.)
  - `config.test.js` - Config resolution, file I/O, backup/atomic writes
  - `schema.test.js` - Schema detection, server enumeration, enable/disable logic
  - `matcher.test.js` - Identifier matching, Levenshtein distance, suggestions
  - `ui.test.js` - Color utilities
- `test/integration/` - End-to-end CLI tests
  - `cli.test.js` - Full command execution with temp configs
- `test/fixtures/` - Sample config files for testing

#### Running Individual Tests
```bash
# Run specific test file
node --test test/unit/utils.test.js

# Run specific test suite
node --test test/unit/config.test.js

# Run all tests in a directory (cross-platform)
node --test "test/unit/**/*.test.js"
```

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

### Modular Design
The codebase is organized into focused modules for testability:

- `src/ccmcp.js` - CLI entry point and command orchestration (~220 lines)
- `src/lib/utils.js` - Generic utilities (expandHome, truncate, safeStr, nowStamp, detectPlatform)
- `src/lib/config.js` - Config discovery, file I/O, JSON operations, backup/atomic writes
- `src/lib/schema.js` - Schema detection, server enumeration, enable/disable operations
- `src/lib/matcher.js` - Identifier matching, Levenshtein distance, suggestion generation
- `src/lib/ui.js` - ANSI color utilities, banner, table printing, help text

This modular structure maintains zero external dependencies while enabling comprehensive unit testing.

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
