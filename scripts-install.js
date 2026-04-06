const { execSync } = require('child_process');
const path = require('path');

// Change to package directory and run build
try {
  process.chdir(__dirname);
  execSync('npm run build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      PATH: `${path.join(__dirname, 'node_modules', '.bin')}:${process.env.PATH}`
    }
  });
} catch (error) {
  process.exit(error.status || 1);
}
