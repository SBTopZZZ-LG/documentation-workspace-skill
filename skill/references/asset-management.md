# Asset Management

This reference covers how to add, link, and migrate assets (images, PDFs, JSON fixtures, etc.) in this workspace. The main `AGENTS.md` has the high-level rules; this goes deeper on the operational details.

## Storage strategy

- **Per-document assets** — `<doc>/assets/` — for resources only one document uses
- **Shared assets** — `<workspace>/assets/` — for resources used by 2+ documents
- **Hashing** — SHA-256, truncated to 12 hex characters, original extension preserved
- **Index** — `<workspace>/assets/manifest.yaml` maps logical names to hash-filenames

## How to decide per-doc vs shared

Default rule: **per-doc**. Promote to shared only when a second document needs the same resource.

If you're unsure, ask the user. The decision is reversible (with a "move" — see below).

## Adding a new asset

1. Identify the source file (e.g. `~/Downloads/onboarding.png`).
2. Decide if it is per-doc or shared. Default: per-doc.
3. Run the script with `--write`:

   - Per-doc: place the source file under `<doc>/assets/` first, then run the script from there.
   - Shared: place the source file under `<workspace>/assets/`, then run the script from there.
   - Alternatively, run the script with the source anywhere; the script always writes to `<workspace>/assets/`. The agent then physically relocates the file to the per-doc folder if appropriate, or keeps it at the workspace root if shared.

   Example:

   ```bash
   npm run hash -- --write assets/onboarding.png --name onboarding-screenshot
   ```

4. The script will:
   - Compute the SHA-256 hash.
   - Copy the file to `assets/<hash>.<ext>` (overwriting if the same content is hashed twice).
   - Update `assets/manifest.yaml` with the logical name → hash-filename mapping.
   - Print the resolved path to use in your document.

5. In the document, link to the **resolved path** (the hash-filename), not the logical name. This ensures the link works on GitHub without a runtime resolver.

   Logical-name form:

   ```markdown
   ![Onboarding flow](assets/onboarding-screenshot.png)
   ```

   Resolved-path form (what you actually write):

   ```markdown
   ![Onboarding flow](../../assets/a3f9c1d2e8b4.png)
   ```

## Idempotency

If the same logical name is re-added with the same content, the script detects this and exits without re-copying or duplicating the manifest entry. If the content has changed, a new hash-filename is created and the manifest is updated.

Old hash-files for the same logical name become orphans. They are safe to delete (git tracks them so history is preserved) but the agent should not delete them without confirmation.

## Linking to an asset

Always link to the **resolved path**, never the logical name:

```markdown
![Onboarding](../../assets/a3f9c1d2e8b4.png)
```

Why resolved at write time, not at render time:

- GitHub cannot resolve a manifest — it serves static files only.
- A Notion-like UI server (future) can resolve manifests, but the source of truth is the resolved path.
- Resolved paths are stable as long as the content does not change. If the content changes, a new hash is generated and all referencing documents must be updated.

## Migrating a per-doc asset to shared

When a per-doc asset becomes used by 2+ documents:

1. Use `git mv` to move the asset from `<doc>/assets/<hash>.<ext>` to `<workspace>/assets/<hash>.<ext>`. This preserves git history.
2. Add or update the manifest entry if not already present.
3. Update all documents that reference the asset (relative paths will change).

This is a "move" — confirm with the user per the destructive actions rules in `AGENTS.md`.

## Migrating a shared asset to per-doc

Less common, but possible. Same as above in reverse.

## Renaming a logical name

To rename the logical name (the only "human-readable" identifier) without changing the content:

1. Edit `assets/manifest.yaml` directly.
2. Documents reference hash-filenames, not logical names, so no document updates are needed.

This is allowed without confirmation (editing the manifest is not destructive).

## Removing an asset

1. Delete the file from `assets/<hash>.<ext>`.
2. Remove the entry from `assets/manifest.yaml`.
3. Update or remove any document references to the asset.

This involves deletion — confirm with the user per the destructive actions rules in `AGENTS.md`.

## Where the script lives

The `hash.js` script is shipped with the workspace at `scripts/hash.js`. Run via `npm run hash -- <args>`. The script uses only Node.js built-ins (no external dependencies).
