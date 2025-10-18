const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CLI_PATH = path.join(__dirname, '..', '..', 'src', 'ccmcp.js');

function runCLI(args, options = {}) {
  const env = { ...process.env, NO_COLOR: '1', ...options.env };
  const cmd = `node "${CLI_PATH}" ${args}`;

  try {
    const result = execSync(cmd, {
      encoding: 'utf8',
      env,
      cwd: options.cwd || process.cwd(),
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
  let tempDir;
  let configPath;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccmcp-cli-test-'));
    configPath = path.join(tempDir, 'config.json');
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('--help', () => {
    it('should display help text', () => {
      const result = runCLI('--help');
      assert.strictEqual(result.exitCode, 0);
      assert.ok(result.stdout.includes('Usage:'));
      assert.ok(result.stdout.includes('list'));
      assert.ok(result.stdout.includes('enable'));
      assert.ok(result.stdout.includes('disable'));
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
    it('should list servers from object config', () => {
      const config = {
        mcpServers: {
          github: {
            command: 'npx',
            args: ['-y', '@anthropic-ai/mcp-server-github'],
            id: 'github',
            name: 'GitHub MCP'
          }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const result = runCLI(`list --config "${configPath}"`);
      assert.strictEqual(result.exitCode, 0);
      assert.ok(result.stdout.includes('github'));
      assert.ok(result.stdout.includes('GitHub MCP'));
    });

    it('should list servers with JSON output', () => {
      const config = {
        mcpServers: {
          github: {
            command: 'npx',
            id: 'github'
          }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const result = runCLI(`list --config "${configPath}" --json`);
      assert.strictEqual(result.exitCode, 0);

      const output = JSON.parse(result.stdout);
      assert.ok(Array.isArray(output));
      assert.strictEqual(output.length, 1);
      assert.strictEqual(output[0].id, 'github');
    });

    it('should handle empty config', () => {
      const config = { mcpServers: {} };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const result = runCLI(`list --config "${configPath}"`);
      assert.strictEqual(result.exitCode, 0);
      assert.ok(result.stdout.includes('No MCP servers'));
    });
  });

  describe('enable command', () => {
    it('should enable disabled server in object config', () => {
      const config = {
        mcpServers: {},
        mcpServersDisabled: {
          github: {
            command: 'npx',
            id: 'github'
          }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const result = runCLI(`enable github --config "${configPath}"`);
      assert.strictEqual(result.exitCode, 0);
      assert.ok(result.stdout.includes('Enabled'));

      // Verify change
      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      assert.ok(updatedConfig.mcpServers.github);
      assert.strictEqual(updatedConfig.mcpServersDisabled.github, undefined);
    });

    it('should enable server with enabled=false', () => {
      const config = {
        mcpServers: {
          github: {
            command: 'npx',
            id: 'github',
            enabled: false
          }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const result = runCLI(`enable github --config "${configPath}"`);
      assert.strictEqual(result.exitCode, 0);

      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      assert.strictEqual(updatedConfig.mcpServers.github.enabled, true);
    });

    it('should support dry-run mode', () => {
      const config = {
        mcpServers: {},
        mcpServersDisabled: {
          github: { id: 'github' }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const result = runCLI(`enable github --config "${configPath}" --dry-run`);
      assert.strictEqual(result.exitCode, 0);
      assert.ok(result.stdout.includes('Planned changes'));

      // Verify no change
      const unchangedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      assert.strictEqual(unchangedConfig.mcpServers.github, undefined);
    });

    it('should return error for non-existent server', () => {
      const config = { mcpServers: {} };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const result = runCLI(`enable nonexistent --config "${configPath}"`);
      assert.strictEqual(result.exitCode, 2); // EX_NO_MATCH
    });

    it('should create backup file', () => {
      const config = {
        mcpServers: {},
        mcpServersDisabled: {
          github: { id: 'github' }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      runCLI(`enable github --config "${configPath}"`);

      const backupFiles = fs.readdirSync(tempDir).filter(f => f.includes('.bak.'));
      assert.strictEqual(backupFiles.length, 1);
    });
  });

  describe('disable command', () => {
    it('should disable enabled server in object config', () => {
      const config = {
        mcpServers: {
          github: {
            command: 'npx',
            id: 'github'
          }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const result = runCLI(`disable github --config "${configPath}"`);
      assert.strictEqual(result.exitCode, 0);
      assert.ok(result.stdout.includes('Disabled'));

      // Verify change
      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      assert.strictEqual(updatedConfig.mcpServers.github, undefined);
      assert.ok(updatedConfig.mcpServersDisabled.github);
    });

    it('should disable server with enabled=true', () => {
      const config = {
        mcpServers: {
          github: {
            command: 'npx',
            id: 'github',
            enabled: true
          }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const result = runCLI(`disable github --config "${configPath}"`);
      assert.strictEqual(result.exitCode, 0);

      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      assert.strictEqual(updatedConfig.mcpServers.github.enabled, false);
      // Should NOT move when enabled property exists
      assert.ok(updatedConfig.mcpServers.github);
    });

    it('should support dry-run mode', () => {
      const config = {
        mcpServers: {
          github: { id: 'github' }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const result = runCLI(`disable github --config "${configPath}" --dry-run`);
      assert.strictEqual(result.exitCode, 0);
      assert.ok(result.stdout.includes('Planned changes'));

      // Verify no change
      const unchangedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      assert.ok(unchangedConfig.mcpServers.github);
    });

    it('should return error for array config without enabled field', () => {
      const config = {
        mcpServers: [
          { id: 'github', command: 'npx' }
        ]
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const result = runCLI(`disable github --config "${configPath}"`);
      assert.strictEqual(result.exitCode, 5); // EX_JSON
      assert.ok(result.stderr.includes('unsupported') || result.stdout.includes('unsupported'));
    });
  });

  describe('identifier matching', () => {
    beforeEach(() => {
      const config = {
        mcpServers: {
          'github-key': {
            id: 'github-id',
            name: 'GitHub MCP Server'
          },
          'slack-key': {
            id: 'slack-id',
            name: 'Slack Integration'
          }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    });

    it('should match by id', () => {
      const result = runCLI(`disable github-id --config "${configPath}"`);
      assert.strictEqual(result.exitCode, 0);
    });

    it('should match by key', () => {
      const result = runCLI(`disable slack-key --config "${configPath}"`);
      assert.strictEqual(result.exitCode, 0);
    });

    it('should match by name', () => {
      const result = runCLI(`disable "GitHub MCP Server" --config "${configPath}"`);
      assert.strictEqual(result.exitCode, 0);
    });

    it('should be case-insensitive', () => {
      const result = runCLI(`disable GITHUB-ID --config "${configPath}"`);
      assert.strictEqual(result.exitCode, 0);
    });

    it('should provide suggestions for typos', () => {
      const result = runCLI(`enable githubbb --config "${configPath}"`);
      assert.strictEqual(result.exitCode, 2); // EX_NO_MATCH
      assert.ok(result.stdout.includes('Suggestions') || result.stdout.includes('github'));
    });
  });

  describe('error handling', () => {
    it('should error on missing config file', () => {
      const result = runCLI(`list --config "${path.join(tempDir, 'nonexistent.json')}"`);
      assert.notStrictEqual(result.exitCode, 0);
    });

    it('should error on invalid JSON', () => {
      fs.writeFileSync(configPath, '{ invalid json }');

      const result = runCLI(`list --config "${configPath}"`);
      assert.strictEqual(result.exitCode, 5); // EX_JSON
    });

    it('should error when enable command missing identifier', () => {
      fs.writeFileSync(configPath, '{"mcpServers":{}}');

      const result = runCLI(`enable --config "${configPath}"`);
      assert.notStrictEqual(result.exitCode, 0);
    });

    it('should error when disable command missing identifier', () => {
      fs.writeFileSync(configPath, '{"mcpServers":{}}');

      const result = runCLI(`disable --config "${configPath}"`);
      assert.notStrictEqual(result.exitCode, 0);
    });
  });

  describe('JSON output mode', () => {
    beforeEach(() => {
      const config = {
        mcpServers: {
          github: { id: 'github', command: 'npx' }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    });

    it('should output JSON for enable command', () => {
      const result = runCLI(`enable github --config "${configPath}" --dry-run --json`);
      assert.strictEqual(result.exitCode, 0);

      const output = JSON.parse(result.stdout);
      assert.strictEqual(output.action, 'enable');
      assert.strictEqual(output.ok, true);
      assert.strictEqual(output.dryRun, true);
    });

    it('should output JSON for disable command', () => {
      const result = runCLI(`disable github --config "${configPath}" --dry-run --json`);
      assert.strictEqual(result.exitCode, 0);

      const output = JSON.parse(result.stdout);
      assert.strictEqual(output.action, 'disable');
      assert.strictEqual(output.ok, true);
    });

    it('should output JSON for errors', () => {
      const result = runCLI(`enable nonexistent --config "${configPath}" --json`);
      assert.strictEqual(result.exitCode, 2);

      const output = JSON.parse(result.stdout);
      assert.strictEqual(output.ok, false);
      assert.ok(output.suggestions);
    });
  });
});
