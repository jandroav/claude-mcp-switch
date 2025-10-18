# GitHub Workflows Documentation

This document provides detailed information about the GitHub Actions workflows configured for this project.

## Overview

The project now includes four automated workflows that handle continuous integration, release management, and pull request automation:

1. **CI Workflow** - Automated testing and quality checks
2. **Release Drafter** - Automated changelog and draft releases
3. **PR Labeler** - Automatic pull request labeling
4. **Release & Publish** - Versioning and npm publishing

## Workflow Details

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**
- Every pull request (opened, synchronized, reopened)
- Every push to `main`/`master` branch

**Jobs:**

#### Test Job
- **Strategy**: Matrix testing across multiple environments
  - Operating Systems: Ubuntu, macOS, Windows
  - Node.js Versions: 18, 20, 22
- **Steps**:
  1. Checkout code
  2. Setup Node.js
  3. Install dependencies
  4. Run unit tests
  5. Run integration tests
  6. Run full test suite

#### Lint Job
- **Steps**:
  1. Security vulnerability check with `npm audit`
  2. Verify required package files exist
  3. Code quality validation

#### Build Job
- **Dependencies**: Requires test and lint jobs to pass
- **Steps**:
  1. Test CLI execution
  2. Pack npm package
  3. Upload package artifact (retained for 7 days)

#### Summary Job
- **Dependencies**: Runs after all other jobs
- **Steps**:
  1. Check overall CI status
  2. Post PR comment on failure with detailed status

**Why This Helps:**
- Catches bugs before merging
- Ensures cross-platform compatibility
- Validates package integrity
- Provides immediate feedback to contributors

---

### 2. Release Drafter (`.github/workflows/release-drafter.yml`)

**Triggers:**
- Push to `main`/`master` branch
- Pull request events (opened, edited, synchronized, closed, labeled)

**Configuration:** `.github/release-drafter.yml`

**Features:**

#### Automatic Categorization
Organizes changes into sections based on PR labels:

```yaml
💥 Breaking Changes → breaking-change, breaking, major
🚀 Features → feature, enhancement
🐛 Bug Fixes → bug, fix, regression
🔒 Security → security, vulnerability
⚡ Performance → performance, optimization
🧰 Maintenance → chore, refactor, deps, dependencies
🤖 CI/CD → ci, cd, workflow, github-actions
📝 Documentation → docs, documentation
🧪 Testing → test, testing
```

#### Version Resolution
Automatically suggests next version based on labels:
- **Major**: `breaking-change`, `breaking`, `major`
- **Minor**: `feature`, `enhancement`, `minor`
- **Patch**: `bug`, `fix`, `chore`, `deps`, `docs` (default)

#### Auto-labeler
Automatically adds labels to PRs based on:
- **Title patterns**: Detects conventional commit types (feat:, fix:, docs:, etc.)
- **Changed files**: Labels based on file paths (markdown = docs, test files = test, etc.)
- **Branch names**: Detects dependabot/renovate branches

**Why This Helps:**
- Maintains organized changelog automatically
- Reduces manual work for maintainers
- Provides clear release notes for users
- Enables semantic versioning automation

---

### 3. PR Labeler (`.github/workflows/pr-labeler.yml`)

**Triggers:**
- Pull request events (opened, edited, synchronized, reopened)

**Configuration:** `.github/labeler.yml`

**Features:**

#### File-Based Labeling
Automatically adds labels based on changed files:
- `docs` → Changes to `*.md`, `docs/**/*`
- `deps` → Changes to `package.json`, `package-lock.json`
- `test` → Changes to `test/**/*`, `*.test.js`
- `ci` → Changes to `.github/workflows/**/*`
- `core` → Changes to `src/**/*.js`
- `cli` → Changes to `src/ccmcp.js`, `src/lib/**/*`
- `config` → Changes to config files

#### Size Labeling
Automatically categorizes PRs by size:
- `size/XS` → < 10 lines changed
- `size/S` → 10-49 lines changed
- `size/M` → 50-199 lines changed
- `size/L` → 200-499 lines changed
- `size/XL` → 500+ lines changed

#### Conventional Commit Detection
Detects commit types in PR titles:
- `feat:`, `feature:` → `enhancement`
- `fix:` → `bug`
- `docs:` → `docs`
- `chore:`, `refactor:` → `chore`
- `test:` → `test`
- `perf:` → `performance`
- `ci:`, `build:` → `ci`
- `breaking` or `!:` → `breaking-change`

