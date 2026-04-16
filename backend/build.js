const esbuild = require('esbuild');
const { readdirSync, statSync } = require('fs');
const { join } = require('path');

// Get all TypeScript files recursively
function getFiles(dir, files = []) {
  const items = readdirSync(dir);
  for (const item of items) {
    const path = join(dir, item);
    if (statSync(path).isDirectory()) {
      if (item !== 'node_modules' && item !== 'dist' && item !== '__tests__') {
        getFiles(path, files);
      }
    } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
      files.push(path);
    }
  }
  return files;
}

const entryPoints = getFiles('./src');

esbuild.build({
  entryPoints,
  outdir: 'dist',
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: true,
  bundle: false,
  minify: false,
  keepNames: true,
}).then(() => {
  console.log('Build completed successfully!');
}).catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
