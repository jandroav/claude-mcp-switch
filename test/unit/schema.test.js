const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  detectSchema,
  enumerateServers,
  ensureContainers,
  performEnable,
  performDisable,
  packItem,
  briefCommand,
  briefTransport
} = require('../../src/lib/schema');

describe('schema', () => {
  describe('detectSchema', () => {
    it('should detect object schema', () => {
      const cfg = {
        mcpServers: {
          github: { command: 'npx' }
        }
      };
      const result = detectSchema(cfg);
      assert.strictEqual(result.shape, 'object');
      assert.strictEqual(result.hasEnabled, false);
    });

    it('should detect object schema with enabled property', () => {
      const cfg = {
        mcpServers: {
          github: { command: 'npx', enabled: true }
        }
      };
      const result = detectSchema(cfg);
      assert.strictEqual(result.shape, 'object');
      assert.strictEqual(result.hasEnabled, true);
    });

    it('should detect array schema', () => {
      const cfg = {
        mcpServers: [
          { id: 'github', command: 'npx' }
        ]
      };
      const result = detectSchema(cfg);
      assert.strictEqual(result.shape, 'array');
      assert.strictEqual(result.hasEnabled, false);
    });

    it('should detect array schema with enabled property', () => {
      const cfg = {
        mcpServers: [
          { id: 'github', command: 'npx', enabled: true }
        ]
      };
      const result = detectSchema(cfg);
      assert.strictEqual(result.shape, 'array');
      assert.strictEqual(result.hasEnabled, true);
    });

    it('should default to object shape if mcpServers missing', () => {
      const cfg = {};
      const result = detectSchema(cfg);
      assert.strictEqual(result.shape, 'object');
      assert.strictEqual(result.hasEnabled, false);
    });

    it('should throw for invalid schema', () => {
      const cfg = {
        mcpServers: 'invalid'
      };
      assert.throws(() => {
        detectSchema(cfg);
      }, /Unsupported mcpServers schema/);
    });
  });

  describe('briefCommand', () => {
    it('should create brief command string', () => {
      const def = {
        command: 'npx',
        args: ['-y', '@anthropic-ai/mcp-server-github']
      };
      const result = briefCommand(def);
      assert.strictEqual(result, 'npx -y @anthropic-ai/mcp-server-github');
    });

    it('should handle missing args', () => {
      const def = {
        command: 'node'
      };
      const result = briefCommand(def);
      assert.strictEqual(result, 'node');
    });

    it('should return undefined for missing command', () => {
      const def = {};
      const result = briefCommand(def);
      assert.strictEqual(result, undefined);
    });

    it('should truncate long commands', () => {
      const def = {
        command: 'npx',
        args: ['a'.repeat(100)]
      };
      const result = briefCommand(def);
      assert.ok(result.length <= 80);
      assert.ok(result.endsWith('…'));
    });
  });

  describe('briefTransport', () => {
    it('should handle string transport', () => {
      const result = briefTransport('stdio');
      assert.strictEqual(result, 'stdio');
    });

    it('should handle object transport', () => {
      const transport = { type: 'stdio', port: 8080 };
      const result = briefTransport(transport);
      assert.strictEqual(result, JSON.stringify(transport));
    });

    it('should return undefined for invalid transport', () => {
      const result = briefTransport(undefined);
      assert.strictEqual(result, undefined);
    });

    it('should truncate long transport strings', () => {
      const longTransport = 'a'.repeat(100);
      const result = briefTransport(longTransport);
      assert.ok(result.length <= 80);
    });
  });

  describe('packItem', () => {
    it('should pack object item with all fields', () => {
      const def = {
        id: 'github',
        name: 'GitHub MCP',
        command: 'npx',
        args: ['-y', '@anthropic-ai/mcp-server-github'],
        enabled: true
      };
      const result = packItem({ def, container: 'active', shape: 'object', key: 'github', index: undefined });

      assert.strictEqual(result.key, 'github');
      assert.strictEqual(result.id, 'github');
      assert.strictEqual(result.name, 'GitHub MCP');
      assert.strictEqual(result.status, 'enabled');
      assert.strictEqual(result.container, 'active');
      assert.strictEqual(result.shape, 'object');
      assert.ok(result.command);
      assert.strictEqual(result.def, def);
    });

    it('should pack array item', () => {
      const def = { id: 'test', command: 'test' };
      const result = packItem({ def, container: 'active', shape: 'array', key: undefined, index: 0 });

      assert.strictEqual(result.key, undefined);
      assert.strictEqual(result.index, 0);
      assert.strictEqual(result.shape, 'array');
    });

    it('should determine status from enabled property', () => {
      const defEnabled = { id: 'test', enabled: true };
      const defDisabled = { id: 'test', enabled: false };

      const resultEnabled = packItem({ def: defEnabled, container: 'active', shape: 'object', key: 'test', index: undefined });
      const resultDisabled = packItem({ def: defDisabled, container: 'active', shape: 'object', key: 'test', index: undefined });

      assert.strictEqual(resultEnabled.status, 'enabled');
      assert.strictEqual(resultDisabled.status, 'disabled');
    });

    it('should determine status from container', () => {
      const def = { id: 'test' };
      const result = packItem({ def, container: 'disabled', shape: 'object', key: 'test', index: undefined });

      assert.strictEqual(result.status, 'disabled');
    });
  });

  describe('enumerateServers', () => {
    it('should enumerate object-shaped mcpServers', () => {
      const cfg = {
        mcpServers: {
          github: { id: 'github', command: 'npx' },
          slack: { id: 'slack', command: 'node' }
        }
      };
      const result = enumerateServers(cfg);

      assert.strictEqual(result.length, 2);
      assert.ok(result.some(item => item.id === 'github'));
      assert.ok(result.some(item => item.id === 'slack'));
    });

    it('should enumerate array-shaped mcpServers', () => {
      const cfg = {
        mcpServers: [
          { id: 'github', command: 'npx' },
          { id: 'slack', command: 'node' }
        ]
      };
      const result = enumerateServers(cfg);

      assert.strictEqual(result.length, 2);
      assert.ok(result.every(item => item.shape === 'array'));
    });

    it('should enumerate both active and disabled servers', () => {
      const cfg = {
        mcpServers: {
          github: { id: 'github' }
        },
        mcpServersDisabled: {
          slack: { id: 'slack' }
        }
      };
      const result = enumerateServers(cfg);

      assert.strictEqual(result.length, 2);
      const github = result.find(item => item.id === 'github');
      const slack = result.find(item => item.id === 'slack');
      assert.strictEqual(github.container, 'active');
      assert.strictEqual(slack.container, 'disabled');
    });

    it('should handle empty config', () => {
      const cfg = { mcpServers: {} };
      const result = enumerateServers(cfg);
      assert.strictEqual(result.length, 0);
    });

    it('should handle missing mcpServers', () => {
      const cfg = {};
      const result = enumerateServers(cfg);
      assert.strictEqual(result.length, 0);
    });
  });

  describe('ensureContainers', () => {
    it('should ensure object containers exist', () => {
      const cfg = {};
      ensureContainers(cfg, 'object');

      assert.ok(typeof cfg.mcpServers === 'object');
      assert.ok(!Array.isArray(cfg.mcpServers));
      assert.ok(typeof cfg.mcpServersDisabled === 'object');
      assert.ok(!Array.isArray(cfg.mcpServersDisabled));
    });

    it('should ensure array containers exist', () => {
      const cfg = {};
      ensureContainers(cfg, 'array');

      assert.ok(Array.isArray(cfg.mcpServers));
      assert.ok(Array.isArray(cfg.mcpServersDisabled));
    });

    it('should not overwrite valid object containers', () => {
      const cfg = {
        mcpServers: { github: {} },
        mcpServersDisabled: { slack: {} }
      };
      ensureContainers(cfg, 'object');

      assert.ok(cfg.mcpServers.github);
      assert.ok(cfg.mcpServersDisabled.slack);
    });

    it('should fix invalid containers', () => {
      const cfg = {
        mcpServers: 'invalid',
        mcpServersDisabled: null
      };
      ensureContainers(cfg, 'object');

      assert.ok(typeof cfg.mcpServers === 'object');
      assert.ok(typeof cfg.mcpServersDisabled === 'object');
    });
  });

  describe('performEnable', () => {
    describe('object schema', () => {
      it('should enable disabled server by moving containers', () => {
        const cfg = {
          mcpServers: {},
          mcpServersDisabled: {
            github: { id: 'github' }
          }
        };
        const item = {
          key: 'github',
          def: cfg.mcpServersDisabled.github,
          container: 'disabled'
        };
        const schema = { shape: 'object', hasEnabled: false };

        const changes = performEnable(cfg, item, schema);

        assert.ok(cfg.mcpServers.github);
        assert.strictEqual(cfg.mcpServersDisabled.github, undefined);
        assert.ok(changes.length > 0);
      });

      it('should set enabled=true if property exists', () => {
        const cfg = {
          mcpServers: {
            github: { id: 'github', enabled: false }
          }
        };
        const item = {
          key: 'github',
          def: cfg.mcpServers.github,
          container: 'active'
        };
        const schema = { shape: 'object', hasEnabled: true };

        performEnable(cfg, item, schema);

        assert.strictEqual(cfg.mcpServers.github.enabled, true);
      });
    });

    describe('array schema', () => {
      it('should enable disabled server by moving arrays', () => {
        const def = { id: 'github' };
        const cfg = {
          mcpServers: [],
          mcpServersDisabled: [def]
        };
        const item = {
          def,
          container: 'disabled'
        };
        const schema = { shape: 'array', hasEnabled: false };

        performEnable(cfg, item, schema);

        assert.strictEqual(cfg.mcpServers.length, 1);
        assert.strictEqual(cfg.mcpServersDisabled.length, 0);
      });

      it('should set enabled=true if property exists', () => {
        const cfg = {
          mcpServers: [
            { id: 'github', enabled: false }
          ]
        };
        const item = {
          def: cfg.mcpServers[0],
          container: 'active'
        };
        const schema = { shape: 'array', hasEnabled: true };

        performEnable(cfg, item, schema);

        assert.strictEqual(cfg.mcpServers[0].enabled, true);
      });
    });
  });

  describe('performDisable', () => {
    describe('object schema', () => {
      it('should disable server by moving containers', () => {
        const cfg = {
          mcpServers: {
            github: { id: 'github' }
          },
          mcpServersDisabled: {}
        };
        const item = {
          key: 'github',
          def: cfg.mcpServers.github,
          container: 'active'
        };
        const schema = { shape: 'object', hasEnabled: false };

        const changes = performDisable(cfg, item, schema);

        assert.strictEqual(cfg.mcpServers.github, undefined);
        assert.ok(cfg.mcpServersDisabled.github);
        assert.ok(changes.length > 0);
      });

      it('should set enabled=false if property exists', () => {
        const cfg = {
          mcpServers: {
            github: { id: 'github', enabled: true }
          }
        };
        const item = {
          key: 'github',
          def: cfg.mcpServers.github,
          container: 'active'
        };
        const schema = { shape: 'object', hasEnabled: true };

        performDisable(cfg, item, schema);

        assert.strictEqual(cfg.mcpServers.github.enabled, false);
        // Should NOT move containers when enabled property exists
        assert.ok(cfg.mcpServers.github);
      });
    });

    describe('array schema', () => {
      it('should throw if no enabled property in array schema', () => {
        const cfg = {
          mcpServers: [{ id: 'github' }]
        };
        const item = {
          def: cfg.mcpServers[0],
          container: 'active'
        };
        const schema = { shape: 'array', hasEnabled: false };

        assert.throws(() => {
          performDisable(cfg, item, schema);
        }, /unsupported/i);
      });

      it('should set enabled=false if property exists', () => {
        const cfg = {
          mcpServers: [
            { id: 'github', enabled: true }
          ]
        };
        const item = {
          def: cfg.mcpServers[0],
          container: 'active'
        };
        const schema = { shape: 'array', hasEnabled: true };

        performDisable(cfg, item, schema);

        assert.strictEqual(cfg.mcpServers[0].enabled, false);
      });
    });
  });
});
