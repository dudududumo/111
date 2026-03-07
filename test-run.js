import { spawn } from 'child_process';

const child = spawn('npx', ['tsx', 'server.ts']);

child.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

child.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

child.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});

setTimeout(() => {
  child.kill();
  console.log('Killed after 5 seconds');
}, 5000);
