const fs = require('fs');
const os = require('os');
const path = require('path');
const { expandHome, nowStamp, detectPlatform } = require('./utils');

const EX_IO = 4;
const EX_JSON = 5;

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

function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
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
    } else if (plat === 'win') {
      const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
      out.push(path.join(appData, 'Claude', 'claude_desktop_config.json'));
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
    if (e.codeEx) throw e; // Already wrapped
    throw ioErr(`Unable to read file ${p}: ${e.message}`);
  }
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

module.exports = {
  EX_IO,
  EX_JSON,
  ioErr,
  jsonErr,
  fileExists,
  candidateConfigPaths,
  resolveConfigPath,
  readJson,
  backupFile,
  writeJsonAtomic
};
