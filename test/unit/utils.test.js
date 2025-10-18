const { describe, it } = require('node:test');
const assert = require('node:assert');
const os = require('os');
const path = require('path');
const { expandHome, truncate, safeStr, nowStamp, detectPlatform } = require('../../src/lib/utils');

describe('utils', () => {
  describe('expandHome', () => {
    it('should expand ~ to home directory', () => {
      const result = expandHome('~/.claude/settings.json');
      assert.strictEqual(result, path.join(os.homedir(), '.claude', 'settings.json'));
    });

    it('should return path as-is if no ~', () => {
      const result = expandHome('/absolute/path');
      assert.strictEqual(result, '/absolute/path');
    });

    it('should handle null and undefined', () => {
      assert.strictEqual(expandHome(null), null);
      assert.strictEqual(expandHome(undefined), undefined);
    });

    it('should handle empty string', () => {
      assert.strictEqual(expandHome(''), '');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      const long = 'a'.repeat(100);
      const result = truncate(long, 50);
      assert.strictEqual(result.length, 50);
      assert.ok(result.endsWith('…'));
    });

    it('should not truncate short strings', () => {
      const short = 'hello';
      const result = truncate(short, 50);
      assert.strictEqual(result, 'hello');
    });

    it('should handle empty string', () => {
      assert.strictEqual(truncate('', 10), '');
    });

    it('should handle null and undefined', () => {
      assert.strictEqual(truncate(null, 10), null);
      assert.strictEqual(truncate(undefined, 10), undefined);
    });

    it('should truncate string exactly at limit', () => {
      const str = 'hello world';
      const result = truncate(str, 5);
      assert.strictEqual(result, 'hell…');
      assert.strictEqual(result.length, 5);
    });
  });

  describe('safeStr', () => {
    it('should convert numbers to strings', () => {
      assert.strictEqual(safeStr(123), '123');
    });

    it('should return empty string for null', () => {
      assert.strictEqual(safeStr(null), '');
    });

    it('should return empty string for undefined', () => {
      assert.strictEqual(safeStr(undefined), '');
    });

    it('should handle booleans', () => {
      assert.strictEqual(safeStr(true), 'true');
      assert.strictEqual(safeStr(false), 'false');
    });

    it('should handle objects', () => {
      assert.strictEqual(safeStr({}), '[object Object]');
    });

    it('should handle arrays', () => {
      assert.strictEqual(safeStr([1, 2, 3]), '1,2,3');
    });
  });

  describe('nowStamp', () => {
    it('should return timestamp in correct format', () => {
      const result = nowStamp();
      // Format: YYYYMMDD-HHMMSS
      assert.match(result, /^\d{8}-\d{6}$/);
    });

    it('should return different timestamps for consecutive calls', (t) => {
      const stamp1 = nowStamp();
      // Small delay to ensure different timestamp
      const start = Date.now();
      while (Date.now() - start < 1001) {
        // Wait for at least 1 second
      }
      const stamp2 = nowStamp();
      assert.notStrictEqual(stamp1, stamp2);
    });

    it('should pad single digit months and days', () => {
      // This test verifies the format, actual padding tested implicitly
      const result = nowStamp();
      const parts = result.split('-');
      assert.strictEqual(parts.length, 2);
      assert.strictEqual(parts[0].length, 8); // YYYYMMDD
      assert.strictEqual(parts[1].length, 6); // HHMMSS
    });
  });

  describe('detectPlatform', () => {
    it('should detect darwin as mac', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        configurable: true
      });
      assert.strictEqual(detectPlatform(), 'mac');
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true
      });
    });

    it('should detect linux', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true
      });
      assert.strictEqual(detectPlatform(), 'linux');
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true
      });
    });

    it('should detect win32 as win', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true
      });
      assert.strictEqual(detectPlatform(), 'win');
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true
      });
    });

    it('should return other for unknown platforms', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'freebsd',
        configurable: true
      });
      assert.strictEqual(detectPlatform(), 'other');
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true
      });
    });
  });
});
