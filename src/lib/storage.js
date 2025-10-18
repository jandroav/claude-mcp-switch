const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Storage for disabled MCP server configurations
 * This allows us to preserve server config when disabling via `claude mcp remove`
 * and restore it when re-enabling via `claude mcp add`
 */

const STORAGE_DIR = path.join(os.homedir(), '.claude-mcp-switch');
const STORAGE_FILE = path.join(STORAGE_DIR, 'disabled-servers.json');

function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

function readStorage() {
  ensureStorageDir();
  if (!fs.existsSync(STORAGE_FILE)) {
    return {};
  }
  try {
    const data = fs.readFileSync(STORAGE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

function writeStorage(data) {
  ensureStorageDir();
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Store a disabled server's configuration
 * @param {string} name - Server name
 * @param {Object} config - Server configuration from claude mcp get
 */
function storeDisabledServer(name, config) {
  const storage = readStorage();
  storage[name] = {
    ...config,
    disabledAt: new Date().toISOString()
  };
  writeStorage(storage);
}

/**
 * Get a disabled server's configuration
 * @param {string} name - Server name
 * @returns {Object|null} Server config or null if not found
 */
function getDisabledServer(name) {
  const storage = readStorage();
  return storage[name] || null;
}

/**
 * Remove a disabled server's configuration
 * @param {string} name - Server name
 */
function removeDisabledServer(name) {
  const storage = readStorage();
  delete storage[name];
  writeStorage(storage);
}

/**
 * List all disabled servers
 * @returns {Array} Array of {name, config} objects
 */
function listDisabledServers() {
  const storage = readStorage();
  return Object.entries(storage).map(([name, config]) => ({
    name,
    config
  }));
}

module.exports = {
  storeDisabledServer,
  getDisabledServer,
  removeDisabledServer,
  listDisabledServers
};
