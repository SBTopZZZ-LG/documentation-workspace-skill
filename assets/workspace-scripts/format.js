#!/usr/bin/env node
// format.js — runs Prettier on all doc files.
// Usage: node scripts/format.js [--check]
//   --check: report files that need formatting, don't modify.

const { execSync } = require('child_process');
const path = require('path');

const check = process.argv.includes('--check');
const cwd = path.resolve(__dirname, '..');

const cmd = check
  ? 'npx --no-install prettier --check "**/*.{md,html,json,yaml,yml}" --ignore-path .gitignore'
  : 'npx --no-install prettier --write "**/*.{md,html,json,yaml,yml}" --ignore-path .gitignore';

console.log(check ? 'Checking formatting...' : 'Formatting files...');

try {
  execSync(cmd, { cwd, stdio: 'inherit' });
  console.log(check ? 'All files are formatted correctly.' : 'Formatting complete.');
  process.exit(0);
} catch (err) {
  if (check) {
    console.error('Some files need formatting. Run `npm run format` to fix.');
  } else {
    console.error('Formatting failed.');
  }
  process.exit(err.status || 1);
}
