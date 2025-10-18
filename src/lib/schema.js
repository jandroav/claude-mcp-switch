const { safeStr, truncate } = require('./utils');
const { jsonErr } = require('./config');

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

module.exports = {
  detectSchema,
  enumerateServers,
  ensureContainers,
  performEnable,
  performDisable,
  packItem,
  briefCommand,
  briefTransport
};
