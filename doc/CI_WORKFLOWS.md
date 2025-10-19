# CI/CD Workflows

This project includes comprehensive CI/CD automation with multiple GitHub Actions workflows.

## 🔄 CI Workflow ([ci.yml](../.github/workflows/ci.yml))

Runs automatically on every pull request and push to main/master:

- **Multi-platform testing**: Tests on Ubuntu, macOS, and Windows
- **Multi-version Node.js**: Tests with Node 18, 20, and 22
- **Test suite**: Runs unit and integration tests
- **Code quality checks**: Validates package structure and security
- **Package building**: Creates npm package artifact
- **PR comments**: Automatically comments on PRs when checks fail

## 📝 Release Drafter ([release-drafter.yml](../.github/workflows/release-drafter.yml))

Automatically maintains draft releases with changelogs based on merged PRs:

- **Auto-categorization**: Organizes changes by type (features, bugs, maintenance, etc.)
- **Version inference**: Automatically suggests next version based on PR labels
- **Changelog generation**: Creates formatted changelog from PR titles
- **Contributor tracking**: Lists all contributors to the release

### Label Categories:

- 💥 Breaking Changes: `breaking-change`, `breaking`, `major`
- 🚀 Features: `feature`, `enhancement`
- 🐛 Bug Fixes: `bug`, `fix`, `regression`
- 🔒 Security: `security`, `vulnerability`
- ⚡ Performance: `performance`, `optimization`
- 🧰 Maintenance: `chore`, `refactor`, `deps`
- 🤖 CI/CD: `ci`, `cd`, `workflow`, `github-actions`
- 📝 Documentation: `docs`, `documentation`
- 🧪 Testing: `test`, `testing`

## 🏷️ PR Labeler ([pr-labeler.yml](../.github/workflows/pr-labeler.yml))

Automatically labels pull requests based on:

- **File paths**: Labels based on which files are changed (docs, tests, CI, etc.)
- **PR size**: Adds size labels (XS, S, M, L, XL) based on lines changed
- **Conventional commits**: Detects commit types in PR titles (feat, fix, docs, etc.)
- **Description check**: Warns if PR description is missing or too short

Configuration file: [labeler.yml](../.github/labeler.yml)

## 🎉 Publish to npm ([release.yml](../.github/workflows/release.yml))

Automatically publishes to npm when you publish a GitHub release:

- Workflow file: [release.yml](../.github/workflows/release.yml)
- Package entry: [package.json](../package.json)

### Prerequisites:

- Create a repository secret named `NPM_TOKEN` containing an npm access token with publish rights
- Ensure the package name in [package.json](../package.json) is available on npm

### How It Works:

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

### Release Process:

```bash
# 1. Merge PRs to main (with proper labels)
# 2. Release Drafter updates the draft release automatically

# 3. When ready to release, go to GitHub:
#    Releases → Draft Release → Edit → Publish release

# 4. Workflow triggers automatically and publishes to npm
```

### The workflow will:

1. ✅ Run full test suite to ensure quality
2. ✅ Extract version from the release tag
3. ✅ Update `package.json` with the new version
4. ✅ Build and publish package to npm
5. ✅ Upload npm package tarball to release assets
6. ✅ Comment on related PRs to notify contributors

### Result:

Users can install and run via npm/npx:

```bash
npx claude-mcp-switch list
npm i -g claude-mcp-switch && ccmcp list
```

### Version Management:

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

## 🔧 Workflow Configuration

### Setting Up PR Labels

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

### Customizing Release Drafter

Edit [.github/release-drafter.yml](../.github/release-drafter.yml) to customize:

- Category titles and labels
- Changelog template
- Version resolution rules
- Auto-labeler patterns

### Customizing PR Labeler

Edit [.github/labeler.yml](../.github/labeler.yml) to add file-based label rules.

## 📊 Workflow Status Badges

Add these badges to your README to show workflow status:

```markdown
![CI](https://github.com/your-username/claude-mcp-switch/workflows/CI/badge.svg)
![Release Drafter](https://github.com/your-username/claude-mcp-switch/workflows/Release%20Drafter/badge.svg)
```
