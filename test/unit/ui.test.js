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
      assert.ok(COLOR.red('test').includes('\x1b[31m'));
      assert.ok(COLOR.green('test').includes('\x1b[32m'));
      assert.ok(COLOR.yellow('test').includes('\x1b[33m'));
      assert.ok(COLOR.blue('test').includes('\x1b[34m'));
      assert.ok(COLOR.magenta('test').includes('\x1b[35m'));
      assert.ok(COLOR.cyan('test').includes('\x1b[36m'));
      assert.ok(COLOR.gray('test').includes('\x1b[90m'));
    });

    it('should reset color codes', () => {
      COLOR.enabled = true;
      const result = COLOR.red('test');
      assert.ok(result.includes('\x1b[0m'));
    });

    it('should handle empty strings', () => {
      COLOR.enabled = true;
      const result = COLOR.red('');
      assert.ok(typeof result === 'string');
    });

    it('should handle numbers', () => {
      COLOR.enabled = true;
      const result = COLOR.red(123);
      assert.ok(result.includes('123'));
    });

    it('should handle nested color calls when disabled', () => {
      COLOR.enabled = false;
      const result = COLOR.bold(COLOR.red('test'));
      assert.strictEqual(result, 'test');
    });
  });

  // Note: Testing println, eprintln, printBanner, printList, printSuggestionsTable, and help
  // would require mocking stdout/stderr or capturing output, which is complex.
  // These are better tested via integration tests.
});
