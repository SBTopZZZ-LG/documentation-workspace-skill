#!/usr/bin/env node
// validate.js — runs markdownlint on all Markdown files.
// Usage: node scripts/validate.js [--fix]
//   --fix: autofix issues where possible.

const { execSync } = require('child_process');
const path = require('path');

const fix = process.argv.includes('--fix');
const cwd = path.resolve(__dirname, '..');

const cmd = fix
  ? 'npx --no-install markdownlint "**/*.md" --ignore-path .gitignore --fix'
  : 'npx --no-install markdownlint "**/*.md" --ignore-path .gitignore';

console.log(fix ? 'Linting and autofixing...' : 'Linting markdown files...');

try {
  execSync(cmd, { cwd, stdio: 'inherit' });
  console.log(fix ? 'Lint complete (some issues may have been auto-fixed).' : 'No issues found.');
  process.exit(0);
} catch (err) {
  console.error('Lint found issues. Run `npm run validate:fix` to autofix what can be fixed.');
  process.exit(err.status || 1);
}
