import Buoy from '../src/index.js';

const main = async () => {
  // Create a new Buoy client
  const client = await Buoy({
    name: "test-client",
    version: "1.0.0",
    token: "test-token",
    actions: {
      name: 'test',
      description: 'Test action',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Test message'
          }
        },
        required: ['message']
      }
    }
  });

  try {
    // Try to register handler with invalid actions schema
    client.on('test', async ({message}) => {
      console.log(message);
    });
  } catch (err) {
    console.log('Error:', err);
  }
};

main().catch(console.error).finally(() => process.exit(0));
