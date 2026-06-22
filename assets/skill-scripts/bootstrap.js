#!/usr/bin/env node
// bootstrap.js — initialize a documentation workspace in a target directory.
// This script is run by the agent during the documentation-workspace skill.
// It is NOT shipped with the resulting workspace; it lives in the skill itself.
//
// Usage:
//   node <skill-dir>/assets/skill-scripts/bootstrap.js --target <path> --topic "<topic-summary>"
//
// Behavior:
//   1. Verify Node.js availability (skip Node-dependent artifacts and warn if not).
//   2. Verify git availability (skip `git init` if not).
//   3. Create the target directory if missing.
//   4. Instantiate all templates from <skill-dir>/assets/templates/ with
//      {{TOPIC_SUMMARY}} and {{CREATED}} substituted.
//   5. Copy workspace-shipped scripts from <skill-dir>/assets/workspace-scripts/
//      to <target>/scripts/.
//   6. Create <target>/assets/ as an empty directory.
//   7. Run `npm install` (if Node + npm are available).
//   8. Run `git init` (if git is available).
//   9. Print a summary.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
function getArg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

const targetRaw = getArg('--target') || process.cwd();
const target = path.resolve(targetRaw);
const topic = getArg('--topic');

const skillDir = path.resolve(__dirname, '..');
const templatesDir = path.join(skillDir, 'templates');
const workspaceScriptsSrc = path.join(skillDir, 'workspace-scripts');

if (!topic) {
  console.error('Error: --topic "<topic-summary>" is required.');
  console.error('');
  console.error('Usage:');
  console.error('  node bootstrap.js --target <path> --topic "<topic-summary>"');
  process.exit(1);
}

if (!fs.existsSync(templatesDir)) {
  console.error(`Templates directory not found: ${templatesDir}`);
  console.error('The skill may be misconfigured.');
  process.exit(1);
}

