# Document Promotion (file → folder)

In this workspace, a document with sub-documents becomes a folder. This reference covers how to handle that transformation correctly. The main `AGENTS.md` has the high-level rules; this goes deeper on the operational details.

## The pattern

A leaf document (no sub-docs) is a single file:

```text
architecture.md
```

A document with sub-documents becomes a folder:

```text
architecture/
├── README.md          # the document itself
├── components.md
└── data-flow.md
```

The folder name and the document's slug are the same. The document's content lives in `README.md` inside the folder.

## Why

This pattern matches GitHub's UI: clicking a folder on GitHub auto-renders the README.md inside. Users don't have to manually open a README to see the doc's content — the folder click goes straight to the rendered page.

It also keeps the workspace predictable:

- A leaf doc is one file.
- A branch doc is a folder.
- You can always tell at a glance which is which from the filesystem.

## Promoting a single-file doc to a folder

When you add the first sub-doc to a leaf document:

1. Create the folder with the same name as the document:

   ```bash
   mkdir architecture
   ```

2. Move the document's content into a `README.md` inside the folder, preserving history:

   ```bash
   git mv architecture.md architecture/README.md
   ```

3. Add the new sub-doc(s):

   ```bash
   touch architecture/components.md
   ```

4. Update any existing links to `architecture.md` → `architecture/` (or `architecture/README.md`). Most link writers will accept either form, but be consistent.

5. Update the parent directory's `index.yaml`. The path entry should now be `architecture` (folder name), not `architecture.md` (old filename).

This is a "move + rename" — confirm with the user per the destructive actions rules in `AGENTS.md`. Existing links to the document will break, and any code or text referencing the file path needs updating.

## Demoting a folder back to a single file

Rare. Only do this if all sub-documents are removed and the document has been simplified to a single page. Steps:

1. Move `README.md` content to a single file with the folder's name:

   ```bash
   git mv architecture/README.md architecture.md
   ```

2. Remove the now-empty folder:

   ```bash
   rmdir architecture
   ```

3. Update all links and the parent `index.yaml` to reference `architecture.md` again.

Same confirmation rules apply.

## What about index.yaml?

`index.yaml` is the document order for a directory. When you promote a doc to a folder, update the parent directory's `index.yaml` to reference the new path (the folder name, not the old filename).

The order in `index.yaml` should not change during a promotion. Only the path entry changes.

## What about assets?

If the document has per-doc assets in `<doc>.md` shape... wait, it doesn't, because it's a single file. Single files don't have per-doc assets. If the document references assets, those are in the workspace's shared `assets/` folder and links don't change.

If the document has per-doc assets in `<doc>/assets/` shape (because it was already a folder), nothing changes during promotion.

## Edge case: promoting while keeping the slug identical

If the folder and the file have the same slug (`architecture.md` → `architecture/`), and the file had no siblings, promotion is mechanical. The link from the parent `index.yaml` changes from `architecture.md` to `architecture`, but everything else can stay the same.

## Edge case: promoting when the document has frontmatter

Frontmatter travels with the content. When you `git mv architecture.md architecture/README.md`, the frontmatter stays in the file's first lines. No transformation needed.

## Recovery from a botched promotion

If a promotion goes wrong, `git reflog` is your friend. The `git mv` is reversible:

```bash
git mv architecture/README.md architecture.md
rmdir architecture
```

If you also updated `index.yaml` or links, those need reverting too.
