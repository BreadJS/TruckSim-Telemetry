const { spawn } = require('child_process');
const path = require('path');

// Clean dist folder
const rimrafPath = path.join(__dirname, 'node_modules', '.bin', 'rimraf');
const cleanProcess = spawn(rimrafPath, ['dist'], {
  stdio: 'inherit',
  cwd: __dirname
});

cleanProcess.on('exit', (code) => {
  if (code !== 0) process.exit(code);

  // Run TypeScript compiler
  const tscPath = path.join(__dirname, 'node_modules', '.bin', 'tsc');
  const buildProcess = spawn(tscPath, [], {
    stdio: 'inherit',
    cwd: __dirname
  });

  buildProcess.on('exit', (code) => {
    process.exit(code || 0);
  });
});