#### Description Check
Warns if PR description is missing or too short (<20 characters):
- Posts helpful comment with guidelines
- Adds `needs-description` label

**Why This Helps:**
- Reduces manual labeling effort
- Ensures consistent PR organization
- Makes PR review easier
- Improves searchability of PRs

---

### 4. Publish to npm (`.github/workflows/release.yml`)

**Triggers:**
- Automatically when a GitHub release is published
- Trigger event: `release.published`

**Required Secret:**
- `NPM_TOKEN` - npm access token with publish rights

**Workflow Steps:**

1. **Setup**
   - Checkout code from `main` branch with full history
   - Setup Node.js 18 with npm registry
   - Configure Git user for commits
   - Install dependencies

2. **Quality Checks**
   - Run full test suite (blocks publish if tests fail)

3. **Version Management**
   - Extract version from release tag (e.g., `v0.2.0` → `0.2.0`)
   - Update `package.json` with the extracted version
   - Commit and push version update to `main`

4. **Publishing**
   - Build npm package (`npm pack`)
   - Publish to npm registry with public access

5. **Release Enhancement**
   - Find previous release for comparison
   - Upload npm package tarball to GitHub release assets

6. **Post-Release Communication**
   - Compare commits between current and previous release
   - Extract PR numbers from commit messages
   - Comment on all PRs included in the release
   - Notify contributors their changes are live with npm install instructions

**Why This Helps:**
- **Fully automated** - No manual workflow triggers needed
- **Release Drafter integration** - Works seamlessly with draft releases
- **Quality assurance** - Tests must pass before publishing
- **Version control** - Version is managed through GitHub release tags
- **Contributor engagement** - Automatically notifies all contributors
- **Complete artifacts** - Both npm registry and GitHub release assets

**How It Works:**

```
Merge PR → Release Drafter updates draft
            ↓
Edit draft release (optional)
            ↓
Publish release in GitHub UI
            ↓
Workflow automatically triggers
            ↓
Tests → Version update → npm publish → PR notifications
```

**Benefits Over Manual Workflow:**
- No need to remember workflow triggers
- Version is explicitly set by release tag (no confusion)
- Can't accidentally publish without creating a release
- Draft releases allow review before publishing
- Single source of truth for versions (release tag)

---

## Setting Up

### 1. Configure NPM Token

Create an npm access token and add it to repository secrets:

1. Go to npmjs.com → Account → Access Tokens
2. Generate new token with "Automation" type
3. Go to GitHub repository → Settings → Secrets and variables → Actions
4. Create new secret named `NPM_TOKEN` with the token value

### 2. Create Labels

Run this script to create all required labels:

```bash
# Create labels using gh CLI
gh label create "breaking-change" --color "d93f0b" --description "Breaking changes"
gh label create "feature" --color "0e8a16" --description "New feature"
gh label create "enhancement" --color "84b6eb" --description "Enhancement"
gh label create "bug" --color "d73a4a" --description "Bug fix"
gh label create "fix" --color "d73a4a" --description "Bug fix"
gh label create "regression" --color "e99695" --description "Regression"
gh label create "security" --color "ee0701" --description "Security issue"
gh label create "vulnerability" --color "ee0701" --description "Vulnerability"
gh label create "performance" --color "fbca04" --description "Performance improvement"
gh label create "optimization" --color "fbca04" --description "Optimization"
gh label create "chore" --color "fef2c0" --description "Maintenance"
gh label create "refactor" --color "fef2c0" --description "Refactoring"
gh label create "deps" --color "0366d6" --description "Dependencies"
gh label create "dependencies" --color "0366d6" --description "Dependencies"
gh label create "ci" --color "000000" --description "CI/CD"
gh label create "cd" --color "000000" --description "CI/CD"
gh label create "workflow" --color "000000" --description "GitHub Actions"
gh label create "github-actions" --color "000000" --description "GitHub Actions"
gh label create "docs" --color "0075ca" --description "Documentation"
gh label create "documentation" --color "0075ca" --description "Documentation"
gh label create "test" --color "d4c5f9" --description "Testing"
gh label create "testing" --color "d4c5f9" --description "Testing"
gh label create "size/XS" --color "c2e0c6" --description "< 10 lines changed"
gh label create "size/S" --color "c2e0c6" --description "10-49 lines changed"
gh label create "size/M" --color "fef2c0" --description "50-199 lines changed"
gh label create "size/L" --color "ff9800" --description "200-499 lines changed"
gh label create "size/XL" --color "d73a4a" --description "500+ lines changed"
gh label create "needs-description" --color "ededed" --description "Missing PR description"
gh label create "skip-changelog" --color "ededed" --description "Skip in changelog"
gh label create "internal" --color "ededed" --description "Internal change"
```

