import WebSocket from 'ws';
import axios from 'axios';
import { readFileSync } from 'fs';
import { join } from 'path';

import { BuoyClient } from './buoy-client.js';

class Buoy {
  static async connect(config = {}) {
    const wsUrl = config.ws_url || process.env.JUNCTION_WS_URL || 'ws://localhost:3005/connection';
    const httpUrl = config.http_url || process.env.JUNCTION_HTTP_URL || 'http://localhost:3005';
    const token = config.token || process.env.AGENT_TOKEN;
    const name = config.name || process.env.AGENT_NAME;
    let version = config.version || process.env.AGENT_VERSION;

    if (!token) throw new Error('Agent token is required');
    if (!name) throw new Error('Agent name is required');

    if (!version) {
      try {
        const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json')));
        version = packageJson.version;
      } catch (err) {
        console.error('Error reading package.json:', err);
        throw new Error('Agent version is required');
      }
    }

    const response = await axios.get(`${httpUrl}/ping`);
    if (response.status !== 200 || response.data !== 'pong') {
      console.error('Failed to ping Junction server:', response.status, response.data);
      throw new Error('Junction server is not available');
    }

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl, {
        headers: {
          token,
          payload: JSON.stringify({
            name,
            version,
            actions: config.actions || [],
            agents: config.agents || []
          })
        }
      });

      ws.on('open', () => {
        resolve(new BuoyClient(ws, { token, name, version }));
      });

      ws.on('error', (error) => {
        console.error('WebSocket connection error:', error);
        reject(error);
      });
    });
  }
}

export default Buoy;
