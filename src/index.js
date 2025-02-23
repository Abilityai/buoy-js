import dotenv from 'dotenv';
dotenv.config();

import WebSocket from 'ws';
import axios from 'axios';
import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

import getConfig from './config.js';
import BuoyClient from './buoy-client.js';

export default async function Buoy(config1, config2 = {}) {
  const { name, version, token, actions, wsUrl, httpUrl } = getConfig(config1, config2);

  const payload = { name, version, actions };
  const headers = { token, payload: JSON.stringify(payload) };

  return new Promise((resolve, reject) => {
    let ws;
    let isFirstConnection = true;
    let closedByUser = false;

    const eventHandlers = {
      open: [],
      message: [],
      close: [],
      error: []
    };

    const wsProxy = {
      on(eventName, handler) {
        if (!eventHandlers[eventName]) {
          eventHandlers[eventName] = [];
        }
        eventHandlers[eventName].push(handler);

        if (ws) {
          ws.on(eventName, handler);
        }
      },
      send(data) {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        } else {
          console.error('Attempted to send on a closed or not-yet-open WebSocket');
        }
      },
      close() {
        closedByUser = true;
        if (ws) {
          ws.close();
        }
      }
    };

    function attachHandlers(newWs) {
      for (const [eventName, handlers] of Object.entries(eventHandlers)) {
        handlers.forEach(h => newWs.on(eventName, h));
      }
    }

    async function pingServer({ payload, token }) {
      try {
        const response = await axios.get(`${httpUrl}/ping`, {
          headers: {
            token,
            payload: JSON.stringify(payload)
          }
        });
        if (response.status === 200) {
          if (response.data === 'pong') {
            return true;
          } else {
            return 'Server returned invalid response: ' + response.data;
          }
        }
        return false;
      } catch (err) {
        console.error('Ping failed:', err.message);
        return false;
      }
    }

    async function createWebSocket({ payload, token }) {
      // First check if server is available
      const serverStatus = await pingServer({ payload, token });
      if (typeof serverStatus === 'string') {
        reject(new Error(serverStatus));
        return;
      }
      if (serverStatus === false) {
        setTimeout(() => createWebSocket({ payload, token }), 1000);
        return;
      }

      ws = new WebSocket(wsUrl, { headers });

      ws.on('open', async () => {
        if (isFirstConnection) {
          isFirstConnection = false;
          const buoyClient = await BuoyClient(wsProxy, payload);
          resolve(buoyClient);
        }
      });

      ws.on('close', () => {
        ws = null;
        if (!closedByUser) {
          setTimeout(() => {createWebSocket({ payload, token }) }, 1000);
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        if (isFirstConnection) {
          reject(error);
        }
      });

      attachHandlers(ws);
    }

    createWebSocket({ payload, token });
  });
}
