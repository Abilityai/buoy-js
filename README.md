# BUOY for Junction

Buoy is a JavaScript client library for interacting with Junction middleware servers,
enabling easy integration of distributed agents into JavaScript applications.
It provides a simple interface for real-time task execution, logging, and agent communication.

## Features

- Easy WebSocket connection to Junction servers
- Version-based agent routing
- Request/response patterns with promises
- Real-time logging
- Tool execution across agents
- Automatic message acknowledgment
- Simple API for defining agent actions
- Support for parallel task execution

## Installation

```bash
npm install buoy-client
```

## Basic Usage

```javascript
import Buoy from 'buoy-client';

// Connect to Junction server
const client = await Buoy.connect({
  token: 'agent-token',
  name: 'myagent',
  version: '1.0.0',
  actions: [
    {
      name: 'myaction',
      description: 'Does something',
      tool: true,
      parameters: {
        type: 'object',
        properties: {
          param1: {
            type: 'string',
            description: 'First parameter'
          }
        },
        required: ['param1']
      }
    }
  ]
});

// Handle incoming tasks
client.on('myaction', async ({ args, say, ack }) => {
  await say(`Processing ${args.param1}`);
  await ack({ result: 'done' });
});

// Call other agent tools
const otherAgent = client.tool('otheragent', '1.4.3', 'dostuff');
const result = await otherAgent({
  data: 'example'
});

// or if it is subtask
const otherAgent2 = await client.tool('otheragent', '0.14.1', 'dostuff');
const result2 = await otherAgent2({
  data: 'example'
}, parent_request_id);

// Log messages
client.logs(({ message, from, timestamp }) => {
  console.log(`[${timestamp}] ${from}: ${message}`);
});
```

## Configuration

The `connect()` method accepts the following options:

- `token` - Agent authentication token
- `name` - Agent name identifier
- `version` - Agent version (semver format)
- `actions` - Array of action definitions
- `ws_url` - Custom WebSocket URL (defaults to env JUNCTION_WS_URL)
- `http_url` - Custom HTTP URL (defaults to env JUNCTION_HTTP_URL)

## API Reference

### Client Methods

- `connect(config)` - Connect to Junction server
- `tool(agentName, version, action)` - Get tool executor for an agent
- `say(requestId, message)` - Log a message
- `ack(requestId, payload)` - Acknowledge a request with response
- `on(handler)` - Register an action handler
- `logs(handler)` - Register a log handler
- `close()` - Close the connection

### Handler Parameters

Action handlers receive:

- `args` - Action parameters
- `say(message)` - Log a message
- `ack(payload)` - Send response

Log handlers receive:

- `request_id` - Request identifier
- `message` - Log message
- `from` - Source agent
- `timestamp` - Message timestamp

## Examples

See the `/examples` directory for more detailed usage examples:

- `simple.js` - Basic random number generator agent
- `one_tool.js` - Agent using another agent's tool
- `several_tools.js` - Complex workflow with multiple agents

## Error Handling

```javascript
try {
  const client = await Buoy.connect(config);
} catch(err) {
  // Connection errors
}

client.on('action', async ({ say, ack }) => {
  try {
    // Handle task
    await ack(result);
  } catch(err) {
    // Task errors
    await say(`Error: ${err.message}`);
    throw err;
  }
});
```

## Environment Variables

- `JUNCTION_WS_URL` - WebSocket URL
- `JUNCTION_HTTP_URL` - HTTP URL
- `AGENT_TOKEN` - Default agent token
- `AGENT_NAME` - Default agent name
- `AGENT_VERSION` - Default agent version

## License

MIT License
