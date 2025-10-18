const { describe, it } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const path = require('path');

const CLI_PATH = path.join(__dirname, '..', '..', 'src', 'ccmcp.js');

function runCLI(args, options = {}) {
  const env = { ...process.env, NO_COLOR: '1', ...options.env };
  const cmd = `node "${CLI_PATH}" ${args}`;

  try {
    const result = execSync(cmd, {
      encoding: 'utf8',
      env,
      ...options
    });
    return { stdout: result, stderr: '', exitCode: 0 };
  } catch (error) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.status || 1
    };
  }
}

describe('CLI Integration', () => {
  describe('--help', () => {
    it('should display help text', () => {
      const result = runCLI('--help');
      assert.strictEqual(result.exitCode, 0);
      assert.ok(result.stdout.includes('Usage:'));
    });
  });

  describe('--version', () => {
    it('should display version', () => {
      const result = runCLI('--version');
      assert.strictEqual(result.exitCode, 0);
      assert.ok(result.stdout.includes('claude-mcp-switch'));
    });
  });

  describe('list command', () => {
    it('should execute without errors', () => {
      const result = runCLI('list');
      // Exit code 0 or 4 (if claude CLI not available or no servers)
      assert.ok(result.exitCode === 0 || result.exitCode === 4);
    });

    it('should support JSON output', () => {
      const result = runCLI('list --json');
      // Should exit cleanly regardless of whether servers exist
      assert.ok(result.exitCode === 0 || result.exitCode === 4);

      // If successful, output should be valid JSON
      if (result.exitCode === 0) {
        try {
          JSON.parse(result.stdout);
        } catch {
          assert.fail('Output should be valid JSON');
        }
      }
    });
  });

  describe('error handling', () => {
    it('should error when enable command missing identifier', () => {
      const result = runCLI('enable');
      assert.strictEqual(result.exitCode, 4);
      assert.ok(result.stderr.includes('identifier') || result.stdout.includes('identifier'));
    });

    it('should error when disable command missing identifier', () => {
      const result = runCLI('disable');
      assert.strictEqual(result.exitCode, 4);
      assert.ok(result.stderr.includes('identifier') || result.stdout.includes('identifier'));
    });
  });
});
