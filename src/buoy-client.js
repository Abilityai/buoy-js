import WebSocket from 'ws';

export class BuoyClient {
  constructor(ws, config) {
    this.ws = ws;
    this.config = config;
    this.requestCallbacks = new Map();
    this.taskHandlers = new Map();
    this.pendingResponses = new Map();
    this.logHandlers = [];
    this.handlers = new Map();
    this.tools = [];
    this.toolsInitialized = false;
    this.pendingToolRequests = [];

    this.ws.on('message', (data) => {
      try {
        this._handleMessage(JSON.parse(data));
      } catch(err) {
        console.error('Error parsing message:', err);
      }
    });
  }

  tool(agentName, version = '*.*.*') {
    return async (action, payload) => {
      if (!this.toolsInitialized) {
        return new Promise((resolve, reject) => {
          this.pendingToolRequests.push({ agentName, version, action, payload, resolve, reject });
        });
      }
      if (!this.tools.some(t => t.agent_name === agentName)) {
        throw new Error(`Agent ${agentName} not found in available tools`);
      }
      const requestId = this._generateRequestId();

      return new Promise((resolve, reject) => {
        this.pendingResponses.set(requestId, { resolve, reject });
        const msg = {
          type: 'request',
          request_id: requestId,
          agent: agentName,
          action,
          version,
          payload
        };
        this.ws.send(JSON.stringify(msg));
      });
    };
  }

  _generateRequestId() {
    return Math.random().toString(36).substring(2, 15);
  }

  say(requestId, message) {
    return new Promise((resolve) => {
      const msg = {
        type: 'say',
        request_id: requestId,
        message
      };
      console.log(`\x1b[32m[LOG] ${message}\x1b[0m`)
      this.ws.send(JSON.stringify(msg));
      resolve();
    });
  }

  ack(requestId, payload) {
    return new Promise((resolve) => {
      const msg = {
        type: 'response',
        request_id: requestId,
        payload
      };
      this.ws.send(JSON.stringify(msg));
      resolve();
    });
  }

  on(actionName, handler) {
    this.taskHandlers.set(actionName, handler);
  }

  logs(handler) {
    this.logHandlers.push(handler);
  }

  async close() {
    if (this.ws) {
      this.ws.close();
    }
  }

  _handleMessage(message) {
    try {
      switch(message.type) {
        case 'tools':
            this.tools = message.tools;
            this.toolsInitialized = true;

            // Process any pending tool requests
            while (this.pendingToolRequests.length > 0) {
              const { agentName, version, action, payload, resolve, reject } = this.pendingToolRequests.shift();
              if (this.tools.some(t => t.agent_name === agentName)) {
                const requestId = this._generateRequestId();
                this.pendingResponses.set(requestId, { resolve, reject });
                const msg = {
                  type: 'request',
                  request_id: requestId,
                  agent: agentName,
                  action,
                  version,
                  payload
                };
                this.ws.send(JSON.stringify(msg));
              } else {
                reject(new Error(`Agent ${agentName} not found in available tools`));
              }
            }
            break;

        case 'request':
          const actionName = message.action;
          const handler = this.taskHandlers.get(actionName);
          if (handler) {
            const say = (msg) => this.say(message.request_id, msg);
            const ack = (payload) => this.ack(message.request_id, payload);

            if (message.confirmationMessage) {
              this.ws.send(JSON.stringify({
                type: 'ack',
                key: message.confirmationMessage
              }));
            }

            handler({
              args: message.payload,
              say,
              ack
            });
          } else {
          }
          break;

        case 'response':
          const pending = this.pendingResponses.get(message.request_id);
          if (pending) {
            if (message.error) {
              pending.reject(new Error(message.error));
            } else {
              pending.resolve(message.payload);
            }
            this.pendingResponses.delete(message.request_id);
          } else {
          }

          if (message.confirmationMessage) {
            this.ws.send(JSON.stringify({
              type: 'ack',
              key: message.confirmationMessage
            }));
          }
          break;

        case 'say':
          if (message.confirmationMessage) {
            this.ws.send(JSON.stringify({
              type: 'ack',
              key: message.confirmationMessage
            }));
          }
          this.logHandlers.forEach(handler => handler({
            request_id: message.request_id,
            message: message.message,
            from: message.from,
            timestamp: message.timestamp
          }));
          break;

        default:
          console.log(`Unknown message type: ${message.type}`);
      }
    } catch (err) {
      console.error('Error handling message:', err);
    }
  }
}
