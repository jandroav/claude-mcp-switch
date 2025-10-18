#!/usr/bin/env node
/* ccmcp - Claude Code MCP switcher (macOS/Linux/Windows)
 * List, enable, disable MCP servers in Claude Code/Claude Desktop config.
 * Zero-dependency Node.js CLI (Node >=18)
 */

const { resolveConfigPath, readJson, backupFile, writeJsonAtomic, EX_IO, EX_JSON } = require('./lib/config');
const { detectSchema, enumerateServers, performEnable, performDisable } = require('./lib/schema');
const { matchIdentifier, serializeSuggestions } = require('./lib/matcher');
const { COLOR, println, eprintln, printBanner, printList, printSuggestionsTable, help } = require('./lib/ui');

const EX_OK = 0;
const EX_NO_MATCH = 2;
const EX_AMBIG = 3;

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--json') args.json = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--version' || a === '-v') args.version = true;
    else if (a === '--config') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        eprintln(COLOR.red('Error: --config requires a path'));
        process.exit(EX_IO);
      }
      args.config = next;
      i++;
    } else if (a === '--no-color') {
      args.noColor = true;
    } else {
      args._.push(a);
    }
  }
  return args;
}

function actionList(cfg, args) {
  const items = enumerateServers(cfg);
  printList(items, !!args.json);
  return EX_OK;
}

function actionEnable(cfg, ident, args, cfgPath) {
  const list = enumerateServers(cfg);
  const m = matchIdentifier(list, ident);
  if (!m.ok) {
    if (args.json) {
      println(JSON.stringify({ action: 'enable', identifier: ident, ok: false, ambiguous: !!m.ambiguous, suggestions: serializeSuggestions(m.suggestions) }, null, 2));
    } else {
      const title = m.ambiguous
        ? COLOR.yellow(`Ambiguous identifier "${ident}". Candidates:`)
        : COLOR.red(`No match for "${ident}". Suggestions:`);
      println(title);
      printSuggestionsTable(m.suggestions);
    }
    return m.ambiguous ? EX_AMBIG : EX_NO_MATCH;
  }
  const schema = detectSchema(cfg);
  const changes = performEnable(cfg, m.item, schema);
  if (args.dryRun) {
    if (args.json) {
      println(JSON.stringify({ action: 'enable', identifier: ident, ok: true, dryRun: true, changes, configPath: cfgPath }, null, 2));
    } else {
      const body = changes.length ? changes.map((c) => `  • ${c}`).join('\n') : '  • no-op';
      println(COLOR.cyan('Planned changes (no write):') + '\n' + body);
    }
    return EX_OK;
  }
  // Write out
  const bak = backupFile(cfgPath);
  writeJsonAtomic(cfgPath, cfg);
  if (args.json) {
    println(JSON.stringify({ action: 'enable', identifier: ident, ok: true, backup: bak, changes, configPath: cfgPath }, null, 2));
  } else {
    println(COLOR.green(`✔ Enabled "${ident}"`) + ' ' + COLOR.dim(`(backup: ${bak})`));
    if (changes.length) {
      const body = changes.map((c) => `  • ${c}`).join('\n');
      println(COLOR.cyan('Changes:') + '\n' + body);
    }
  }
  return EX_OK;
}

