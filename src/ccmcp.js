#!/usr/bin/env node
/* claude-mcp-switch - Claude Code MCP switcher (macOS/Linux/Windows)
 * List, enable, disable MCP servers using claude CLI commands.
 * Zero external dependency Node.js CLI (Node >=18)
 */

const path = require('path');
const claudeCli = require('./lib/claude-cli');
const storage = require('./lib/storage');
const { COLOR, println, eprintln, printBanner, help } = require('./lib/ui');

// Read version from package.json
const pkg = require(path.join(__dirname, '..', 'package.json'));
const VERSION = pkg.version;
const NAME = pkg.name;

const EX_OK = 0;
const EX_NO_MATCH = 2;
const EX_ERROR = 4;

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--json') args.json = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--version' || a === '-v') args.version = true;
    else if (a === '--no-color') args.noColor = true;
    else args._.push(a);
  }
  return args;
}

function printListTable(servers, disabledServers, asJson) {
  if (asJson) {
    const all = [
      ...servers.map(s => ({ ...s, status: 'enabled' })),
      ...disabledServers.map(d => ({ name: d.name, ...d.config, status: 'disabled' }))
    ];
    println(JSON.stringify(all, null, 2));
    return;
  }

  if (servers.length === 0 && disabledServers.length === 0) {
    println(COLOR.red('No MCP servers found.'));
    return;
  }

  // Print table header
  println('┌──────────┬──────────────────────┬────────────┬─────────────────────────────────────────────────┐');
  println('│ STATUS   │ NAME                 │ TRANSPORT  │ COMMAND/URL                                     │');
  println('├──────────┼──────────────────────┼────────────┼─────────────────────────────────────────────────┤');

  // Print enabled servers
  for (const server of servers) {
    const status = COLOR.green('enabled');
    const name = COLOR.cyan(server.name.padEnd(20).substring(0, 20));
    const transport = server.transport.padEnd(10).substring(0, 10);
    const cmd = server.commandOrUrl.substring(0, 47);
    println(`│ ${status}  │ ${name} │ ${transport} │ ${cmd.padEnd(47)} │`);
  }

  // Print disabled servers
  for (const disabled of disabledServers) {
    const status = COLOR.red('disabled');
    const name = COLOR.dim(disabled.name.padEnd(20).substring(0, 20));
    const transport = (disabled.config.transport || 'unknown').padEnd(10).substring(0, 10);
    const cmd = (disabled.config.url || disabled.config.command || '').substring(0, 47);
    println(`│ ${status} │ ${name} │ ${transport} │ ${COLOR.dim(cmd.padEnd(47))} │`);
  }

  println('└──────────┴──────────────────────┴────────────┴─────────────────────────────────────────────────┘');
}

function actionList(args) {
  const result = claudeCli.listServers();
  if (!result.ok) {
    if (args.json) {
      println(JSON.stringify({ ok: false, error: result.error }, null, 2));
    } else {
      eprintln(COLOR.red(`Error: ${result.error}`));
    }
    return EX_ERROR;
  }

  const disabledServers = storage.listDisabledServers();
  printListTable(result.servers, disabledServers, args.json);
  return EX_OK;
}

function findServer(identifier, servers, disabledServers) {
  // Try exact match in active servers
  let found = servers.find(s => s.name.toLowerCase() === identifier.toLowerCase());
  if (found) return { server: found, isDisabled: false };

  // Try exact match in disabled servers
  found = disabledServers.find(d => d.name.toLowerCase() === identifier.toLowerCase());
  if (found) return { server: found, isDisabled: true };

  return null;
}

