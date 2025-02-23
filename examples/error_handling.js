import Buoy from '../src/index.js';

// Create the error agent
const errorAgent = async () => {
  const client = await Buoy({
    name: 'parent',
    version: '3.12.4',
    token: 'parent-token',
    actions: [{
      name: 'fail',
      description: 'Always fails with given message',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Error message to throw'
          },
        },
        required: ['message']
      }
    }]
  });

  client.on('fail', async ({message}, {say}) => {
    await say(`About to fail with message: ${message}`);
    throw new Error(message);
    return
  });
};

const main = async () => {
  // Start error agent
  errorAgent();

  // Create test client
  const client = await Buoy({
    name: "test-client",
    version: "1.0.0",
    token: "test-token"
  });

  const errorTool = client.tool('parent', '3.12.4', 'fail');

  console.log("Testing error handling...");
  result = await errorTool({message: "Test error message"});

  console.log("All error handling tests passed!");
};

main().catch(console.error).finally(() => process.exit(0));
