const os = require('os');
const path = require('path');

function expandHome(p) {
  if (!p) return p;
  if (p.startsWith('~')) {
    return path.join(os.homedir(), p.slice(1));
  }
  return p;
}

function truncate(s, n) {
  if (!s) return s;
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function safeStr(x) {
  if (x === null || x === undefined) return '';
  return String(x);
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

function detectPlatform() {
  const pf = process.platform;
  if (pf === 'darwin') return 'mac';
  if (pf === 'linux') return 'linux';
  if (pf === 'win32') return 'win';
  return 'other';
}

module.exports = {
  expandHome,
  truncate,
  safeStr,
  nowStamp,
  detectPlatform
};
