// Simple agent that generates random numbers
import Buoy from '../src/index.js';

const main = async () => {
  const client = await Buoy.connect({
    token: 'random-token',
    name: 'random',
    version: '1.0.0',
    actions: [
      {
        name: 'generate',
        description: 'Generate a random number',
        tool: true,
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    ]
  });

  client.logs(({ message }) => {
    console.log(`\x1b[34m -> ${message}\x1b[0m`);
  });

  client.on('generate', async ({ args: { from = -100, to = 100 }, ack, say }) => {
    const number = Math.floor(Math.random() * (to - from + 1)) + from;
    await say(`Generated random number between ${from} and ${to}: ${number}`);
    await ack({ number });
  });

  console.log('Random number generator agent ready');
};

main().catch(console.error);
