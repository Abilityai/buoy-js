// Parent agent that accepts user input and coordinates the process
import Buoy from '../src/index.js';
import readline from 'readline';

const main = async () => {
  const client = await Buoy.connect({
    token: 'parent-token',
    name: 'parent',
    version: '1.0.0',
    actions: [],
    agents: [{
      name: 'repeater',
      version: '1.0.0',
      actions: ['repeat', 'forward']
    }]
  });

  // Create tool function for the middleware agent
  const repeaterAgent = client.tool('repeater', '1.0.0');

  // Set up logging to console
  client.logs(({ message }) => {
    console.log(`\x1b[34m -> ${message}\x1b[0m`);
  });

  // Create readline interface for user input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('Enter a number to start the process (or "q" to quit):');

  rl.on('line', async (input) => {
    const cmd = input.toLowerCase();
    if (cmd === 'quit' || cmd === 'q' || cmd === 'exit') {
      rl.close();
      process.exit(0);
    }

    const number = parseInt(input);
    if (isNaN(number) || number < 1) {
      console.log('Please enter a valid positive number');
      return;
    }

    console.log('Starting process with number: ' + number);

    try {
      const result = await repeaterAgent('repeat', { count: number });
      console.log('Result:', result.numbers);
      console.log('\nEnter another number (or "quit"/"q"/"exit" to quit):');
    } catch (err) {
      console.log('Error occurred: ' + err.message);
      console.error('Error:', err.message);
    }
  });
};

main().catch(console.error);