function actionEnable(identifier, args) {
  if (!identifier) {
    if (args.json) {
      println(JSON.stringify({ ok: false, error: 'enable requires an identifier' }, null, 2));
    } else {
      eprintln(COLOR.red('Error: enable requires an identifier'));
    }
    return EX_ERROR;
  }

  // Check if it's in disabled storage
  const disabledConfig = storage.getDisabledServer(identifier);
  if (!disabledConfig) {
    if (args.json) {
      println(JSON.stringify({ ok: false, error: `Server "${identifier}" not found in disabled storage` }, null, 2));
    } else {
      eprintln(COLOR.red(`Error: Server "${identifier}" is not disabled or not found.`));
      eprintln(COLOR.dim('Use "list" to see available servers.'));
    }
    return EX_NO_MATCH;
  }

  if (args.dryRun) {
    if (args.json) {
      println(JSON.stringify({ ok: true, action: 'enable', identifier, dryRun: true }, null, 2));
    } else {
      println(COLOR.yellow(`[DRY RUN] Would enable "${identifier}"`));
    }
    return EX_OK;
  }

  // Re-add the server using stored config
  const addConfig = {
    name: identifier,
    transport: disabledConfig.transport,
    commandOrUrl: disabledConfig.url || disabledConfig.command,
    args: disabledConfig.args || [],
    env: disabledConfig.env || [],
    scope: 'user' // Default to user scope
  };

  const result = claudeCli.addServer(addConfig);
  if (!result.ok) {
    if (args.json) {
      println(JSON.stringify({ ok: false, error: result.error }, null, 2));
    } else {
      eprintln(COLOR.red(`Error enabling "${identifier}": ${result.error}`));
    }
    return EX_ERROR;
  }

  // Remove from disabled storage
  storage.removeDisabledServer(identifier);

  if (args.json) {
    println(JSON.stringify({ ok: true, action: 'enable', identifier }, null, 2));
  } else {
    println(COLOR.green(`✔ Enabled "${identifier}"`));
  }
  return EX_OK;
}

function actionDisable(identifier, args) {
  if (!identifier) {
    if (args.json) {
      println(JSON.stringify({ ok: false, error: 'disable requires an identifier' }, null, 2));
    } else {
      eprintln(COLOR.red('Error: disable requires an identifier'));
    }
    return EX_ERROR;
  }

  // Get server details before removing
  const getResult = claudeCli.getServer(identifier);
  if (!getResult.ok) {
    if (args.json) {
      println(JSON.stringify({ ok: false, error: `Server "${identifier}" not found` }, null, 2));
    } else {
      eprintln(COLOR.red(`Error: Server "${identifier}" not found.`));
      eprintln(COLOR.dim('Use "list" to see available servers.'));
    }
    return EX_NO_MATCH;
  }

  if (args.dryRun) {
    if (args.json) {
      println(JSON.stringify({ ok: true, action: 'disable', identifier, dryRun: true }, null, 2));
    } else {
      println(COLOR.yellow(`[DRY RUN] Would disable "${identifier}"`));
    }
    return EX_OK;
  }

  // Store config before removing
  storage.storeDisabledServer(identifier, getResult.server);

  // Remove the server
  const removeResult = claudeCli.removeServer(identifier);
  if (!removeResult.ok) {
    if (args.json) {
      println(JSON.stringify({ ok: false, error: removeResult.error }, null, 2));
    } else {
      eprintln(COLOR.red(`Error disabling "${identifier}": ${removeResult.error}`));
    }
    return EX_ERROR;
  }

  if (args.json) {
    println(JSON.stringify({ ok: true, action: 'disable', identifier }, null, 2));
  } else {
    println(COLOR.green(`✔ Disabled "${identifier}"`));
    println(COLOR.dim('Configuration saved. Use "enable" to restore it.'));
  }
  return EX_OK;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  // Handle --no-color
  if (args.noColor || process.env.NO_COLOR) {
    COLOR.enabled = false;
  }

  // Handle --json (implies no color)
  if (args.json) {
    COLOR.enabled = false;
  }

  // Handle --version
  if (args.version) {
    println(`${NAME} ${VERSION}`);
    return EX_OK;
  }

  // Handle --help
  if (args.help || args._.length === 0) {
    help();
    return EX_OK;
  }

  const [command, identifier] = args._;

  // Print banner for non-JSON output
  if (!args.json) {
    printBanner();
  }

  // Route commands
  if (command === 'list') {
    return actionList(args);
  } else if (command === 'enable') {
    return actionEnable(identifier, args);
  } else if (command === 'disable') {
    return actionDisable(identifier, args);
  } else {
    if (args.json) {
      println(JSON.stringify({ ok: false, error: `Unknown command: ${command}` }, null, 2));
    } else {
      eprintln(COLOR.red(`Error: Unknown command: ${command}`));
      eprintln(COLOR.dim('Run with --help for usage information.'));
    }
    return EX_ERROR;
  }
}

if (require.main === module) {
  const exitCode = main();
  process.exit(exitCode);
}

module.exports = { main, parseArgs };
