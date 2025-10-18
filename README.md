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
- **Local development (no registry)**:
  1. Clone the repo locally:
     - `git clone <repo-url>` and `cd claude-mcp-switch`
  2. Ensure the CLI entrypoint is executable:
     - macOS/Linux: `chmod +x ./src/ccmcp.js` (shebang is present in [src/ccmcp.js](src/ccmcp.js:1))
  3. Link globally to use the `ccmcp` command anywhere:
     - `npm link` (uses the bin mapping in [package.json](./package.json:6))
  4. Use the tool:
     - `ccmcp list`
     - `ccmcp enable github`
     - Disable color during tests: `ccmcp list --no-color`
  5. Unlink when done:
     - `npm unlink -g ccmcp` (or run `npm unlink` inside the project)

- **Alternative: run directly without linking**
  - macOS/Linux:
    - `node ./src/ccmcp.js list`
    - `node ./src/ccmcp.js enable github --config ~/.claude/settings.json`
  - Windows (CMD):
    - `node .\src\ccmcp.js list`
    - `node .\src\ccmcp.js enable github --config %USERPROFILE%\.claude\settings.json`
  - Windows (PowerShell):
    - `node .\src\ccmcp.js list`
    - `node .\src\ccmcp.js enable github --config "$env:USERPROFILE\.claude\settings.json"`

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

## 🧪 Testing

The project uses Node.js built-in test runner (Node 18+) with comprehensive unit and integration tests.

### Running Tests
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Coverage
- Unit tests for all modules (utils, config, schema, matcher, ui)
- Integration tests for CLI commands
- End-to-end tests with temp config files
- Platform-specific path resolution tests
- Error handling and edge case coverage

## 📄 License
MIT

## 🤖 GitHub Workflows

This project includes comprehensive CI/CD automation with multiple GitHub Actions workflows:

### 🔄 CI Workflow ([ci.yml](.github/workflows/ci.yml))

Runs automatically on every pull request and push to main/master:

- **Multi-platform testing**: Tests on Ubuntu, macOS, and Windows
- **Multi-version Node.js**: Tests with Node 18, 20, and 22
- **Test suite**: Runs unit and integration tests
- **Code quality checks**: Validates package structure and security
- **Package building**: Creates npm package artifact
- **PR comments**: Automatically comments on PRs when checks fail

### 📝 Release Drafter ([release-drafter.yml](.github/workflows/release-drafter.yml))

Automatically maintains draft releases with changelogs based on merged PRs:

- **Auto-categorization**: Organizes changes by type (features, bugs, maintenance, etc.)
- **Version inference**: Automatically suggests next version based on PR labels
- **Changelog generation**: Creates formatted changelog from PR titles
- **Contributor tracking**: Lists all contributors to the release

#### Label Categories:
- 💥 Breaking Changes: `breaking-change`, `breaking`, `major`
- 🚀 Features: `feature`, `enhancement`
- 🐛 Bug Fixes: `bug`, `fix`, `regression`
- 🔒 Security: `security`, `vulnerability`
- ⚡ Performance: `performance`, `optimization`
- 🧰 Maintenance: `chore`, `refactor`, `deps`
- 🤖 CI/CD: `ci`, `cd`, `workflow`, `github-actions`
- 📝 Documentation: `docs`, `documentation`
- 🧪 Testing: `test`, `testing`

### 🏷️ PR Labeler ([pr-labeler.yml](.github/workflows/pr-labeler.yml))

Automatically labels pull requests based on:

- **File paths**: Labels based on which files are changed (docs, tests, CI, etc.)
- **PR size**: Adds size labels (XS, S, M, L, XL) based on lines changed
- **Conventional commits**: Detects commit types in PR titles (feat, fix, docs, etc.)
- **Description check**: Warns if PR description is missing or too short

Configuration file: [labeler.yml](.github/labeler.yml)

### 🎉 Publish to npm ([release.yml](.github/workflows/release.yml))

Automatically publishes to npm when you publish a GitHub release:

- Workflow file: [release.yml](.github/workflows/release.yml)
- Package entry: [package.json](./package.json:1)

#### Prerequisites:
- Create a repository secret named `NPM_TOKEN` containing an npm access token with publish rights
- Ensure the package name in [package.json](./package.json:1) is available on npm

#### How It Works:

1. **Create PRs and merge them** - Release Drafter automatically maintains a draft release with changelog
2. **Edit the draft release** (optional) - Review and edit the changelog if needed
3. **Publish the release** - Click "Publish release" in the GitHub UI
4. **Automatic npm publish** - The workflow automatically:
   - Runs full test suite
   - Extracts version from release tag (e.g., `v0.2.0` → `0.2.0`)
   - Updates `package.json` version
   - Publishes to npm registry
   - Uploads package tarball to the release
   - Comments on related PRs to notify contributors

#### Release Process:

```bash
# 1. Merge PRs to main (with proper labels)
# 2. Release Drafter updates the draft release automatically

# 3. When ready to release, go to GitHub:
#    Releases → Draft Release → Edit → Publish release

# 4. Workflow triggers automatically and publishes to npm
```

#### The workflow will:
1. ✅ Run full test suite to ensure quality
2. ✅ Extract version from the release tag
3. ✅ Update `package.json` with the new version
4. ✅ Build and publish package to npm
5. ✅ Upload npm package tarball to release assets
6. ✅ Comment on related PRs to notify contributors

#### Result:
Users can install and run via npm/npx:
```bash
npx ccmcp list
npm i -g ccmcp && ccmcp list
```

#### Version Management:

The version is controlled by the **release tag** you create in GitHub:
- Tag format: `v1.2.3` (the `v` prefix is automatically stripped)
- Release Drafter suggests the next version based on PR labels
- You can manually edit the version before publishing

**Example:**
- Current version: `v0.1.0`
- Merge PRs with `feature` labels
- Release Drafter suggests: `v0.2.0`
- Edit if needed, then publish
- Workflow automatically publishes `0.2.0` to npm

### 🔧 Workflow Configuration

#### Setting Up PR Labels

For optimal automation, add these labels to your repository:

```bash
# Breaking changes & versions
breaking-change, breaking, major, minor, patch

# Types
feature, enhancement, bug, fix, regression

# Categories
security, vulnerability, performance, optimization
chore, refactor, deps, dependencies
ci, cd, workflow, github-actions
docs, documentation, test, testing

# Size labels (auto-added)
size/XS, size/S, size/M, size/L, size/XL

# Process labels
needs-description, skip-changelog, internal
```

You can create these labels manually or use a tool like [github-label-sync](https://github.com/Financial-Times/github-label-sync).

#### Customizing Release Drafter

Edit [.github/release-drafter.yml](.github/release-drafter.yml) to customize:
- Category titles and labels
- Changelog template
- Version resolution rules
- Auto-labeler patterns

#### Customizing PR Labeler

Edit [.github/labeler.yml](.github/labeler.yml) to add file-based label rules.

### 📊 Workflow Status Badges

Add these badges to your README to show workflow status:

```markdown
![CI](https://github.com/your-username/ccmcp/workflows/CI/badge.svg)
![Release Drafter](https://github.com/your-username/ccmcp/workflows/Release%20Drafter/badge.svg)
```
