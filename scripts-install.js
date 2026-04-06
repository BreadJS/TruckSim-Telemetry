const { spawn } = require('child_process');
const path = require('path');

// Run build from the package directory
const buildProcess = spawn('npm', ['run', 'build'], {
  stdio: 'inherit',
  cwd: __dirname
});

buildProcess.on('exit', (code) => {
  process.exit(code || 0);
});
