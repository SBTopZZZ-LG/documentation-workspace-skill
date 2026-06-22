# AGENTS.md

> Do not treat `SKILL.md` as development instructions — it is a consumer-facing skill definition. This file is for contributors iterating on the skill.

## What this repo is

Source for the agent-agnostic skill `documentation-workspace`. Not application code. The artifact an agent runtime consumes is `SKILL.md` (loaded by the skill tool when the user wants to bootstrap a docs workspace). Everything else is supporting assets the skill reads or ships.

## Layout

- `SKILL.md` — the skill's instruction file. The frontmatter `description` controls trigger matching; the body is the workflow. **Edit this when skill behavior changes.**
- `assets/templates/` — templates substituted by `bootstrap.js`. Placeholders: `{{TOPIC_SUMMARY}}`, `{{CREATED}}`. Underscore-wrapped filenames (`_foo_.template`) become dotfiles (`.foo`). Do not rename to fix the dot — the convention is intentional and `bootstrap.js` depends on it.
- `assets/workspace-scripts/` — `format.js`, `validate.js`, `hash.js`, `reindex.js`. Copied verbatim into every bootstrapped workspace.
- `assets/skill-scripts/bootstrap.js` — the orchestrator. Lives in the skill, **not** shipped to target workspaces.
- `references/` — extended context (`asset-management.md`, `document-promotion.md`). The skill only loads these when relevant.

## There is no build, test, linter, formatter, CI, or `package.json` at this repo

Do not look for them. The only executable verification is to run the skill end-to-end:

```sh
node assets/skill-scripts/bootstrap.js --target /tmp/agent-docs-test --topic "Test topic"
```

This exercises template substitution, script copying, `npm install` (skipped if Node/npm absent), and `git init` (skipped if git absent). Inspect the result in `/tmp/agent-docs-test` and clean up.

## Editing the per-workspace AGENTS.md this skill produces

The AGENTS.md that ends up in a user's workspace is rendered from `assets/templates/AGENTS.md.template`. **Edit the template, not SKILL.md or the bootstrap script, when the per-workspace rules need to change.** SKILL.md should stay focused on the bootstrap workflow, not duplicate template content.

## SKILL.md frontmatter rules

- `description` is the entire trigger surface. It must be precise about when the skill applies and when it does not. Keep the "use only when" / "do not use when" guidance concrete.
- The skill explicitly tells agents to **refuse to bootstrap** if the target already has an `AGENTS.md` or contains non-empty contents without explicit opt-in. Preserve that gate.
- Topic summary is the only topic-specific input the agent collects; everything else is templated. Do not add new free-form questions to the workflow.

## Conventions

- The skill never re-runs once a workspace is bootstrapped — the workspace's own `AGENTS.md` takes over. Document any new "edit a workspace" guidance in the template, not in SKILL.md.
- `node` and `git` are optional: bootstrap degrades gracefully and warns if either is missing. Keep that property.
