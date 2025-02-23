// Import the Buoy module for communication
import Buoy from '../src/index.js';

// Main function to demonstrate Buoy client-server interaction
const main = async () => {
  // Create a new Buoy client
  const client = await Buoy({
    name: "test-client",
    version: "1.0.0",
    token: "test-token"
  })

  try {
    // Get reference to undefined agent
    const undefinedTool = client.tool('undefined-agent', '1.0.0', 'request');

    // Make request to the service
    await undefinedTool({num: 5});
  } catch(err) {
    if (err.message.includes('Could not connect to agent')) {
      console.log("Test passed: Caught expected error for undefined agent");
      process.exit(0);
    } else {
      console.error("Test failed: Got unexpected error:", err.message);
      process.exit(1);
    }
  }

  console.error("Test failed: Did not catch expected error");
  process.exit(1);
};

// Execute main function with error handling
main();
