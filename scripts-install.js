const { execSync } = require('child_process');
const path = require('path');

// Change to package directory
process.chdir(__dirname);

try {
  // Clean dist folder using npx
  execSync('npx rimraf dist', { stdio: 'inherit' });

  // Run TypeScript compiler using node directly
  const tscPath = path.join(__dirname, 'node_modules', 'typescript', 'bin', 'tsc');
  execSync(`node "${tscPath}"`, { stdio: 'inherit' });
} catch (error) {
  process.exit(error.status || 1);
}
