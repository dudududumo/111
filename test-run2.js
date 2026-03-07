import { spawn } from 'child_process';

const child = spawn('npx', ['tsx', 'server.ts'], {
  env: { ...process.env, NODE_ENV: 'development' }
});

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
  console.log('Killed after 10 seconds');
}, 10000);
