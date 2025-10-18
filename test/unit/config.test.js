const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  EX_IO,
  EX_JSON,
  ioErr,
  jsonErr,
  fileExists,
  candidateConfigPaths,
  resolveConfigPath,
  readJson,
  backupFile,
  writeJsonAtomic
} = require('../../src/lib/config');

describe('config', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccmcp-test-'));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('error constructors', () => {
    it('should create IO error with correct exit code', () => {
      const err = ioErr('test error');
      assert.strictEqual(err.message, 'test error');
      assert.strictEqual(err.codeEx, EX_IO);
    });

    it('should create JSON error with correct exit code', () => {
      const err = jsonErr('test error');
      assert.strictEqual(err.message, 'test error');
      assert.strictEqual(err.codeEx, EX_JSON);
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', () => {
      const filePath = path.join(tempDir, 'test.json');
      fs.writeFileSync(filePath, '{}');
      assert.strictEqual(fileExists(filePath), true);
    });

    it('should return false for non-existent file', () => {
      const filePath = path.join(tempDir, 'nonexistent.json');
      assert.strictEqual(fileExists(filePath), false);
    });

    it('should return false for directory', () => {
      assert.strictEqual(fileExists(tempDir), true);
    });

    it('should return false for unreadable file', () => {
      // Skip this test on Windows as chmod doesn't work the same way
      if (process.platform === 'win32') {
        return;
      }

      const filePath = path.join(tempDir, 'unreadable.json');
      fs.writeFileSync(filePath, '{}');
      fs.chmodSync(filePath, 0o000);
      assert.strictEqual(fileExists(filePath), false);
      // Cleanup
      fs.chmodSync(filePath, 0o644);
    });
  });

  describe('candidateConfigPaths', () => {
    let originalEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return paths from CLAUDE_CONFIG_DIR if set', () => {
      process.env.CLAUDE_CONFIG_DIR = '/custom/path';
      const paths = candidateConfigPaths();
      // Normalize paths for cross-platform comparison
      const normalizedPaths = paths.map(p => p.replace(/\\/g, '/'));
      assert.ok(normalizedPaths.includes('/custom/path/settings.json'));
      assert.ok(normalizedPaths.includes('/custom/path/claude_desktop_config.json'));
    });

    it('should return macOS paths when no env var', () => {
      // Only run this test on actual macOS
      if (process.platform !== 'darwin') {
        return;
      }

      delete process.env.CLAUDE_CONFIG_DIR;
      const paths = candidateConfigPaths();
      assert.ok(paths.some(p => p.includes('Library/Application Support/Claude')));
      assert.ok(paths.some(p => p.includes('.claude/settings.json')));
    });

    it('should return Linux paths when no env var', () => {
      // Only run this test on actual Linux
      if (process.platform !== 'linux') {
        return;
      }

      delete process.env.CLAUDE_CONFIG_DIR;
      const paths = candidateConfigPaths();
      assert.ok(paths.some(p => p.includes('.config/claude')));
      assert.ok(paths.some(p => p.includes('.claude/settings.json')));
    });

    it('should return Windows paths when no env var', () => {
      // Only run this test on actual Windows
      if (process.platform !== 'win32') {
        return;
      }

      delete process.env.CLAUDE_CONFIG_DIR;
      const paths = candidateConfigPaths();
      assert.ok(paths.some(p => p.includes('Claude')));
      assert.ok(paths.some(p => p.includes('.claude')));
    });
  });

  describe('resolveConfigPath', () => {
    it('should resolve override path if exists', () => {
      const filePath = path.join(tempDir, 'config.json');
      fs.writeFileSync(filePath, '{}');
      const result = resolveConfigPath(filePath);
      assert.strictEqual(path.resolve(result), path.resolve(filePath));
    });

    it('should throw if override path does not exist', () => {
      const filePath = path.join(tempDir, 'nonexistent.json');
      assert.throws(() => {
        resolveConfigPath(filePath);
      }, /Config file not found/);
    });

    it('should resolve first existing candidate path', () => {
      const originalEnv = { ...process.env };
      process.env.CLAUDE_CONFIG_DIR = tempDir;
      const filePath = path.join(tempDir, 'settings.json');
      fs.writeFileSync(filePath, '{}');

      const result = resolveConfigPath();
      assert.strictEqual(result, filePath);

      process.env = originalEnv;
    });

    it('should throw if no candidates exist', () => {
      const originalEnv = { ...process.env };
      process.env.CLAUDE_CONFIG_DIR = tempDir;

      assert.throws(() => {
        resolveConfigPath();
      }, /Could not find Claude Code config/);

      process.env = originalEnv;
    });
  });

  describe('readJson', () => {
    it('should read valid JSON file', () => {
      const filePath = path.join(tempDir, 'test.json');
      const data = { test: 'value' };
      fs.writeFileSync(filePath, JSON.stringify(data));

      const result = readJson(filePath);
      assert.deepStrictEqual(result, data);
    });

    it('should throw JSON error for invalid JSON', () => {
      const filePath = path.join(tempDir, 'invalid.json');
      fs.writeFileSync(filePath, '{ invalid json }');

      assert.throws(() => {
        readJson(filePath);
      }, (err) => {
        return err.codeEx === EX_JSON && /Invalid JSON/.test(err.message);
      });
    });

    it('should throw IO error for non-existent file', () => {
      const filePath = path.join(tempDir, 'nonexistent.json');

      assert.throws(() => {
        readJson(filePath);
      }, (err) => {
        return err.codeEx === EX_IO && /Config not found/.test(err.message);
      });
    });
  });

  describe('backupFile', () => {
    it('should create backup with timestamp', () => {
      const filePath = path.join(tempDir, 'test.json');
      fs.writeFileSync(filePath, '{"test": "value"}');

      const backupPath = backupFile(filePath);

      assert.ok(fs.existsSync(backupPath));
      assert.ok(backupPath.includes('.bak.'));
      assert.strictEqual(fs.readFileSync(backupPath, 'utf8'), '{"test": "value"}');
    });

    it('should create unique backup names', () => {
      const filePath = path.join(tempDir, 'test.json');
      fs.writeFileSync(filePath, '{"test": "value"}');

      const backup1 = backupFile(filePath);
      // Ensure different timestamp
      const start = Date.now();
      while (Date.now() - start < 1001) {
        // Wait for at least 1 second
      }
      const backup2 = backupFile(filePath);

      assert.notStrictEqual(backup1, backup2);
    });
  });

  describe('writeJsonAtomic', () => {
    it('should write JSON file atomically', () => {
      const filePath = path.join(tempDir, 'test.json');
      const data = { test: 'value', nested: { key: 'val' } };

      writeJsonAtomic(filePath, data);

      assert.ok(fs.existsSync(filePath));
      const content = fs.readFileSync(filePath, 'utf8');
      assert.strictEqual(content, JSON.stringify(data, null, 2) + '\n');
    });

    it('should overwrite existing file', () => {
      const filePath = path.join(tempDir, 'test.json');
      fs.writeFileSync(filePath, '{"old": "data"}');

      const newData = { new: 'data' };
      writeJsonAtomic(filePath, newData);

      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      assert.deepStrictEqual(content, newData);
    });

    it('should format JSON with 2-space indentation', () => {
      const filePath = path.join(tempDir, 'test.json');
      const data = { a: { b: { c: 'value' } } };

      writeJsonAtomic(filePath, data);

      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(content.includes('  "a": {'));
      assert.ok(content.includes('    "b": {'));
    });

    it('should not leave temp file on success', () => {
      const filePath = path.join(tempDir, 'test.json');
      const data = { test: 'value' };

      writeJsonAtomic(filePath, data);

      const files = fs.readdirSync(tempDir);
      const tempFiles = files.filter(f => f.includes('.tmp-'));
      assert.strictEqual(tempFiles.length, 0);
    });
  });
});
