# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**claude-mcp-switch** is a zero-dependency Node.js CLI tool for managing Claude Code MCP (Model Context Protocol) servers. It wraps the `claude` CLI commands to provide enable/disable functionality while preserving server configurations. Works across macOS, Linux, and Windows platforms.

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
The codebase is organized into focused modules:

- `src/ccmcp.js` - CLI entry point and command orchestration
- `src/lib/claude-cli.js` - Wrapper for `claude mcp` commands (list, get, add, remove)
- `src/lib/storage.js` - Local storage for disabled server configurations
- `src/lib/ui.js` - ANSI color utilities, banner, table printing, help text

This modular structure maintains zero external dependencies while enabling comprehensive unit testing.

### Core Flow
1. **Argument Parsing** (`parseArgs`): Manual argv parsing with support for `--json`, `--dry-run`, `--no-color`
2. **Claude CLI Integration**:
   - **List**: Executes `claude mcp list` and parses output
   - **Get**: Executes `claude mcp get <name>` for server details
   - **Remove**: Executes `claude mcp remove <name>` to disable
   - **Add**: Executes `claude mcp add` with stored config to re-enable
3. **Storage Management**:
   - Disabled servers stored in `~/.claude-mcp-switch/disabled-servers.json`
   - Preserves full server configuration for re-enabling
4. **Action Execution**: `actionList`, `actionEnable`, `actionDisable`

### Key Operations

#### List
- Parses `claude mcp list` output to extract server details
- Merges with locally stored disabled servers
- Formats as table or JSON based on flags

#### Disable
1. Fetches full server details via `claude mcp get <name>`
2. Stores configuration to `~/.claude-mcp-switch/disabled-servers.json`
3. Removes server via `claude mcp remove <name>`

#### Enable
1. Retrieves stored configuration from local storage
2. Re-adds server via `claude mcp add` with original settings (transport, command/URL, args, env)
3. Removes from disabled storage

### Color Output

Custom ANSI color utilities (`COLOR` object) with auto-detection:
- Disabled when: `--json`, `--no-color`, `NO_COLOR=1`, or non-TTY
- Colors: status (green/red), key (yellow), id (magenta), name (cyan), command (gray)
- Box-drawing characters for tables: `┌┬┐├┼┤└┴┘│─`

### Exit Codes
- `0`: Success
- `2`: Server not found
- `4`: Error executing claude CLI command

## JSON Output Mode

When `--json` is specified:
- All output is JSON (no banner, no colors, no tables)
- `list`: Array of server objects with `{status, name, transport, commandOrUrl, connected}`
- `enable`/`disable`: Object with `{ok, action, identifier, error?}`

## Code Style Notes

- CommonJS modules (`require`, `module.exports`)
- Node >=18 target
- Zero dependencies (no package.json dependencies)
- Manual implementations: argument parsing, ANSI colors, Levenshtein distance
- Synchronous file I/O throughout
- Error objects carry `codeEx` property for exit codes
