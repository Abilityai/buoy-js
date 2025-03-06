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
const client = await Buoy({
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
client.on('myaction', async (payload, { say }) => {
  await say(`Processing ${payload.param1}`);
  return { result: 'done' };
});

// Call other agent tools
const otherTool = client.tool('otheragent', '1.4.3', 'dostuff');
const result = await otherTool({
  data: 'example'
});

// Call a tool with say function to receive progress updates
const result2 = await otherTool(
  { data: 'example' },
  (message) => console.log(message)
);

// Call a tool with request_ids to link tasks
const requestIds = ["request123"];
const result3 = await otherTool(
  { data: 'example' },
  requestIds
);

// Call with both a say function and title
const result4 = await otherTool(
  { data: 'example' },
  "Operation Title",
  (message) => console.log(message)
);
```

## Configuration

The `Buoy()` function accepts a config object with the following options:

- `token` - Agent authentication token (required, falls back to AGENT_TOKEN or BUOY_TOKEN env var)
- `name` - Agent name identifier (falls back to package.json name)
- `version` - Agent version (falls back to package.json version)
- `actions` - Array of action definitions (falls back to actions.yml file)
- `domain` - Server domain (defaults to JUNCTION_DOMAIN env var or 'localhost')
- `port` - Server port (defaults to JUNCTION_PORT env var or 3005)
- `host` - Combined domain:port string (alternative to separate domain and port)
- `ws_protocol` - WebSocket protocol ('ws' or 'wss', defaults based on port)
- `http_protocol` - HTTP protocol ('http' or 'https', defaults based on port)
- `ws_url` - Custom WebSocket URL (defaults to JUNCTION_WS_URL env var or protocol://domain:port/connection)
- `http_url` - Custom HTTP URL (defaults to JUNCTION_HTTP_URL env var or protocol://domain:port)
- `description` - Agent description (falls back to package.json description)
- `readme` - Agent documentation in markdown (falls back to readme file in current directory)

## API Reference

### Client Methods

- `on(actionName, handler)` - Register an action handler
- `tool(agentName, version, action)` - Get tool executor for an agent
- `close()` - Close the connection

### Handler Parameters

Action handlers receive:

- First parameter: The payload object with input parameters
- Second parameter: Context object with:
  - `say(message, title)` - Send a progress message with optional title
  - `parent` - Array of parent request IDs

The handler should return a value or a Promise that resolves to a value as the response.

### Tool Function

The tool function returned by `client.tool()` accepts:
- First parameter (required): The payload object to send
- Additional parameters (optional):
  - A callback function to receive progress messages
  - A string to use as the operation title
  - An array of request IDs for linking related tasks

## Environment Variables

- `JUNCTION_HOST` - Combined domain:port (takes precedence over separate domain/port)
- `JUNCTION_DOMAIN` - Server domain (defaults to 'localhost')
- `JUNCTION_PORT` - Server port (defaults to 3005)
- `JUNCTION_WS_PROTOCOL` - WebSocket protocol ('ws' or 'wss', defaults based on port)
- `JUNCTION_HTTP_PROTOCOL` - HTTP protocol ('http' or 'https', defaults based on port)
- `JUNCTION_WS_URL` - Full WebSocket URL (defaults to protocol://domain:port/connection)
- `JUNCTION_HTTP_URL` - Full HTTP URL (defaults to protocol://domain:port)
- `AGENT_TOKEN` or `BUOY_TOKEN` - Agent authentication token
- `AGENT_NAME` - Agent name identifier
- `AGENT_VERSION` - Agent version

## Error Handling

```javascript
try {
  const client = await Buoy(config);
} catch(err) {
  // Connection errors
}

client.on('action', async (payload, { say }) => {
  try {
    // Handle task
    return result;
  } catch(err) {
    // Task errors
    await say(`Error: ${err.message}`);
    throw err;
  }
});
```
