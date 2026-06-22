#!/usr/bin/env node
// hash.js — compute SHA-256 hash of a file.
// In write mode: also copies the file to <workspace>/assets/, updates
// assets/manifest.yaml, and prints the resolved path to use in documents.
//
// Usage:
//   node scripts/hash.js <file>
//     -> prints the truncated hash to stdout.
//   node scripts/hash.js --write <file> --name <logical-name>
//     -> copies file to assets/<hash>.<ext>, updates assets/manifest.yaml,
//        prints the resolved path.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const args = process.argv.slice(2);
const shouldWrite = args.includes('--write');

const filePath = args.find((a) => !a.startsWith('--') && a !== '--write');
const nameIdx = args.indexOf('--name');
const logicalName = nameIdx >= 0 ? args[nameIdx + 1] : null;

if (!filePath) {
  console.error('Usage:');
  console.error('  node scripts/hash.js <file>');
  console.error('  node scripts/hash.js --write <file> --name <logical-name>');
  console.error('');
  console.error('Options:');
  console.error('  --write               Copy the file into <workspace>/assets/ and update manifest.');
  console.error('  --name <name>         Logical name to register in the manifest. Required with --write.');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const abs = path.resolve(filePath);
const bytes = fs.readFileSync(abs);
const fullHash = crypto.createHash('sha256').update(bytes).digest('hex');
const shortHash = fullHash.slice(0, 12);
const ext = path.extname(abs);
const hashedFilename = `${shortHash}${ext}`;

console.log(`File:    ${filePath}`);
console.log(`SHA-256: ${fullHash}`);
console.log(`Short:   ${shortHash}`);
console.log(`Asset:   ${hashedFilename}`);

if (!shouldWrite) {
  process.exit(0);
}

if (!logicalName) {
  console.error('--write requires --name <logical-name>');
  process.exit(1);
}

if (!/^[a-z0-9][a-z0-9_-]*$/.test(logicalName)) {
  console.error('Logical name must be lowercase, kebab-case, ASCII only.');
  process.exit(1);
}

const workspaceRoot = path.resolve(__dirname, '..');
const assetsDir = path.join(workspaceRoot, 'assets');
const manifestPath = path.join(assetsDir, 'manifest.yaml');

fs.mkdirSync(assetsDir, { recursive: true });

// Idempotency: if an existing entry already maps to this hash, do not copy or re-add.
let manifest = { assets: {} };
if (fs.existsSync(manifestPath)) {
  const content = fs.readFileSync(manifestPath, 'utf8');
  // Lightweight YAML parse for the specific shape we generate.
  const lines = content.split('\n');
  let inAssets = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === 'assets:') {
      inAssets = true;
      continue;
    }
    if (inAssets && /^[a-zA-Z]/.test(line) && !line.startsWith('  ')) break;
    if (inAssets && trimmed && !trimmed.startsWith('#')) {
      const m = trimmed.match(/^([a-zA-Z0-9_-]+):\s*(.+?)\s*$/);
      if (m) manifest.assets[m[1]] = m[2];
    }
  }
}

const existingHashForName = manifest.assets[logicalName];
if (existingHashForName === hashedFilename) {
  console.log('');
  console.log(`No-op: ${logicalName} already maps to ${hashedFilename} in manifest.`);
  process.exit(0);
}

fs.copyFileSync(abs, path.join(assetsDir, hashedFilename));
manifest.assets[logicalName] = hashedFilename;

const yaml = [
  '# assets/manifest.yaml — logical name -> content-addressed filename',
  '# This file is auto-managed by `npm run hash -- --write`.',
  '# To add a new asset, run: npm run hash -- --write <file> --name <logical-name>',
  '',
  'assets:',
  ...Object.entries(manifest.assets).map(([k, v]) => `  ${k}: ${v}`),
  '',
].join('\n');

fs.writeFileSync(manifestPath, yaml);

console.log('');
console.log(`Wrote:   assets/${hashedFilename}`);
console.log(`Manifest: ${logicalName} -> ${hashedFilename}`);
console.log('');
console.log(`Use in a document: ![${logicalName}](assets/${hashedFilename})`);
console.log('Note: if this is a per-doc asset, place it under <doc>/assets/ instead.');
