---
name: documentation-workspace
description: Use this skill whenever the user asks to bootstrap, initialize, set up, scaffold, or create a documentation workspace, docs folder, knowledge base, or note repository in an empty or near-empty directory. Triggers on phrases like "set up a docs workspace", "create documentation structure", "initialize a new docs project", "organize my notes into folders", "I want a new knowledge base", "scaffold a docs folder", or any variant the user uses to express wanting a fresh, organized, file-based documentation system. This skill creates a complete, versioned, self-contained documentation workspace with AGENTS.md, README.md, index.yaml, .gitignore, package.json, and helper scripts (format, validate, hash, reindex). It does NOT cover editing an existing workspace (the workspace's own AGENTS.md governs that), GitHub repository creation or hosting, or rendering the workspace as a UI. If the target directory already contains an AGENTS.md, the workspace is already bootstrapped — do not re-run this skill, just read AGENTS.md and follow it.
---

> This file is intended for **skill consumers**, not contributors. See [AGENTS.md](AGENTS.md) for development context — how this skill is built, iterated, and tested.

# Documentation Workspace Bootstrap

This skill teaches an AI agent how to bootstrap a **documentation workspace** from scratch in an empty (or near-empty) directory. The result is a versioned, file-system-based, fully self-contained knowledge base — owned by the user, free, no vendor lock-in, and structured so the agent working in it never has to think about organization, formatting, or tooling.

## The core idea

A bootstrapped workspace contains its own **AGENTS.md** — a per-workspace, topic-specific "frozen mini-skill" that the agent reads on entry. AGENTS.md is created from a template that this skill ships. Once the workspace exists, the agent follows AGENTS.md, not this skill. This is the entire point: pre-decide the rules once, then never burn tokens re-deriving them.

## When to use this skill

Use this skill **only** when:

- The user explicitly wants to create / set up / initialize / scaffold a documentation workspace, docs folder, or knowledge base.
- The target directory is empty or near-empty (or the user has explicitly opted in despite existing files).
- The target directory does not already contain an `AGENTS.md` (which would mean it's already bootstrapped).

If `AGENTS.md` already exists at the target: **do not** run this skill. Read the existing `AGENTS.md` and follow it. The user is already in a bootstrapped workspace.

## When NOT to use this skill

- The user wants to add a document, edit a document, link documents, or reorganize within an existing workspace — the workspace's own `AGENTS.md` governs that.
- The user wants to push to GitHub, render the workspace in a browser, or set up hosting — different concerns, different skills.
- The user is asking a generic question about documentation, writing, or note-taking — no skill needed.

## What the skill produces

When invoked, this skill creates a workspace containing:

| File / Directory | Purpose |
|---|---|
| `AGENTS.md` | The per-workspace "frozen mini-skill". 95% rules, 5% topic summary. The agent reads this on entry. |
| `README.md` | Workspace-level overview. Richer intro, auto-generated index, pointer to AGENTS.md. |
| `index.yaml` | Document ordering for the root directory. Empty by default. |
| `.gitignore` | Sensible defaults: backups, OS junk, editor files, Node. |
| `package.json` | Dev deps: prettier, markdownlint-cli, js-yaml. npm scripts for tooling. |
| `.prettierrc` | Prettier config: 120-char line, proseWrap preserve. |
| `.markdownlint.json` | markdownlint config with nitpick rules disabled. |
| `scripts/` | Helper scripts: `format.js`, `validate.js`, `hash.js`, `reindex.js`. |
| `assets/` | Empty shared-assets directory. Created at workspace root. |

A Git repository is initialized in the workspace if `git` is available. Dev dependencies are installed if Node and npm are available.

## Bootstrap workflow

Follow these steps in order. **Confirm with the user at every step where indicated.** Never assume.

### Step 1 — Confirm target location

Ask the user: *"I'll bootstrap the documentation workspace in `<cwd>`. Is this correct? (yes / no / specify a path)"*

- If `yes`: proceed with cwd as the target.
- If `no`: ask for the correct path, confirm, then proceed.
- If the user said "in this folder" or similar: assume cwd, but still confirm.

### Step 2 — Confirm target is empty (or get opt-in)

List the contents of the target directory (excluding hidden files like `.git`).

If empty: proceed to Step 3.

If non-empty:
1. Show the user what's there.
2. Explain: *"This directory isn't empty. By default, this skill refuses to bootstrap into a non-empty directory. I can either (a) abort, (b) you confirm you want me to proceed anyway and I'll leave existing files untouched, or (c) you specify a subdirectory to create the workspace in."*
3. Wait for explicit confirmation. If the user does not give strict positive affirmation, abort.
4. If the user says "go ahead" or "yes, proceed" — record that as opt-in and continue.

If `AGENTS.md` already exists at the target: **stop**. The workspace is already bootstrapped. Tell the user and offer to read the existing AGENTS.md.

If git is already initialized at the target: skip the `git init` step later, but proceed.

### Step 3 — Collect the topic summary

Ask the user: *"What is this documentation workspace for? Describe the topic in 1–2 short paragraphs. This becomes the topic summary in AGENTS.md and the intro in README.md."*

Topic summary rules:
- 1 paragraph (preferred), max 2 paragraphs
- Plain prose, no formatting, no lists
- Clear statement of what the workspace documents

If the user gives a single sentence: that's fine, use it.
If the user gives a longer description: condense it (with their confirmation) or use 2 paragraphs max.
If the user says "you decide" or "I don't know yet": prompt for at least one sentence — the topic summary is the only topic-specific part of AGENTS.md, and the workspace needs *some* anchor.

### Step 4 — Run the bootstrap script

Once you have:
- The target path
- Confirmation the directory is appropriate
- The topic summary

...run the bootstrap script:

---
node <skill-dir>/assets/skill-scripts/bootstrap.js --target <path> --topic "<topic-summary>"
---

The script will:
1. Verify Node.js availability (skip Node-dependent artifacts and warn if not)
2. Verify git availability (skip `git init` if not)
3. Create the directory structure
4. Instantiate all templates from `<skill-dir>/assets/templates/` with `{{TOPIC_SUMMARY}}` and `{{CREATED}}` substituted
5. Copy the workspace-shipped scripts (`format.js`, `validate.js`, `hash.js`, `reindex.js`) to `<target>/scripts/`
6. Run `npm install` (if Node + npm are available)
7. Run `git init` (if git is available)
8. Print a summary of what was created

If the script fails (e.g., permissions, missing tool), fall back to manual file creation using the templates in `<skill-dir>/assets/templates/`. Manually copy each template to the target, substitute placeholders, and create the scripts directory by copying from `<skill-dir>/assets/workspace-scripts/`.

### Step 5 — Tell the user what was created

After the script finishes, summarize:
- What files and directories were created
- Whether `git init` was run (or skipped, with a reminder)
- Whether `npm install` was run (or skipped, with a reminder)
- That `AGENTS.md` is now the governing document for this workspace
- That the workspace is ready to use

Then ask: *"Would you like to start working on documentation, or do you want to review the structure first?"*

## Templates

All template files live in `<skill-dir>/assets/templates/`. The bootstrap script copies and substitutes them.

| Template | Produces |
|---|---|
| `AGENTS.md.template` | `AGENTS.md` |
| `README.md.template` | `README.md` |
| `index.yaml.template` | `index.yaml` |
| `_gitignore_.template` | `.gitignore` (underscore-wrapped becomes dot-prefixed) |
| `package.json.template` | `package.json` |
| `_prettierrc_.template` | `.prettierrc` |
| `_markdownlint.json_.template` | `.markdownlint.json` |

Placeholders used:
- `{{TOPIC_SUMMARY}}` — replaced with the user's topic description
- `{{CREATED}}` — replaced with today's date (YYYY-MM-DD)

The bootstrap script handles the underscore-wrapping convention automatically (a file named `_foo_.template` becomes `.foo` in the output).

## Workspace-shipped scripts

After bootstrap, the workspace has these helper scripts in `scripts/`:

| Script | Purpose |
|---|---|
| `scripts/format.js` | Runs Prettier on all `.md`/`.html`/`.json`/`.yaml` files |
| `scripts/validate.js` | Runs markdownlint on all `.md` files |
| `scripts/hash.js` | Computes SHA-256 hash of a file, optionally writes to `assets/` and updates the manifest |
| `scripts/reindex.js` | Regenerates the auto-index section in `README.md` |

All are invokable via npm:
- `npm run format`
- `npm run validate`
- `npm run hash`
- `npm run reindex`

## References

For deeper context on specific topics, see the references/ directory:

- `references/asset-management.md` — How to add, link, and migrate assets (content-addressed storage, manifest, per-doc vs shared)
- `references/document-promotion.md` — How to promote a single-file document to a folder when it gains sub-documents

These are loaded into context only when relevant. The main AGENTS.md covers the common cases; references are for the less common ones.

## Reminders for the agent (during bootstrap)

- **Topic summary is the only topic-specific content** the user provides. Everything else is templated. Don't ask about file naming, link styles, frontmatter fields, commit message style, or any other rule — those are baked into the templates.
- **If the user asks for something the templates don't support**, surface it. Don't invent new conventions silently. The right move is to either (a) note it for a future template revision, or (b) implement it as an exception with explicit confirmation.
- **After bootstrap, this skill is done.** The next time the user wants to do anything in the workspace, the agent reads `AGENTS.md` and follows it. This skill does not run again unless the user explicitly asks to bootstrap another workspace or re-bootstrap the existing one.
