const { execSync } = require('child_process');
const path = require('path');

// Change to package directory
process.chdir(__dirname);

try {
  // Clean dist folder
  const rimrafPath = path.join(__dirname, 'node_modules', '.bin', 'rimraf');
  execSync(`"${rimrafPath}" dist`, { stdio: 'inherit' });

  // Run TypeScript compiler
  const tscPath = path.join(__dirname, 'node_modules', '.bin', 'tsc');
  execSync(`node "${tscPath}"`, { stdio: 'inherit' });
} catch (error) {
  process.exit(error.status || 1);
}
