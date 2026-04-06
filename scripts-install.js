const { execSync } = require('child_process');
const path = require('path');

// Change to package directory
process.chdir(__dirname);

try {
  // Clean dist folder using npx
  execSync('npx rimraf dist', { stdio: 'inherit' });

  // Run TypeScript compiler using npx
  execSync('npx typescript tsc', { stdio: 'inherit' });
} catch (error) {
  process.exit(error.status || 1);
}
