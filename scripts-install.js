const { execSync } = require('child_process');
const path = require('path');

// Change to package directory
process.chdir(__dirname);

try {
  // Find typescript package
  let tscPath;
  try {
    tscPath = require.resolve('typescript/bin/tsc');
  } catch (e) {
    // Fallback to local path
    tscPath = path.join(__dirname, 'node_modules', 'typescript', 'bin', 'tsc');
  }

  // Clean dist folder
  console.log('Cleaning dist folder...');
  try {
    execSync('npx rimraf dist', { stdio: 'inherit' });
  } catch (e) {
    // Ignore rimraf errors
  }

  // Run TypeScript compiler
  console.log('Running TypeScript compiler...');
  console.log('Using tsc path:', tscPath);
  execSync(`node "${tscPath}"`, { stdio: 'inherit' });
  console.log('Build complete!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(error.status || 1);
}
