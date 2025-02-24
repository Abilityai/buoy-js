import Buoy from '../src/index.js';

const requestor = async () => {
  console.log('Requestor...');
  const client = await Buoy({
    token: 'parent-token',
    name: 'parent',
    version: '1.0.0',
    description: 'Parent service that handles number processing requests',
    readme: '# Parent Service\n\nThis service handles number processing requests by coordinating with other services.\n\n## Features\n- Processes numeric requests\n- Coordinates with repeater service\n- Returns joined results',
    actions: [{
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
    }]
  });

  const joinerTool = client.tool('repeater', '1.0.2', 'join');

  client.on('request', async ({num}, {say, parent}) => {
    await say(`Processing request for number: ${num}`);
    const result = await joinerTool({count: num}, parent, (msg) => console.log(`[REQ1] ${msg}`));
    return {result: result.result};
  });
};

const joiner = async () => {
  console.log('Joiner...');
  const client = await Buoy({
    name: 'repeater',
    version: '1.0.2',
    token: 'repeater-token',
    description: 'Service that joins multiple random numbers',
    readme: '# Repeater Service\n\nThis service generates and joins multiple random numbers.\n\n## Features\n- Generates multiple random numbers\n- Joins numbers into comma-separated string\n- Coordinates with randomizer service',
    actions: [{
      name: 'join',
      description: 'Makes multiple random number requests and joins results',
      parameters: {
        type: 'object',
        properties: {
          count: {
            type: 'integer',
            description: 'Number of random numbers to generate'
          }
        },
        required: ['count']
      }
    }]
  });

  const randomizerTool = client.tool('random', '1.1.0', 'randomize');

  client.on('join', async ({count}, {say, parent}) => {
    await say(`Generating ${count} random numbers`);

    const promises = Array(count).fill().map(() =>
      randomizerTool({
        lower: 1,
        upper: 100
      }, parent, (msg) => console.log(`[JOIN] ${msg}`))
    );
    const results = await Promise.all(promises);
    const numbers = results.map(result => result.result);

    await say(`Joining ${count} numbers`);
    return {result: numbers.join(',')};
  });
};

const randomizer = async () => {
  console.log('Randomizer...');
  const client = await Buoy({
    name: 'random',
    version: '1.1.0',
    token: 'random-token',
    description: 'Service that generates random numbers within bounds',
    readme: '# Random Number Generator\n\nThis service generates random numbers within specified bounds.\n\n## Features\n- Generates random integers\n- Configurable upper and lower bounds\n- Returns single random number per request',
    actions: [{
      name: 'randomize',
      description: 'Generates a random number between lower and upper bounds',
      parameters: {
        type: 'object',
        properties: {
          lower: {
            type: 'number',
            description: 'Lower bound for random number'
          },
          upper: {
            type: 'number',
            description: 'Upper bound for random number'
          }
        },
        required: ['lower', 'upper']
      }
    }]
  });

  client.on('randomize', async ({lower, upper}, {say}) => {
    const result = Math.floor(Math.random() * (upper - lower + 1)) + lower;
    await say(`Generated random number between ${lower} and ${upper}: ${result}`);
    return {result};
  });
};

const main = async () => {
  requestor();
  joiner();
  randomizer();

  await new Promise(resolve => setTimeout(resolve, 1000));

  const client = await Buoy({
    name: "test-client",
    version: "1.0.0",
    token: "test-token",
    description: "Test client for testing the number processing pipeline",
    readme: "# Test Client\n\nClient for testing the number processing pipeline.\n\n## Usage\nGenerates random test cases and validates results."
  })

  const requestorTool = client.tool('parent', '1.0.0', 'request');

  const n = Math.floor(Math.random() * 5) + 1;

  const result = await requestorTool({ num: n }, (msg) => console.log(`[TEST] ${msg}`));
  const numbers = result.result.split(',').map(Number);

  if (numbers.length !== n) {
    throw new Error(`Expected ${n} numbers, got ${numbers.length}`);
  }

  if (numbers.some(isNaN)) {
    throw new Error(`Received NaN in numbers: ${numbers}`);
  }

  console.log(`Received ${n} numbers: ${numbers}`);
};

main().catch(console.error).finally(() => process.exit(0));