### 3. Test Workflows

#### Test CI Workflow
1. Create a test branch
2. Make a small change
3. Open a pull request
4. Verify CI runs and labels are applied

#### Test Release Drafter
1. Merge a few PRs with different labels
2. Check Actions → Release Drafter
3. View draft release and verify changelog

#### Test Release Workflow
1. Create a test branch and make a change
2. Open and merge a PR with proper labels
3. Check that Release Drafter updated the draft release
4. **To test publish workflow without actually publishing:**
   - Create a pre-release with a test tag (e.g., `v0.0.1-test`)
   - Verify workflow runs but consider adding `skip_npm` logic if needed
5. **For actual releases:**
   - Review the draft release
   - Edit version tag if needed (e.g., `v0.2.0`)
   - Click "Publish release"
   - Verify workflow runs and publishes to npm

---

## Best Practices

### For Contributors

1. **Use Conventional Commits** in PR titles:
   - `feat: add new feature`
   - `fix: resolve bug in config loader`
   - `docs: update README`
   - `chore: update dependencies`

2. **Add Descriptive PR Descriptions**:
   - Explain what changed
   - Explain why it changed
   - Link related issues

3. **Label Your PRs**:
   - Add appropriate type labels (feature, bug, docs, etc.)
   - Add category labels if needed (security, performance, etc.)
   - For breaking changes, add `breaking-change` label

### For Maintainers

1. **Review Draft Releases**:
   - Check Actions → Release Drafter regularly
   - Review draft release notes
   - Edit if needed before publishing

2. **Use Semantic Versioning**:
   - `patch` → Bug fixes, docs, chores (0.0.X)
   - `minor` → New features, enhancements (0.X.0)
   - `major` → Breaking changes (X.0.0)

3. **Test Before Release**:
   - CI automatically runs tests
   - Release workflow also runs tests
   - Use `skip_npm` for dry-run testing

4. **Monitor Workflow Runs**:
   - Check Actions tab regularly
   - Investigate failures promptly
   - Keep workflows up to date

---

## Troubleshooting

### CI Failures

**Problem**: Tests fail on Windows but pass locally
**Solution**: Check path separators and line endings (CRLF vs LF)

**Problem**: Tests fail on Node 22 but pass on Node 18
**Solution**: Check for deprecated APIs or new breaking changes

### Release Drafter Issues

**Problem**: PRs not appearing in draft release
**Solution**: Ensure PRs are merged (not closed) and have proper labels

**Problem**: Version not incrementing correctly
**Solution**: Check label-based version resolution rules in config

### PR Labeler Issues

**Problem**: Labels not applied automatically
**Solution**: Verify `.github/labeler.yml` patterns match your file structure

**Problem**: Size labels incorrect
**Solution**: GitHub API sometimes has delays; labels update on next PR event

### Release Workflow Issues

**Problem**: npm publish fails
**Solution**: Verify `NPM_TOKEN` secret is set and has publish permissions

**Problem**: Can't find previous version for comparison
**Solution**: Ensure git tags exist for previous releases

---

## Maintenance

### Updating Workflows

1. **Update Actions Versions**:
   - Check for new versions of GitHub Actions periodically
   - Update `@v4` to `@v5` etc. when available
   - Test thoroughly after updates

2. **Add New Categories**:
   - Edit `.github/release-drafter.yml`
   - Add new category with title and labels
   - Update documentation

3. **Modify Label Rules**:
   - Edit `.github/labeler.yml` for file-based rules
   - Edit `.github/release-drafter.yml` autolabeler section for title/branch patterns

### Security Considerations

1. **Protect Secrets**:
   - Never commit `NPM_TOKEN` or other secrets
   - Use GitHub secrets for sensitive data
   - Rotate tokens periodically

2. **Limit Permissions**:
   - Each workflow uses minimal required permissions
   - Review permissions before adding new actions

3. **Audit Dependencies**:
   - CI runs `npm audit` automatically
   - Review audit output regularly
   - Update dependencies promptly

---

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Release Drafter](https://github.com/release-drafter/release-drafter)
- [Actions Labeler](https://github.com/actions/labeler)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
