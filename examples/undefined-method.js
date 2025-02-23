// Import the Buoy module for communication
import Buoy from '../src/index.js';

// Define requestor function that sets up a Buoy client as a service provider
const requestor = async () => {
  const client = await Buoy({
    token: 'parent-token',
    name: 'parent',
    version: '1.0.0',
    actions: [
      {
        name: 'request',
        description: 'Makes a request with a number',
        parameters: {
          type: 'object',
          properties: {
            num: {
              type: 'integer',
              description: 'Number to process'
            }
          },
          required: ['num']
        }
      }
    ]
  });

  // Set up request handler that returns a static result
  client.on('request', async ({num}, {say, request_id}) => {
    return { result: '1' };
  });
};

// Main function to demonstrate Buoy client-server interaction
const main = async () => {
  // Start the requestor service
  requestor();

  // Create a new Buoy client
  const client = await Buoy({
    name: "test-client",
    version: "1.0.0",
    token: "test-token"
  })

  // Get reference to the requestor service
  const requestorTool = client.tool('parent', '1.0.0', 'unknown');

  // Generate random number between 1-100
  const n = Math.floor(Math.random() * 100) + 1;

  // Make request to the service
  const result = await requestorTool({num: n});
  const numbers = result.result.split(',').map(Number);

  // Validate response has correct number of values
  if (numbers.length !== n) {
    throw new Error(`Expected ${n} numbers, got ${numbers.length}`);
  }

  // Validate all values are valid numbers
  if (numbers.some(isNaN)) {
    throw new Error(`Received NaN in numbers: ${numbers}`);
  }

  // Log the successful result
  console.log(`Received ${n} numbers: ${numbers}`);
};

// Execute main function with error handling and cleanup
main().catch(console.error).finally(() => process.exit(0));
