class BuoyClient {
  constructor(ws, config, onHello) {
    this.ws = ws;
    this.config = config;
    this.requestCallbacks = new Map();
    this.taskHandlers = new Map();
    this.pendingResponses = new Map();
    this.handlers = new Map();
    this.receivedHello = false;
    this.pendingSayFns = new Map();

    this.ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'hello') {
          if (!this.receivedHello) {
            this.receivedHello = true;
            onHello();
          }
          return;
        }
        await this._handleMessage(message);
      } catch(err) {
        console.error('Error parsing message:', err);
      }
    });
  }

  get name() {
    return this.config.name;
  }

  get version() {
    return this.config.version;
  }

  /**
   * Create a tool function that makes requests to another agent
   * @param {string} agent - Agent name
   * @param {string} version - Agent version
   * @param {string} action - Action name to invoke
   * @returns {Function} Tool function
   */
  tool(agent, version, action) {
    const toolObject = async (payload, ...args) => {
      let request_ids = undefined;
      let say_fn = () => {};
      let title = action; // Default title to action name

      for (const arg of args) {
        if (typeof arg === 'function') {
          say_fn = arg;
        } else if (typeof arg === 'string') {
          title = arg; // If string is provided, use as title
        } else {
          request_ids = arg;
        }
      }

      const request_id = this._generateRequestId();

      return new Promise((resolve, reject) => {
        this.pendingResponses.set(request_id, { resolve, reject });
        this.pendingSayFns.set(request_id, say_fn);
        this.ws.send(JSON.stringify({
          type: 'request',
          request_id,
          request_ids,
          agent,
          action,
          version,
          payload,
          title
        }));
      });
    };

    toolObject.toJSON = () => {
      const request_id = this._generateRequestId();

      return new Promise((resolve, reject) => {
        this.pendingResponses.set(request_id, { resolve, reject });
        this.ws.send(JSON.stringify({
          type: 'seek',
          request_id,
          agent,
          action,
          version
        }));
      });
    };

    return toolObject;
  }

  _generateRequestId() {
    return Math.random().toString(36).substring(2, 15);
  }

  async ack({ request_id: requestId, confirmationMessage }, payload) {
    return new Promise((resolve) => {
      this.ws.send(JSON.stringify({
        type: 'response',
        request_id: requestId,
        key: confirmationMessage,
        payload
      }));
      resolve();
    });
  }

  on(actionName, handler) {
    this.taskHandlers.set(actionName, handler);
  }

  async confirm({ confirmationMessage }) {
    if (!confirmationMessage) return;
    this.ws.send(JSON.stringify({
      type: 'ack',
      key: confirmationMessage
    }));
  }

  async close() {
    await this.ws.close();
  }

  async _handleMessage(m) {
    try {
      switch(m.type) {
        case 'tools':
          break;

        case 'info':
        // deprecated - info messages are no longer used
          const pendingInfo = this.pendingResponses.get(m.request_id);
          if (pendingInfo) {
            pendingInfo.resolve(m.payload);
            this.pendingResponses.delete(m.request_id);
          }
          break;

        case 'request':
          const actionName = m.action;
          const agent = m.agent;
          const handler = this.taskHandlers.get(actionName);
          const requestIds = m.request_ids || []
          /**
           * Send a message during task execution
           * @param {string|object} msg - Message content or object with text property
           * @param {string} [title] - Optional title for the message
           */
          const say = (msg, title) => this.ws.send(JSON.stringify({
            type: 'say',
            request_ids: requestIds,
            message: msg,
            title
          }));
          const ack = (payload) => this.ack(m, payload);

          const confirmationMessage = m.confirmationMessage;

          if (handler) {
            handler(
              { ...m.payload },
              { say, parent: requestIds }
            ).then(ack).catch((err) => {
              console.error(`Error in task handler for action '${actionName}':`, err);
              this.ws.send(JSON.stringify({
                type: 'failure',
                request_id: m.request_id,
                request_ids: requestIds,
                key: confirmationMessage,
                error: `Error in ${agent.name}/${agent.version}#${actionName}: ${err.message}`
              }));
            });
          } else {
            console.error(`No handler found for ${agent.name}/${agent.version}#${actionName}`);
            this.confirm(m);
            this.ws.send(JSON.stringify({
              type: 'failure',
              request_id: m.request_id,
              request_ids: requestIds,
              key: confirmationMessage,
              error: `No handler found for ${agent.name}/${agent.version}#${actionName}`
            }));
          }
          break;

        case 'response':
          const pendingResponse = this.pendingResponses.get(m.request_id);
          if (pendingResponse) {
            pendingResponse.resolve(m.payload);
            this.pendingResponses.delete(m.request_id);
          }
          this.pendingSayFns.delete(m.request_id);
          this.confirm(m);
          break;

        case 'failure':
          console.error(`Failure message received: ${m.error}`);
          const pendingError = this.pendingResponses.get(m.request_id);
          if (pendingError) {
            pendingError.reject(new Error(m.error));
            this.pendingResponses.delete(m.request_id);
          }
          this.pendingSayFns.delete(m.request_id);
          this.confirm(m);
          break;

          case 'say':
            const reqIds = Array.isArray(m.request_ids) ? m.request_ids : [m.request_ids];
            reqIds
              .map((i) => this.pendingSayFns.get(i))
              .filter(Boolean)
              .map((sayFn) => {
                // Process message based on format (legacy string or new structured format)
                let messageToPass;
                if (typeof m.message === 'string') {
                  // Legacy format: just a string
                  messageToPass = m.message;
                } else if (m.message && typeof m.message === 'object') {
                  // New format: object with text and chain
                  messageToPass = m.message;
                  if (typeof messageToPass.text === 'string' && !('message' in messageToPass)) {
                    // If there's only 'text' property but no 'message', create backward compatibility
                    messageToPass.message = messageToPass.text;
                  }
                } else {
                  // Fallback for any other case
                  messageToPass = m.message;
                }
                // Pass the entire message object to the callback
                sayFn(messageToPass);
              });
            this.confirm(m);
            break;

        default:
          console.log(`Unknown message type: ${m.type}`);
      }
    } catch (err) {
      console.error('Error handling message:', err);
    }
  }
}
export default async function(ws, config) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Connection timeout - no hello message received'));
    }, 5000);

    const client = new BuoyClient(ws, config, () => {
      clearTimeout(timeoutId);
      resolve(client);
    });
  });
}
