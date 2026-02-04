# yosoynathel.com

Static site built with [Eleventy](https://www.11ty.dev/). Content is markdown synced from an Obsidian vault; 11ty builds it to static HTML with Obsidian-style `[[wiki links]]` supported via markdown-it-obsidian.

## Workflow

1. **Content lives in Obsidian** – You write/organize in your vault (e.g. a “publish” folder).
2. **Sync into the repo** – `bun run sync` rsyncs that folder into `src/content/` (does not touch layouts or CSS).
3. **Build/serve** – 11ty turns everything in `src/` (including `src/content/*.md`) into static files in `_site/`.

So: **vault → rsync → `src/content/` → 11ty → `_site/`**. The repo holds the site engine and layouts; synced markdown (and optionally images) are in `src/content/` and are gitignored so the vault stays the source of truth.

## Setup

```bash
bun install
```

## Development

Serve with live reload:

```bash
bun run dev
```

## Build

Output goes to `_site/`:

```bash
bun run build
```

## Sync from vault

Rsync your publish folder (e.g. from Obsidian) into `src/content/`. Edit the `sync` script in `package.json` if your path differs.

```bash
bun run sync
```

Default: `~/Documents/personal/publish/` → `./src/content/`. All markdown under `src/content/` uses the `base.njk` layout automatically (see `src/content/content.json`).

## Project structure

- `src/` – 11ty input
- `src/_includes/` – Nunjucks layouts (e.g. `base.njk`)
- `src/css/` – styles (copied as-is)
- `src/content/` – **synced from vault** (markdown + assets); contents gitignored except `content.json`
- `src/index.md` – static home page (in repo)
- `_site/` – generated output (gitignored)
