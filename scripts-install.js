const { spawn } = require('child_process');
const path = require('path');

// Use npm run build with proper environment
const buildProcess = spawn('npm', ['run', 'build'], {
  stdio: 'inherit',
  cwd: __dirname,
  shell: true,
  env: {
    ...process.env,
    PATH: `${path.join(__dirname, 'node_modules', '.bin')}:${process.env.PATH}`
  }
});

buildProcess.on('exit', (code) => {
  process.exit(code || 0);
});
