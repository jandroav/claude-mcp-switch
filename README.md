# claude-mcp-switch - Claude Code MCP switcher

A zero-dependency npx CLI to list, enable, and disable Claude Code MCP servers.
Uses the `claude` CLI under the hood to ensure compatibility with your actual running configuration.

## ✨ Features
- List active and disabled MCP servers (powered by `claude mcp list`)
- Enable/disable servers by name
- Preserves server configuration when disabling for easy re-enabling
- JSON output and dry-run mode
- Works with all transport types: stdio, SSE, HTTP
- Attractive UI: ASCII banner, colorized output, and box-drawn tables
- Color control: auto-detect TTY, disable with --no-color or NO_COLOR=1; always off in --json

## 📋 Requirements
- Node.js >= 18
- Claude Code CLI installed and configured (`claude` command available)
- At least one MCP server configured in Claude Code

## 🚀 Install / Use
- **One-off via npx** (after publish):
  - npx claude-mcp-switch list
  - npx claude-mcp-switch enable github
  - npx claude-mcp-switch disable my-mcp-id --dry-run
- **Global install via npm**:
  1. Install globally: `npm install -g claude-mcp-switch`
  2. Use the tool: `ccmcp list`
  3. Enable MCP: `ccmcp enable github`
  4. Disable MCP: `ccmcp disable github`
- **Local npx usage** (no installation required):
  1. List servers: `npx claude-mcp-switch list`
  2. Enable server: `npx claude-mcp-switch enable github`
  3. Disable server: `npx claude-mcp-switch disable github --dry-run`
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
- list [--json] [--no-color]
  - Prints a colorized, boxed table with STATUS, NAME, TRANSPORT, COMMAND/URL
  - Shows both active (from `claude mcp list`) and disabled servers (from local storage)
- enable <name> [--dry-run] [--json] [--no-color]
  - Re-enables a previously disabled server by restoring its configuration
- disable <name> [--dry-run] [--json] [--no-color]
  - Disables a server by removing it via `claude mcp remove` and storing its config for later re-enabling
- --help, --version

## 🎯 How it works
- **List**: Executes `claude mcp list` to get active servers, merges with locally stored disabled servers
- **Disable**:
  1. Fetches server details via `claude mcp get <name>`
  2. Stores configuration in `~/.claude-mcp-switch/disabled-servers.json`
  3. Removes server via `claude mcp remove <name>`
- **Enable**:
  1. Retrieves stored configuration from local storage
  2. Re-adds server via `claude mcp add` with original settings
  3. Removes from disabled storage

## 🔍 Configuration
No configuration file discovery needed! The tool uses the `claude` CLI which automatically uses your active Claude Code configuration. This ensures the tool always works with your actual running MCP servers.

## 🚪 Exit codes
- 0: success
- 2: server not found
- 4: error executing claude CLI command

## 📝 Examples
- List all servers:
  ```bash
  npx claude-mcp-switch list
  ```
- Disable a server:
  ```bash
  npx claude-mcp-switch disable playwright
  ```
- Enable a previously disabled server:
  ```bash
  npx claude-mcp-switch enable playwright
  ```
- Dry-run mode:
  ```bash
  npx claude-mcp-switch disable playwright --dry-run
  ```
- JSON output:
  ```bash
  npx claude-mcp-switch list --json
  ```

## 📊 JSON output
- **List**: Outputs array of server objects with status, name, transport, commandOrUrl
- **Enable/Disable**: Outputs { ok, action, identifier, error? }

## 🔧 Troubleshooting
- **"claude: command not found"**: Ensure Claude Code CLI is installed and in your PATH
- **Server not found**: Use `claude mcp list` to see available servers, or `npx claude-mcp-switch list` to see both active and disabled servers
- **Permission errors**: Ensure you have write access to `~/.claude-mcp-switch/` directory

## 📚 Reference
- Claude Code MCP: https://docs.claude.com/en/docs/claude-code/mcp
- Claude CLI documentation: https://docs.claude.com/en/docs/claude-code/cli

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
npx claude-mcp-switch list
npm i -g claude-mcp-switch && ccmcp list
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
![CI](https://github.com/your-username/claude-mcp-switch/workflows/CI/badge.svg)
![Release Drafter](https://github.com/your-username/claude-mcp-switch/workflows/Release%20Drafter/badge.svg)
```
