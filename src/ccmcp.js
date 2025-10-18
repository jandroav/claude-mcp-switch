#!/usr/bin/env node
/* ccmcp - Claude Code MCP switcher (macOS/Linux)
 * List, enable, disable MCP servers in Claude Code/Claude Desktop config.
 * Zero-dependency Node.js CLI (Node >=18)
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const EX_OK = 0;
const EX_NO_MATCH = 2;
const EX_AMBIG = 3;
const EX_IO = 4;
const EX_JSON = 5;

function println(s = '') {
  process.stdout.write(String(s) + '\n');
}
function eprintln(s = '') {
  process.stderr.write(String(s) + '\n');
}

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
        eprintln('Error: --config requires a path');
        process.exit(EX_IO);
      }
      args.config = next;
      i++;
    } else {
      args._.push(a);
    }
  }
  return args;
}

function help() {
  const msg = `
ccmcp - Claude Code MCP switcher

Usage:
  ccmcp list [--json] [--config PATH]
  ccmcp enable <identifier> [--config PATH] [--dry-run] [--json]
  ccmcp disable <identifier> [--config PATH] [--dry-run] [--json]
  ccmcp --help | --version

Identifier resolution (case-insensitive exact match):
  Priority: id > key > name

Config discovery:
  --config PATH overrides auto-detection.
  If CLAUDE_CONFIG_DIR is set:
    - $CLAUDE_CONFIG_DIR/settings.json
    - $CLAUDE_CONFIG_DIR/claude_desktop_config.json
  Else OS defaults:
    - macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
             ~/.claude/settings.json
    - Linux: ~/.config/claude/claude_desktop_config.json
             ~/.claude/settings.json

Exit codes:
  0 success
  2 no match
  3 ambiguous match
  4 IO or config not found
  5 invalid JSON / unsupported schema
`.trim();
  println(msg);
}

function expandHome(p) {
  if (!p) return p;
  if (p.startsWith('~')) {
    return path.join(os.homedir(), p.slice(1));
  }
  return p;
}

function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function detectPlatform() {
  const pf = process.platform;
  if (pf === 'darwin') return 'mac';
  if (pf === 'linux') return 'linux';
  return 'other';
}

function candidateConfigPaths() {
  const out = [];
  const envDir = process.env.CLAUDE_CONFIG_DIR;
  if (envDir) {
    const base = expandHome(envDir);
    out.push(path.join(base, 'settings.json'));
    out.push(path.join(base, 'claude_desktop_config.json'));
  } else {
    const plat = detectPlatform();
    if (plat === 'mac') {
      out.push(path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'));
      out.push(path.join(os.homedir(), '.claude', 'settings.json'));
    } else if (plat === 'linux') {
      out.push(path.join(os.homedir(), '.config', 'claude', 'claude_desktop_config.json'));
      out.push(path.join(os.homedir(), '.claude', 'settings.json'));
    }
  }
  return out;
}

function resolveConfigPath(overridePath) {
  if (overridePath) {
    const p = path.resolve(process.cwd(), expandHome(overridePath));
    if (!fileExists(p)) {
      throw ioErr(`Config file not found: ${p}`);
    }
    return p;
  }
  const candidates = candidateConfigPaths();
  for (const p of candidates) {
    if (fileExists(p)) return p;
  }
  throw ioErr(
    'Could not find Claude Code config. Tried:\n' +
      candidateConfigPaths().map((p) => `  - ${p}`).join('\n') +
      '\nSet CLAUDE_CONFIG_DIR or pass --config PATH'
  );
}

function readJson(p) {
  try {
    const raw = fs.readFileSync(p, 'utf8');
    try {
      return JSON.parse(raw);
    } catch (e) {
      throw jsonErr(`Invalid JSON in ${p}: ${e.message}`);
    }
  } catch (e) {
    if (e.code === 'ENOENT') throw ioErr(`Config not found: ${p}`);
    throw ioErr(`Unable to read file ${p}: ${e.message}`);
  }
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    '-' +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function backupFile(p) {
  const dir = path.dirname(p);
  const base = path.basename(p);
  const bak = path.join(dir, `${base}.bak.${nowStamp()}`);
  fs.copyFileSync(p, bak);
  return bak;
}

function writeJsonAtomic(p, data) {
  const dir = path.dirname(p);
  const tmp = path.join(dir, `.${path.basename(p)}.tmp-${process.pid}-${Date.now()}`);
  const raw = JSON.stringify(data, null, 2) + '\n';
  fs.writeFileSync(tmp, raw, 'utf8');
  fs.renameSync(tmp, p);
}

function ioErr(msg) {
  const err = new Error(msg);
  err.codeEx = EX_IO;
  return err;
}
function jsonErr(msg) {
  const err = new Error(msg);
  err.codeEx = EX_JSON;
  return err;
}

function detectSchema(cfg) {
  const ms = cfg && cfg.mcpServers;
  if (!ms) {
    // If missing, we consider object shape by default (common in docs)
    return { shape: 'object', hasEnabled: false };
  }
  if (Array.isArray(ms)) {
    // Determine if elements have enabled property
    let hasEnabled = false;
    for (const it of ms) {
      if (it && Object.prototype.hasOwnProperty.call(it, 'enabled')) {
        hasEnabled = true;
        break;
      }
    }
    return { shape: 'array', hasEnabled };
  }
  if (typeof ms === 'object') {
    // Scan values for enabled presence
    let hasEnabled = false;
    for (const k of Object.keys(ms)) {
      const v = ms[k];
      if (v && Object.prototype.hasOwnProperty.call(v, 'enabled')) {
        hasEnabled = true;
        break;
      }
    }
    return { shape: 'object', hasEnabled };
  }
  throw jsonErr('Unsupported mcpServers schema: must be object or array');
}

function enumerateServers(cfg) {
  const list = [];
  const ms = cfg.mcpServers;
  const md = cfg.mcpServersDisabled;

  if (Array.isArray(ms)) {
    // Active array
    for (let i = 0; i < ms.length; i++) {
      const def = ms[i] || {};
      list.push(packItem({ def, container: 'active', shape: 'array', index: i, key: undefined }));
    }
    // Disabled array (tool-managed)
    if (Array.isArray(md)) {
      for (let i = 0; i < md.length; i++) {
        const def = md[i] || {};
        list.push(packItem({ def, container: 'disabled', shape: 'array', index: i, key: undefined }));
      }
    }
  } else {
    const activeObj = ms && typeof ms === 'object' ? ms : {};
    for (const key of Object.keys(activeObj)) {
      const def = activeObj[key] || {};
      list.push(packItem({ def, container: 'active', shape: 'object', key, index: undefined }));
    }
    const disabledObj = md && typeof md === 'object' && !Array.isArray(md) ? md : {};
    for (const key of Object.keys(disabledObj)) {
      const def = disabledObj[key] || {};
      list.push(packItem({ def, container: 'disabled', shape: 'object', key, index: undefined }));
    }
  }

  return list;
}

function packItem({ def, container, shape, key, index }) {
  const id = safeStr(def.id);
  const name = safeStr(def.name);
  const enabledProp = Object.prototype.hasOwnProperty.call(def, 'enabled') ? !!def.enabled : undefined;
  const status =
    container === 'disabled'
      ? 'disabled'
      : enabledProp === false
      ? 'disabled'
      : 'enabled';
  const command = briefCommand(def);
  const transport = def.transport ? briefTransport(def.transport) : undefined;
  return {
    key: key !== undefined ? String(key) : undefined,
    id: id || undefined,
    name: name || undefined,
    def,
    container,
    status,
    command,
    transport,
    shape,
    index
  };
}

function briefCommand(def) {
  if (!def) return undefined;
  if (def.command) {
    const args = Array.isArray(def.args) ? def.args : [];
    const joined = [def.command, ...args].join(' ');
    return truncate(joined, 80);
  }
  return undefined;
}

function briefTransport(transport) {
  try {
    if (typeof transport === 'string') return truncate(transport, 80);
    if (transport && typeof transport === 'object') {
      return truncate(JSON.stringify(transport), 80);
    }
  } catch {}
  return undefined;
}

function truncate(s, n) {
  if (!s) return s;
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function safeStr(x) {
  if (x === null || x === undefined) return '';
  return String(x);
}

function printList(list, asJson) {
  if (asJson) {
    const out = list.map((it) => ({
      status: it.status,
      key: it.key,
      id: it.id,
      name: it.name,
      command: it.command,
      transport: it.transport,
      container: it.container
    }));
    println(JSON.stringify(out, null, 2));
    return;
  }
  if (list.length === 0) {
    println('No MCP servers found.');
    return;
  }
  const rows = [
    ['STATUS', 'KEY', 'ID', 'NAME', 'COMMAND/TRANSPORT'],
    ...list.map((it) => [
      it.status,
      it.key || '',
      it.id || '',
      it.name || '',
      it.command || it.transport || ''
    ])
  ];
  const widths = [];
  for (const row of rows) {
    row.forEach((col, i) => {
      widths[i] = Math.max(widths[i] || 0, col.length);
    });
  }
  rows.forEach((row, idx) => {
    const line = row
      .map((col, i) => col.padEnd(widths[i]))
      .join('  ');
    println(line);
    if (idx === 0) println('-'.repeat(line.length));
  });
}

function matchIdentifier(list, ident) {
  const needle = ident.toLowerCase();

  const by = (selector) =>
    list.filter((it) => {
      const v = selector(it);
      return v && v.toLowerCase() === needle;
    });

  let matches = by((it) => it.id);
  if (matches.length === 0) {
    matches = by((it) => it.key);
    if (matches.length === 0) {
      matches = by((it) => it.name);
    }
  }

  if (matches.length === 1) return { ok: true, item: matches[0] };

  if (matches.length > 1) {
    return { ok: false, ambiguous: true, suggestions: matches.slice(0, 5) };
  }

  // no match: suggestions by nearest strings
  const suggestions = nearestSuggestions(list, ident).slice(0, 5);
  return { ok: false, ambiguous: false, suggestions };
}

function nearestSuggestions(list, ident) {
  const cand = [];
  list.forEach((it) => {
    if (it.id) cand.push({ type: 'id', value: it.id, item: it });
    if (it.key) cand.push({ type: 'key', value: it.key, item: it });
    if (it.name) cand.push({ type: 'name', value: it.name, item: it });
  });
  const scored = cand.map((c) => ({
    ...c,
    dist: levenshtein(ident.toLowerCase(), c.value.toLowerCase())
  }));
  scored.sort((a, b) => a.dist - b.dist);
  return scored.map((s) => s.item);
}

// Classic DP Levenshtein
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function ensureContainers(cfg, shape) {
  if (shape === 'object') {
    if (!cfg.mcpServers || typeof cfg.mcpServers !== 'object' || Array.isArray(cfg.mcpServers)) {
      cfg.mcpServers = {};
    }
    if (!cfg.mcpServersDisabled || typeof cfg.mcpServersDisabled !== 'object' || Array.isArray(cfg.mcpServersDisabled)) {
      // Do not overwrite array form if present
      cfg.mcpServersDisabled = {};
    }
  } else {
    if (!Array.isArray(cfg.mcpServers)) {
      cfg.mcpServers = [];
    }
    if (!Array.isArray(cfg.mcpServersDisabled)) {
      cfg.mcpServersDisabled = [];
    }
  }
}

function performEnable(cfg, item, schema) {
  const changes = [];
  if (schema.shape === 'object') {
    ensureContainers(cfg, 'object');
    if (item.container === 'disabled') {
      // Move to active
      const key = item.key;
      cfg.mcpServers[key] = item.def;
      delete cfg.mcpServersDisabled[key];
      changes.push(`moved ${key} from mcpServersDisabled to mcpServers`);
    } else {
      changes.push(`kept ${item.key || item.id || item.name} in mcpServers`);
    }
    if (Object.prototype.hasOwnProperty.call(item.def, 'enabled') && item.def.enabled === false) {
      item.def.enabled = true;
      changes.push('set enabled=true');
    }
  } else {
    // array shape
    ensureContainers(cfg, 'array');
    if (item.container === 'disabled') {
      // If disabled array exists, move back
      const idx = cfg.mcpServersDisabled.indexOf(item.def);
      if (idx >= 0) {
        cfg.mcpServers.push(item.def);
        cfg.mcpServersDisabled.splice(idx, 1);
        changes.push('moved entry from mcpServersDisabled[] to mcpServers[]');
      }
    } else {
      changes.push('kept entry in mcpServers[]');
    }
    if (Object.prototype.hasOwnProperty.call(item.def, 'enabled') && item.def.enabled === false) {
      item.def.enabled = true;
      changes.push('set enabled=true');
    }
  }
  return changes;
}

function performDisable(cfg, item, schema) {
  const changes = [];
  if (schema.shape === 'object') {
    ensureContainers(cfg, 'object');
    if (Object.prototype.hasOwnProperty.call(item.def, 'enabled')) {
      if (item.def.enabled !== false) {
        item.def.enabled = false;
        changes.push('set enabled=false');
      } else {
        changes.push('already enabled=false');
      }
      // We do not move containers when an explicit enabled flag exists
      return changes;
    }
    // No enabled flag: move containers
    if (item.container === 'active') {
      const key = item.key;
      cfg.mcpServersDisabled[key] = item.def;
      delete cfg.mcpServers[key];
      changes.push(`moved ${key} from mcpServers to mcpServersDisabled`);
    } else {
      changes.push(`already in mcpServersDisabled under key ${item.key}`);
    }
  } else {
    // array shape
    ensureContainers(cfg, 'array');
    if (!Object.prototype.hasOwnProperty.call(item.def, 'enabled')) {
      // Unsupported in spec: instruct to add enabled or use object shape
      throw jsonErr(
        'Disable on array-shaped mcpServers without an "enabled" field is unsupported.\n' +
          'Please add "enabled": true/false to your server entry or convert mcpServers to an object keyed by server name.'
      );
    }
    if (item.def.enabled !== false) {
      item.def.enabled = false;
      changes.push('set enabled=false');
    } else {
      changes.push('already enabled=false');
    }
  }
  return changes;
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
      if (m.ambiguous) {
        eprintln(`Ambiguous identifier "${ident}". Candidates:`);
      } else {
        eprintln(`No match for "${ident}". Did you mean:`);
      }
      for (const s of m.suggestions) {
        eprintln(`  - ${displayItem(s)}`);
      }
    }
    return m.ambiguous ? EX_AMBIG : EX_NO_MATCH;
  }
  const schema = detectSchema(cfg);
  const changes = performEnable(cfg, m.item, schema);
  if (args.dryRun) {
    if (args.json) {
      println(JSON.stringify({ action: 'enable', identifier: ident, ok: true, dryRun: true, changes, configPath: cfgPath }, null, 2));
    } else {
      println(`Planned changes (no write):\n- ${changes.join('\n- ') || 'no-op'}`);
    }
    return EX_OK;
  }
  // Write out
  const bak = backupFile(cfgPath);
  writeJsonAtomic(cfgPath, cfg);
  if (args.json) {
    println(JSON.stringify({ action: 'enable', identifier: ident, ok: true, backup: bak, changes, configPath: cfgPath }, null, 2));
  } else {
    println(`Enabled "${ident}". Backup: ${bak}`);
    if (changes.length) println(`Changes:\n- ${changes.join('\n- ')}`);
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
      if (m.ambiguous) {
        eprintln(`Ambiguous identifier "${ident}". Candidates:`);
      } else {
        eprintln(`No match for "${ident}". Did you mean:`);
      }
      for (const s of m.suggestions) {
        eprintln(`  - ${displayItem(s)}`);
      }
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
      eprintln(`Error: ${e.message}`);
    }
    return e.codeEx || EX_JSON;
  }
  if (args.dryRun) {
    if (args.json) {
      println(JSON.stringify({ action: 'disable', identifier: ident, ok: true, dryRun: true, changes, configPath: cfgPath }, null, 2));
    } else {
      println(`Planned changes (no write):\n- ${changes.join('\n- ') || 'no-op'}`);
    }
    return EX_OK;
  }
  // Write out
  const bak = backupFile(cfgPath);
  writeJsonAtomic(cfgPath, cfg);
  if (args.json) {
    println(JSON.stringify({ action: 'disable', identifier: ident, ok: true, backup: bak, changes, configPath: cfgPath }, null, 2));
  } else {
    println(`Disabled "${ident}". Backup: ${bak}`);
    if (changes.length) println(`Changes:\n- ${changes.join('\n- ')}`);
  }
  return EX_OK;
}

function displayItem(it) {
  const parts = [];
  if (it.key) parts.push(`key=${it.key}`);
  if (it.id) parts.push(`id=${it.id}`);
  if (it.name) parts.push(`name=${it.name}`);
  parts.push(`status=${it.status}`);
  return parts.join(', ');
}

function serializeSuggestions(list) {
  return (list || []).map((it) => ({
    key: it.key,
    id: it.id,
    name: it.name,
    status: it.status,
    container: it.container
  }));
}

function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  if (args.help) {
    help();
    process.exit(EX_OK);
  }
  if (args.version) {
    println('ccmcp 0.1.0');
    process.exit(EX_OK);
  }

  const cmd = args._[0];
  if (!cmd || !['list', 'enable', 'disable'].includes(cmd)) {
    help();
    process.exit(cmd ? EX_IO : EX_OK);
  }

  let cfgPath;
  try {
    cfgPath = resolveConfigPath(args.config);
  } catch (e) {
    if (args.json) {
      println(JSON.stringify({ ok: false, error: e.message }, null, 2));
    } else {
      eprintln(`Error: ${e.message}`);
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
      eprintln(`Error: ${e.message}`);
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
        eprintln('Error: enable requires an identifier');
        process.exit(EX_IO);
      }
      const code = actionEnable(cfg, ident, args, cfgPath);
      process.exit(code);
    } else if (cmd === 'disable') {
      const ident = args._[1];
      if (!ident) {
        eprintln('Error: disable requires an identifier');
        process.exit(EX_IO);
      }
      const code = actionDisable(cfg, ident, args, cfgPath);
      process.exit(code);
    }
  } catch (e) {
    if (args.json) {
      println(JSON.stringify({ ok: false, error: e.message }, null, 2));
    } else {
      eprintln(`Unhandled error: ${e.message}`);
    }
    process.exit(e.codeEx || EX_IO);
  }
}

main();