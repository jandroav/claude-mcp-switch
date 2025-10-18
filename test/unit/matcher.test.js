const { describe, it } = require('node:test');
const assert = require('node:assert');
const { levenshtein, nearestSuggestions, matchIdentifier, serializeSuggestions } = require('../../src/lib/matcher');

describe('matcher', () => {
  describe('levenshtein', () => {
    it('should return 0 for identical strings', () => {
      assert.strictEqual(levenshtein('hello', 'hello'), 0);
    });

    it('should return string length for completely different strings', () => {
      assert.strictEqual(levenshtein('', 'hello'), 5);
      assert.strictEqual(levenshtein('hello', ''), 5);
    });

    it('should calculate distance for single character difference', () => {
      assert.strictEqual(levenshtein('hello', 'hallo'), 1);
    });

    it('should calculate distance for multiple differences', () => {
      assert.strictEqual(levenshtein('kitten', 'sitting'), 3);
    });

    it('should handle case sensitivity', () => {
      assert.strictEqual(levenshtein('Hello', 'hello'), 1);
    });

    it('should calculate distance for longer strings', () => {
      assert.strictEqual(levenshtein('saturday', 'sunday'), 3);
    });
  });

  describe('matchIdentifier', () => {
    const sampleList = [
      { id: 'github', key: 'github', name: 'GitHub MCP', status: 'enabled', container: 'active' },
      { id: 'slack-mcp', key: 'slack', name: 'Slack Integration', status: 'enabled', container: 'active' },
      { id: 'gitlab', key: 'gitlab', name: 'GitLab MCP', status: 'disabled', container: 'disabled' }
    ];

    describe('exact matches', () => {
      it('should match by id with exact case', () => {
        const result = matchIdentifier(sampleList, 'github');
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.item.id, 'github');
      });

      it('should match by id case-insensitively', () => {
        const result = matchIdentifier(sampleList, 'GITHUB');
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.item.id, 'github');
      });

      it('should match by key', () => {
        const result = matchIdentifier(sampleList, 'slack');
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.item.key, 'slack');
      });

      it('should match by name', () => {
        const result = matchIdentifier(sampleList, 'GitHub MCP');
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.item.name, 'GitHub MCP');
      });

      it('should match by name case-insensitively', () => {
        const result = matchIdentifier(sampleList, 'github mcp');
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.item.name, 'GitHub MCP');
      });
    });

    describe('priority', () => {
      it('should prioritize id over key', () => {
        const list = [
          { id: 'test', key: 'other', name: 'Test', status: 'enabled', container: 'active' },
          { id: 'other-id', key: 'test', name: 'Other', status: 'enabled', container: 'active' }
        ];
        const result = matchIdentifier(list, 'test');
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.item.id, 'test');
      });

      it('should prioritize key over name', () => {
        const list = [
          { id: 'id1', key: 'test', name: 'Other', status: 'enabled', container: 'active' },
          { id: 'id2', key: 'other', name: 'test', status: 'enabled', container: 'active' }
        ];
        const result = matchIdentifier(list, 'test');
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.item.key, 'test');
      });
    });

    describe('ambiguous matches', () => {
      it('should detect ambiguous id matches', () => {
        const list = [
          { id: 'github', key: 'gh1', name: 'GitHub 1', status: 'enabled', container: 'active' },
          { id: 'github', key: 'gh2', name: 'GitHub 2', status: 'enabled', container: 'active' }
        ];
        const result = matchIdentifier(list, 'github');
        assert.strictEqual(result.ok, false);
        assert.strictEqual(result.ambiguous, true);
        assert.strictEqual(result.suggestions.length, 2);
      });

      it('should return up to 5 suggestions for ambiguous matches', () => {
        const list = Array.from({ length: 10 }, (_, i) => ({
          id: 'test',
          key: `key${i}`,
          name: `Name ${i}`,
          status: 'enabled',
          container: 'active'
        }));
        const result = matchIdentifier(list, 'test');
        assert.strictEqual(result.ok, false);
        assert.strictEqual(result.ambiguous, true);
        assert.strictEqual(result.suggestions.length, 5);
      });
    });

    describe('no matches with suggestions', () => {
      it('should provide suggestions for no match', () => {
        const result = matchIdentifier(sampleList, 'githubbb');
        assert.strictEqual(result.ok, false);
        assert.strictEqual(result.ambiguous, false);
        assert.ok(result.suggestions.length > 0);
      });

      it('should order suggestions by Levenshtein distance', () => {
        const result = matchIdentifier(sampleList, 'githb');
        assert.strictEqual(result.ok, false);
        // Closest should be 'github'
        assert.ok(result.suggestions[0].id === 'github' || result.suggestions[0].key === 'github');
      });

      it('should return up to 5 suggestions', () => {
        const result = matchIdentifier(sampleList, 'xyz');
        assert.strictEqual(result.ok, false);
        assert.ok(result.suggestions.length <= 5);
      });
    });

    describe('edge cases', () => {
      it('should handle empty list', () => {
        const result = matchIdentifier([], 'test');
        assert.strictEqual(result.ok, false);
        assert.strictEqual(result.ambiguous, false);
        assert.strictEqual(result.suggestions.length, 0);
      });

      it('should handle items with missing id/key/name', () => {
        const list = [
          { status: 'enabled', container: 'active' },
          { id: 'test', status: 'enabled', container: 'active' }
        ];
        const result = matchIdentifier(list, 'test');
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.item.id, 'test');
      });
    });
  });

  describe('nearestSuggestions', () => {
    const sampleList = [
      { id: 'github', key: 'github', name: 'GitHub MCP' },
      { id: 'gitlab', key: 'gitlab', name: 'GitLab MCP' },
      { id: 'slack', key: 'slack', name: 'Slack' }
    ];

    it('should return suggestions sorted by distance', () => {
      const result = nearestSuggestions(sampleList, 'githb');
      assert.ok(result.length > 0);
      // github should be closest
      assert.ok(result[0].id === 'github' || result[0].key === 'github');
    });

    it('should include suggestions from id, key, and name', () => {
      const result = nearestSuggestions(sampleList, 'git');
      // Should find both github and gitlab
      assert.ok(result.length >= 2);
    });

    it('should handle empty list', () => {
      const result = nearestSuggestions([], 'test');
      assert.strictEqual(result.length, 0);
    });

    it('should handle items with missing fields', () => {
      const list = [{ id: 'test' }, { name: 'Test Name' }];
      const result = nearestSuggestions(list, 'test');
      assert.ok(result.length > 0);
    });
  });

  describe('serializeSuggestions', () => {
    it('should serialize suggestion list', () => {
      const list = [
        { id: 'github', key: 'github', name: 'GitHub MCP', status: 'enabled', container: 'active', extra: 'ignored' },
        { id: 'gitlab', key: 'gitlab', name: 'GitLab MCP', status: 'disabled', container: 'disabled' }
      ];
      const result = serializeSuggestions(list);
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].id, 'github');
      assert.strictEqual(result[0].key, 'github');
      assert.strictEqual(result[0].name, 'GitHub MCP');
      assert.strictEqual(result[0].status, 'enabled');
      assert.strictEqual(result[0].container, 'active');
      assert.strictEqual(result[0].extra, undefined);
    });

    it('should handle empty list', () => {
      const result = serializeSuggestions([]);
      assert.strictEqual(result.length, 0);
    });

    it('should handle null/undefined', () => {
      assert.strictEqual(serializeSuggestions(null).length, 0);
      assert.strictEqual(serializeSuggestions(undefined).length, 0);
    });

    it('should handle items with missing fields', () => {
      const list = [{ id: 'test', status: 'enabled' }];
      const result = serializeSuggestions(list);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].id, 'test');
      assert.strictEqual(result[0].key, undefined);
      assert.strictEqual(result[0].name, undefined);
    });
  });
});
