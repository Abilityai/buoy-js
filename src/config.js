import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

/**
 * Configuration utilities for Buoy agent
 */

/* Constants and configuration for base URLs */
const DEFAULT_DOMAIN = 'localhost';
const DEFAULT_PORT = 3005;

/* Documentation comments for key config properties:
 * @config {string|Object} config1 - Agent name as string, or config object
 * @config {Object} config2 - Optional additional config properties to merge with config1
 * @config {string} config.domain - Server domain name, default localhost
 * @config {number} config.port - Server port number, default 3005
 * @config {string} config.token - Auth token for connecting to server
 * @config {string} config.name - Agent name
 * @config {string} config.version - Agent version
 * @config {Object[]} config.actions - Array of agent action definitions
 * @config {string} config.ws_protocol - WebSocket protocol ('ws'/'wss')
 * @config {string} config.http_protocol - HTTP protocol ('http'/'https')
 * @config {string} config.ws_url - Full WebSocket URL override
 * @config {string} config.http_url - Full HTTP URL override
 */

/**
 * Main configuration setup. Combines config parameters, validates
 * required fields, and extracts the final configuration options.
 *
 * @param {string|Object} config1 - Initial config
 * @param {Object} config2 - Additional config to merge
 * @returns {Object} Full agent configuration object
 */
export default function getConfig(config1, config2 = {}) {
  let config = {};
  if (typeof config1 === 'string') {
    config = { name: config1 };
  } else {
    config = { ...config1 };
  }
  if (config2 && typeof config2 === 'object') {
    config = { ...config, ...config2 };
  }

  const domain = config.domain || process.env.JUNCTION_DOMAIN || DEFAULT_DOMAIN;
  const port = config.port || process.env.JUNCTION_PORT || DEFAULT_PORT;

  const host = getHost({ domain, port });
  const wsProtocol = getWsProtocol({ port, config });
  const httpProtocol = getHttpProtocol({ port, config });

  const wsUrl = getWsUrl({ host, wsProtocol, config });
  const httpUrl = getHttpUrl({ host, httpProtocol, config });

  const name = getAgentName(config);
  const version = getAgentVersion(config);
  const token = config.token || process.env.AGENT_TOKEN || process.env.BUOY_TOKEN;
  const actions = getActions(config);
  const description = getDescription(config);
  const readme = getReadme(config);

  if (!token) throw new Error('Agent token is required');

  return {
    name,
    version,
    token,
    actions,
    wsUrl,
    httpUrl,
    description,
    readme,
  };
}

function getHost({ domain, port }) {
  if (port === 80 || port === 443) {
    return domain;
  }
  return `${domain}:${port}`;
}

function getWsProtocol({ port, config }) {
  if (config.ws_protocol) {
    return config.ws_protocol;
  } else if (process.env.JUNCTION_WS_PROTOCOL) {
    return process.env.JUNCTION_WS_PROTOCOL;
  } else {
    return port === 443 ? 'wss' : 'ws';
  }
}

function getHttpProtocol({ port, config }) {
  if (config.http_protocol) {
    return config.http_protocol;
  } else if (process.env.JUNCTION_HTTP_PROTOCOL) {
    return process.env.JUNCTION_HTTP_PROTOCOL;
  } else {
    return port === 443 ? 'https' : 'http';
  }
}

function getWsUrl({ host, wsProtocol, config }) {
  return config.ws_url || process.env.JUNCTION_WS_URL || `${wsProtocol}://${host}/connection`;
}

function getHttpUrl({ host, httpProtocol, config }) {
  return config.http_url || process.env.JUNCTION_HTTP_URL || `${httpProtocol}://${host}`;
}

function getAgentName(config) {
  let name = config.name || process.env.AGENT_NAME;
  if (!name) {
    try {
      const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json')));
      name = packageJson.name;
    } catch (err) {
      console.error('Error reading package.json:', err);
      throw new Error('Agent name is required');
    }
  }
  return name;
}

function getAgentVersion(config) {
  let version = config.version || process.env.AGENT_VERSION;
  if (!version) {
    try {
      const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json')));
      version = packageJson.version;
    } catch (err) {
      console.error('Error reading package.json:', err);
      throw new Error('Agent version is required');
    }
  }
  return version;
}

function getActions(config) {
  return config.actions || (() => {
    try {
      return yaml.load(readFileSync(join(process.cwd(), 'actions.yml'), 'utf8')) || [];
    } catch (err) {
      return [];
    }
  })();
}

function getReadme({ readme }) {
  if (readme) {
    return readme;
  }

  const baseNames = ['readme.md', 'readme.markdown', 'readme.txt', 'readme'];
  const files = readdirSync(process.cwd());

  for (const baseName of baseNames) {
    const matchingFile = files.find(file => file.toLowerCase() === baseName);
    if (matchingFile) {
      try {
        return readFileSync(join(process.cwd(), matchingFile), 'utf8');
      } catch (err) {
        continue;
      }
    }
  }

  return '';
}

function getDescription({ description }) {
  if (description) {
    return description;
  }

  try {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json')));
    return packageJson.description || '';
  } catch (err) {
    console.error('Error reading package.json:', err);
    return '';
  }
}
