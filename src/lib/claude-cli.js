const { execSync } = require('child_process');

/**
 * Wrapper for claude mcp CLI commands
 */

function exec(command) {
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024
    });
    return { ok: true, output: output.trim() };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      stderr: error.stderr ? error.stderr.toString().trim() : '',
      stdout: error.stdout ? error.stdout.toString().trim() : ''
    };
  }
}

/**
 * List all MCP servers
 * @returns {Object} { ok, servers[], error? }
 */
function listServers() {
  const result = exec('claude mcp list 2>&1');
  if (!result.ok) {
    return { ok: false, error: result.error, servers: [] };
  }

  const servers = [];
  const lines = result.output.split('\n');

  // Parse output format:
  // atlassian: https://mcp.atlassian.com/v1/sse (SSE) - ✓ Connected
  // sequential-thinking: npx @modelcontextprotocol/server-sequential-thinking - ✓ Connected

  for (const line of lines) {
    if (line.includes('Checking MCP server health')) continue;
    if (line.trim() === '') continue;

    const match = line.match(/^([^:]+):\s+(.+?)\s+-\s+(.+)$/);
    if (match) {
      const [, name, commandOrUrl, status] = match;
      const connected = status.includes('✓') || status.includes('Connected');

      // Determine transport type from the line
      let transport = 'stdio';
      if (commandOrUrl.includes('(SSE)')) {
        transport = 'sse';
      } else if (commandOrUrl.includes('(HTTP)')) {
        transport = 'http';
      }

      servers.push({
        name: name.trim(),
        commandOrUrl: commandOrUrl.replace(/\s*\((SSE|HTTP|STDIO)\)\s*/i, '').trim(),
        transport,
        status: connected ? 'enabled' : 'disabled',
        connected
      });
    }
  }

  return { ok: true, servers };
}

/**
 * Get detailed info about a specific server
 * @param {string} name - Server name
 * @returns {Object} { ok, server?, error? }
 */
function getServer(name) {
  const result = exec(`claude mcp get "${name}" 2>&1`);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const lines = result.output.split('\n');
  const server = { name };

  for (const line of lines) {
    if (line.includes('Scope:')) {
      server.scope = line.split('Scope:')[1].trim();
    } else if (line.includes('Status:')) {
      server.status = line.split('Status:')[1].trim();
      server.connected = server.status.includes('✓') || server.status.includes('Connected');
    } else if (line.includes('Type:')) {
      server.transport = line.split('Type:')[1].trim();
    } else if (line.includes('URL:')) {
      server.url = line.split('URL:')[1].trim();
    } else if (line.includes('Command:')) {
      server.command = line.split('Command:')[1].trim();
    } else if (line.includes('Args:')) {
      server.args = line.split('Args:')[1].trim().split(/\s+/);
    } else if (line.includes('Environment:')) {
      const envLine = line.split('Environment:')[1];
      if (envLine && envLine.trim()) {
        server.env = envLine.trim().split(/\s+/);
      }
    }
  }

  return { ok: true, server };
}

/**
 * Remove an MCP server
 * @param {string} name - Server name
 * @param {string} scope - Optional scope (user, local, project)
 * @returns {Object} { ok, error? }
 */
function removeServer(name, scope) {
  const scopeArg = scope ? ` -s ${scope}` : '';
  const result = exec(`claude mcp remove "${name}"${scopeArg} 2>&1`);
  return result;
}

/**
 * Add an MCP server
 * @param {Object} config - Server configuration
 * @param {string} config.name - Server name
 * @param {string} config.transport - Transport type (stdio, sse, http)
 * @param {string} config.commandOrUrl - Command or URL
 * @param {Array<string>} config.args - Arguments (for stdio)
 * @param {Array<string>} config.env - Environment variables
 * @param {string} config.scope - Scope (user, local, project)
 * @returns {Object} { ok, error? }
 */
function addServer(config) {
  const { name, transport, commandOrUrl, args = [], env = [], scope = 'user' } = config;

  let command = `claude mcp add -s ${scope} -t ${transport} "${name}" "${commandOrUrl}"`;

  if (args.length > 0) {
    command += ' -- ' + args.join(' ');
  }

  if (env.length > 0) {
    for (const envVar of env) {
      command += ` -e "${envVar}"`;
    }
  }

  const result = exec(command + ' 2>&1');
  return result;
}

module.exports = {
  listServers,
  getServer,
  removeServer,
  addServer
};
