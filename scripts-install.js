const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Change to package directory
process.chdir(__dirname);

try {
  // Check if tsconfig.json exists
  const tsconfigPath = path.join(__dirname, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) {
    throw new Error(`tsconfig.json not found at ${tsconfigPath}`);
  }
  console.log('Found tsconfig.json at:', tsconfigPath);

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

  // Run TypeScript compiler with explicit working directory
  console.log('Running TypeScript compiler...');
  console.log('Using tsc path:', tscPath);
  console.log('Working directory:', __dirname);

  execSync(`node "${tscPath}"`, {
    stdio: 'inherit',
    cwd: __dirname,
    env: { ...process.env }
  });
  console.log('TypeScript build complete!');

  // Build native addon with node-gyp (optional - may fail on some platforms)
  console.log('Building native addon with node-gyp...');
  try {
    execSync('npx node-gyp rebuild', {
      stdio: 'inherit',
      cwd: __dirname,
      env: { ...process.env }
    });
    console.log('Native addon build complete!');
  } catch (e) {
    console.warn('Native addon build failed (may be expected on some platforms):', e.message);
    console.warn('The package will still work, but native functionality may be limited.');
  }
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(error.status || 1);
}
