const { spawn } = require('child_process');
const path = require('path');

// Run build from the package directory
const buildProcess = spawn('npm', ['run', 'build'], {
  stdio: 'inherit',
  cwd: __dirname,
  env: { ...process.env, PATH: path.join(__dirname, 'node_modules', '.bin') + ':' + process.env.PATH }
});

buildProcess.on('exit', (code) => {
  process.exit(code || 0);
});