function checkAvailable(cmd) {
  try {
    execSync(`${cmd} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const nodeAvailable = checkAvailable('node');
const npmAvailable = checkAvailable('npm');
const gitAvailable = checkAvailable('git');

const today = new Date().toISOString().slice(0, 10);

function instantiate(content) {
  return content
    .replace(/\{\{TOPIC_SUMMARY\}\}/g, topic)
    .replace(/\{\{CREATED\}\}/g, today);
}

// Explicit template-name -> output-filename mapping. Dotfiles are kept with their
// leading `_` and trailing `_` in the template name (so they aren't hidden on
// disk and aren't mistakenly interpreted as environment files). This mapping
// is the single source of truth for what each template becomes.
const TEMPLATE_NAME_MAPPING = {
  'AGENTS.md.template': 'AGENTS.md',
  'README.md.template': 'README.md',
  'index.yaml.template': 'index.yaml',
  'package.json.template': 'package.json',
  '_gitignore_.template': '.gitignore',
  '_prettierrc_.template': '.prettierrc',
  '_markdownlint.json_.template': '.markdownlint.json',
};

function templateNameToOutput(tplName) {
  if (Object.prototype.hasOwnProperty.call(TEMPLATE_NAME_MAPPING, tplName)) {
    return TEMPLATE_NAME_MAPPING[tplName];
  }
  // Fallback for any unmapped template: strip the .template suffix.
  return tplName.endsWith('.template') ? tplName.slice(0, -'.template'.length) : tplName;
}

function header(label) {
  console.log('');
  console.log(`--- ${label} ---`);
}

console.log('=== Documentation Workspace Bootstrap ===');
console.log(`Target:  ${target}`);
console.log(`Topic:   ${topic.length > 80 ? topic.slice(0, 80) + '...' : topic}`);
console.log(`Node:    ${nodeAvailable ? 'available' : 'NOT available'}`);
console.log(`npm:     ${npmAvailable ? 'available' : 'NOT available'}`);
console.log(`git:     ${gitAvailable ? 'available' : 'NOT available'}`);

// Refuse to operate on a non-empty directory unless the caller has already confirmed.
// The agent is expected to have confirmed with the user; this is a safety net.
if (fs.existsSync(target)) {
  const entries = fs.readdirSync(target).filter((e) => !e.startsWith('.'));
  if (entries.length > 0) {
    console.error('');
    console.error(`Error: target directory is not empty: ${target}`);
    console.error(`Found ${entries.length} non-hidden entr${entries.length === 1 ? 'y' : 'ies'}.`);
    console.error('The agent must confirm with the user before proceeding.');
    process.exit(1);
  }
} else {
  fs.mkdirSync(target, { recursive: true });
}

header('Creating files');

const templates = fs.readdirSync(templatesDir);
for (const tpl of templates) {
  const tplPath = path.join(templatesDir, tpl);
  if (!fs.statSync(tplPath).isFile()) continue;
  const content = fs.readFileSync(tplPath, 'utf8');
  const instantiated = instantiate(content);
  const outName = templateNameToOutput(tpl);
  const outPath = path.join(target, outName);
  fs.writeFileSync(outPath, instantiated);
  console.log(`  ${outName}`);
}

// Copy workspace-shipped scripts.
header('Creating scripts');
const scriptsDir = path.join(target, 'scripts');
fs.mkdirSync(scriptsDir, { recursive: true });
if (fs.existsSync(workspaceScriptsSrc)) {
  for (const script of fs.readdirSync(workspaceScriptsSrc)) {
    const src = path.join(workspaceScriptsSrc, script);
    const dst = path.join(scriptsDir, script);
    if (!fs.statSync(src).isFile()) continue;
    fs.copyFileSync(src, dst);
    fs.chmodSync(dst, 0o755);
    console.log(`  scripts/${script}`);
  }
}

// Create empty assets directory.
const assetsDir = path.join(target, 'assets');
fs.mkdirSync(assetsDir, { recursive: true });
console.log('  assets/');

// npm install.
header('Installing dev dependencies');
if (nodeAvailable && npmAvailable) {
  try {
    execSync('npm install', { cwd: target, stdio: 'inherit' });
    console.log('Dev dependencies installed.');
  } catch (err) {
    console.error('npm install failed. You can run it manually later with: npm install');
  }
} else {
  console.log('Skipping npm install (Node or npm not available).');
  console.log('Install Node.js to enable the formatting and validation tooling.');
}

// git init.
header('Initializing git');
if (gitAvailable) {
  try {
    execSync('git init', { cwd: target, stdio: 'inherit' });
    console.log('git init complete.');
  } catch (err) {
    console.error('git init failed. You can run it manually later with: git init');
  }
} else {
  console.log('Skipping git init (git not available).');
  console.log('Install git for version control. Backup files (.bak) are local only.');
}

console.log('');
console.log('=== Bootstrap complete ===');
console.log('');
console.log('Files created:');
console.log('  AGENTS.md           — the rules for working in this workspace');
console.log('  README.md           — the workspace overview + auto-index');
console.log('  index.yaml          — document ordering (empty by default)');
console.log('  .gitignore          — sensible defaults');
console.log('  package.json        — dev dependencies and npm scripts');
console.log('  .prettierrc         — formatting config');
console.log('  .markdownlint.json  — linting config');
console.log('  scripts/            — format, validate, hash, reindex');
console.log('  assets/             — empty shared-assets directory');
if (nodeAvailable && npmAvailable) console.log('  node_modules/       — dev dependencies installed');
if (gitAvailable) console.log('  .git/               — git repository initialized');
console.log('');
console.log('Next steps:');
console.log('  1. Read AGENTS.md — the rules for working in this workspace');
console.log('  2. Read README.md — the workspace overview');
console.log('  3. Start creating documents and adding them to index.yaml');
if (!nodeAvailable) console.log('');
if (!nodeAvailable) console.log('Reminder: install Node.js to use the formatting and validation scripts.');
if (!gitAvailable) console.log('');
if (!gitAvailable) console.log('Reminder: install git for version control.');
