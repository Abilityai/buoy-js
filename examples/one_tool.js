// Middleware agent that receives count and makes that many requests to random number generator
import Buoy from '../src/index.js';

const main = async () => {
  const client = await Buoy.connect({
    token: 'repeater-token',
    name: 'repeater',
    version: '1.0.0',
    agents: [{
      name: 'random',
      version: '1.0.0',
      actions: ['generate']
    }],
    actions: [
      {
        name: 'repeat',
        description: 'Repeats the request to generate random numbers',
        tool: true,
        parameters: {
          type: 'object',
          properties: {
            count: {
              type: 'integer',
              description: 'Number of times to repeat the request'
            }
          },
          required: ['count']
        }
      }
    ]
  });

  // Create tool function for the random number generator
  const randomAgent = client.tool('random', '1.0.0');

  client.on('repeat', async ({ args: { count }, ack, say }) => {
    await say(`Received request to generate ${count} random numbers`);

    try {
      // Launch all requests in parallel
      const promises = Array.from({ length: count }, (_, i) => {
        say(`Requesting random number ${i + 1} of ${count}`);
        return randomAgent('generate', { from: 0, to: 100 });
      });

      // Wait for all requests to complete
      const results = await Promise.all(promises);
      const numbers = results.map(result => result.number);

      const numbersStr = numbers.join(', ');
      await say(`Collected all ${count} numbers: ${numbersStr}`);
      await ack({ numbers: numbersStr });
    } catch (err) {
      await say(`Error occurred: ${err.message}`);
      throw err;
    }
  });

  console.log('Repeater agent ready to process requests');
};

main().catch(console.error);