function actionDisable(cfg, ident, args, cfgPath) {
  const list = enumerateServers(cfg);
  const m = matchIdentifier(list, ident);
  if (!m.ok) {
    if (args.json) {
      println(JSON.stringify({ action: 'disable', identifier: ident, ok: false, ambiguous: !!m.ambiguous, suggestions: serializeSuggestions(m.suggestions) }, null, 2));
    } else {
      const title = m.ambiguous
        ? COLOR.yellow(`Ambiguous identifier "${ident}". Candidates:`)
        : COLOR.red(`No match for "${ident}". Suggestions:`);
      println(title);
      printSuggestionsTable(m.suggestions);
    }
    return m.ambiguous ? EX_AMBIG : EX_NO_MATCH;
  }
  const schema = detectSchema(cfg);
  let changes;
  try {
    changes = performDisable(cfg, m.item, schema);
  } catch (e) {
    if (args.json) {
      println(JSON.stringify({ action: 'disable', identifier: ident, ok: false, error: e.message }, null, 2));
    } else {
      eprintln(COLOR.red(`Error: ${e.message}`));
    }
    return e.codeEx || EX_JSON;
  }
  if (args.dryRun) {
    if (args.json) {
      println(JSON.stringify({ action: 'disable', identifier: ident, ok: true, dryRun: true, changes, configPath: cfgPath }, null, 2));
    } else {
      const body = changes.length ? changes.map((c) => `  • ${c}`).join('\n') : '  • no-op';
      println(COLOR.cyan('Planned changes (no write):') + '\n' + body);
    }
    return EX_OK;
  }
  // Write out
  const bak = backupFile(cfgPath);
  writeJsonAtomic(cfgPath, cfg);
  if (args.json) {
    println(JSON.stringify({ action: 'disable', identifier: ident, ok: true, backup: bak, changes, configPath: cfgPath }, null, 2));
  } else {
    println(COLOR.yellow(`✔ Disabled "${ident}"`) + ' ' + COLOR.dim(`(backup: ${bak})`));
    if (changes.length) {
      const body = changes.map((c) => `  • ${c}`).join('\n');
      println(COLOR.cyan('Changes:') + '\n' + body);
    }
  }
  return EX_OK;
}

function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  // Configure color support
  COLOR.enabled = !args.json && !args.noColor && process.stdout.isTTY && process.env.NO_COLOR !== '1';

  if (args.help) {
    help(args);
    process.exit(EX_OK);
  }
  if (args.version) {
    println(COLOR.bold(COLOR.cyan('ccmcp 0.1.0')));
    process.exit(EX_OK);
  }

  const cmd = args._[0];
  if (!cmd || !['list', 'enable', 'disable'].includes(cmd)) {
    help(args);
    process.exit(cmd ? EX_IO : EX_OK);
  }

  if (!args.json) {
    printBanner();
  }

  let cfgPath;
  try {
    cfgPath = resolveConfigPath(args.config);
  } catch (e) {
    if (args.json) {
      println(JSON.stringify({ ok: false, error: e.message }, null, 2));
    } else {
      eprintln(COLOR.red(`Error: ${e.message}`));
    }
    process.exit(e.codeEx || EX_IO);
  }

  let cfg;
  try {
    cfg = readJson(cfgPath);
  } catch (e) {
    if (args.json) {
      println(JSON.stringify({ ok: false, error: e.message, configPath: cfgPath }, null, 2));
    } else {
      eprintln(COLOR.red(`Error: ${e.message}`));
    }
    process.exit(e.codeEx || EX_IO);
  }

  try {
    if (cmd === 'list') {
      const code = actionList(cfg, args);
      process.exit(code);
    } else if (cmd === 'enable') {
      const ident = args._[1];
      if (!ident) {
        eprintln(COLOR.red('Error: enable requires an identifier'));
        process.exit(EX_IO);
      }
      const code = actionEnable(cfg, ident, args, cfgPath);
      process.exit(code);
    } else if (cmd === 'disable') {
      const ident = args._[1];
      if (!ident) {
        eprintln(COLOR.red('Error: disable requires an identifier'));
        process.exit(EX_IO);
      }
      const code = actionDisable(cfg, ident, args, cfgPath);
      process.exit(code);
    }
  } catch (e) {
    if (args.json) {
      println(JSON.stringify({ ok: false, error: e.message }, null, 2));
    } else {
      eprintln(COLOR.red(`Unhandled error: ${e.message}`));
    }
    process.exit(e.codeEx || EX_IO);
  }
}

main();
