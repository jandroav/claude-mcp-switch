const { describe, it } = require('node:test');
const assert = require('node:assert');
const { COLOR } = require('../../src/lib/ui');

describe('ui', () => {
  describe('COLOR', () => {
    it('should apply ANSI codes when enabled', () => {
      COLOR.enabled = true;
      const result = COLOR.red('test');
      assert.ok(result.includes('\x1b['));
      assert.ok(result.includes('test'));
    });

    it('should not apply ANSI codes when disabled', () => {
      COLOR.enabled = false;
      const result = COLOR.red('test');
      assert.strictEqual(result, 'test');
      COLOR.enabled = true; // Reset
    });

    it('should handle bold', () => {
      COLOR.enabled = true;
      const result = COLOR.bold('test');
      assert.ok(result.includes('\x1b[1m'));
    });

    it('should handle dim', () => {
      COLOR.enabled = true;
      const result = COLOR.dim('test');
      assert.ok(result.includes('\x1b[2m'));
    });

    it('should handle various colors', () => {
      COLOR.enabled = true;
      assert.ok(COLOR.red('x').includes('\x1b[31m'));
      assert.ok(COLOR.green('x').includes('\x1b[32m'));
      assert.ok(COLOR.yellow('x').includes('\x1b[33m'));
      assert.ok(COLOR.cyan('x').includes('\x1b[36m'));
    });

    it('should reset color codes', () => {
      COLOR.enabled = true;
      const result = COLOR.red('test');
      assert.ok(result.includes('\x1b[0m'));
    });

    it('should handle empty strings', () => {
      COLOR.enabled = true;
      assert.strictEqual(COLOR.red(''), '\x1b[31m\x1b[0m');
    });

    it('should handle numbers', () => {
      COLOR.enabled = true;
      const result = COLOR.red(123);
      assert.ok(result.includes('123'));
    });

    it('should handle nested color calls when disabled', () => {
      COLOR.enabled = false;
      const result = COLOR.red(COLOR.bold('test'));
      assert.strictEqual(result, 'test');
      COLOR.enabled = true; // Reset
    });
  });
});
