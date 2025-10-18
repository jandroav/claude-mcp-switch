// ANSI color utilities (no external deps)
const COLOR = {
  enabled: true,
  code(code, s) {
    return this.enabled ? `\x1b[${code}m${String(s)}\x1b[0m` : String(s);
  },
  bold(s) { return this.code(1, s); },
  dim(s) { return this.code(2, s); },
  red(s) { return this.code(31, s); },
  green(s) { return this.code(32, s); },
  yellow(s) { return this.code(33, s); },
  blue(s) { return this.code(34, s); },
  magenta(s) { return this.code(35, s); },
  cyan(s) { return this.code(36, s); },
  gray(s) { return this.code(90, s); }
};

function println(s = '') {
  process.stdout.write(String(s) + '\n');
}

function eprintln(s = '') {
  process.stderr.write(String(s) + '\n');
}

function printBanner() {
  const logo = [
    '   ____   ____  __  __ ____  ',
    '  / ___| / ___||  \\/  |  _ \\ ',
    " | |     \\___ \\| |\\/| | |_) |",
    ' | |___   ___) | |  | |  __/ ',
    '  \\____| |____/|_|  |_|_|    '
  ];
  const title = 'Claude Code MCP switcher';
  for (const line of logo) println(COLOR.cyan(COLOR.bold(line)));
  println(COLOR.dim(' cc mcp · ' + title));
  println(COLOR.dim('──────────────────────────────────────────────────────'));
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
    println(COLOR.yellow('No MCP servers found.'));
    return;
  }
  const headers = ['STATUS', 'KEY', 'ID', 'NAME', 'COMMAND/TRANSPORT'];
  const rowsRaw = list.map((it) => [
    it.status,
    it.key || '',
    it.id || '',
    it.name || '',
    it.command || it.transport || ''
  ]);
  const widths = headers.map((h, i) => {
    return Math.max(h.length, ...rowsRaw.map((r) => (r[i] || '').length));
  });

  const borderTop = '┌' + widths.map((w) => '─'.repeat(w + 2)).join('┬') + '┐';
  const borderMid = '├' + widths.map((w) => '─'.repeat(w + 2)).join('┼') + '┤';
  const borderBot = '└' + widths.map((w) => '─'.repeat(w + 2)).join('┴') + '┘';

  const pad = (s, w) => String(s).padEnd(w, ' ');

  const headerCols = headers.map((col, i) => COLOR.bold(COLOR.cyan(pad(col, widths[i]))));
  const headerLine = '│ ' + headerCols.join(' │ ') + ' │';

  println(borderTop);
  println(headerLine);
  println(borderMid);

  for (const raw of rowsRaw) {
    const colored = raw.map((col, i) => {
      let val = pad(col, widths[i]);
      if (i === 0) {
        val = col === 'enabled' ? COLOR.green(val) : COLOR.red(val);
      } else if (i === 1) {
        val = COLOR.yellow(val);
      } else if (i === 2) {
        val = COLOR.magenta(val);
      } else if (i === 3) {
        val = COLOR.cyan(val);
      } else if (i === 4) {
        val = COLOR.gray(val);
      }
      return val;
    });
    const line = '│ ' + colored.join(' │ ') + ' │';
    println(line);
  }

  println(borderBot);
}

function printSuggestionsTable(suggestions) {
  const list = suggestions || [];
  if (list.length === 0) {
    println(COLOR.yellow('No suggestions.'));
    return;
  }
  const headers = ['STATUS', 'KEY', 'ID', 'NAME', 'CONTAINER'];
  const rowsRaw = list.map((it) => [
    it.status,
    it.key || '',
    it.id || '',
    it.name || '',
    it.container || ''
  ]);
  const widths = headers.map((h, i) => Math.max(h.length, ...rowsRaw.map((r) => (r[i] || '').length)));

  const borderTop = '┌' + widths.map((w) => '─'.repeat(w + 2)).join('┬') + '┐';
  const borderMid = '├' + widths.map((w) => '─'.repeat(w + 2)).join('┼') + '┤';
  const borderBot = '└' + widths.map((w) => '─'.repeat(w + 2)).join('┴') + '┘';

  const pad = (s, w) => String(s).padEnd(w, ' ');

  const headerCols = headers.map((col, i) => COLOR.bold(COLOR.cyan(pad(col, widths[i]))));
  const headerLine = '│ ' + headerCols.join(' │ ') + ' │';

  println(borderTop);
  println(headerLine);
  println(borderMid);

  for (const raw of rowsRaw) {
    const colored = raw.map((col, i) => {
      let val = pad(col, widths[i]);
      if (i === 0) val = col === 'enabled' ? COLOR.green(val) : COLOR.red(val);
      else if (i === 1) val = COLOR.yellow(val);
      else if (i === 2) val = COLOR.magenta(val);
      else if (i === 3) val = COLOR.cyan(val);
      else if (i === 4) val = COLOR.gray(val);
      return val;
    });
    println('│ ' + colored.join(' │ ') + ' │');
  }

  println(borderBot);
}

function help(args) {
  printBanner();
  const msg = `
${COLOR.bold('Usage:')}
  ccmcp list [--json] [--config PATH] [--no-color]
  ccmcp enable <identifier> [--config PATH] [--dry-run] [--json] [--no-color]
  ccmcp disable <identifier> [--config PATH] [--dry-run] [--json] [--no-color]
  ccmcp --help | --version

Identifier resolution (case-insensitive exact match):
  Priority: id > key > name

Config discovery (in priority order):
  1. --config PATH (explicit override)
  2. ./.claude/.claude.json (project-level user config)
  3. ./.mcp.json (project-level shared config)
  4. $CLAUDE_CONFIG_DIR/settings.json (if CLAUDE_CONFIG_DIR is set)
  5. $CLAUDE_CONFIG_DIR/claude_desktop_config.json
  6. OS defaults:
     - macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
              ~/.claude/settings.json
     - Linux: ~/.config/claude/claude_desktop_config.json
              ~/.claude/settings.json
     - Windows: %APPDATA%/Claude/claude_desktop_config.json
                %USERPROFILE%/.claude/settings.json

Exit codes:
  0 success
  2 no match
  3 ambiguous match
  4 IO or config not found
  5 invalid JSON / unsupported schema
`.trim();
  println(msg);
}

module.exports = {
  COLOR,
  println,
  eprintln,
  printBanner,
  printList,
  printSuggestionsTable,
  help
};
