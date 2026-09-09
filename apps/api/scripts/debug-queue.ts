console.log('A: start');
import('dotenv/config');
console.log('B: dotenv');
const mod = await import('./src/queue/webhook.queue.js');
console.log('C: webhook queue imported');
await new Promise((r) => setTimeout(r, 3000));
console.log('D: done, exiting');
process.exit(0);
