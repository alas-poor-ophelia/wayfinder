# MiniSheet — Development Guide

## What Is This Project?

MiniSheet is a **standalone Obsidian plugin**: a Pathfinder 1e character sheet for
Obsidian's right sidebar, optimized for iPad. Preact + TypeScript, bundled with
esbuild (windrose-pattern). Character data lives in the plugin's `data.json`
(NOT note frontmatter). Rules text lives as vault markdown notes indexed by the
plugin. The legacy Meta Bind + JS Engine + Datacore implementation lives at
`C:\Users\whipl\OneDrive\Documents\MiniSheet Dev\` and is the visual/math
reference until parity is reached.

Specs: `MiniSheet Dev/MiniSheet/.claude/minisheet-ui-spec.md`, `architecture.md`.
Active plan: `C:\Users\whipl\.claude\plans\swirling-pondering-feather.md`.

## Layout

| Path | Role |
|------|------|
| `src/main.ts` | Plugin entry: view, commands, settings, bridge |
| `src/state/store.ts` | @preact/signals store persisted to data.json (debounced) |
| `src/types/character.ts` | CharacterRecord schema — derived values are NEVER stored |
| `src/calc/` | Pure TS math (no obsidian imports); `computeAll()` is the entry |
| `src/import/legacy-import.ts` | Old frontmatter → CharacterRecord |
| `src/components/` | Preact components (combat/, skills/, rules/, config/, common/) |
| `src/bridge/mcp-bridge.ts` | `window.__minisheet` — the MCP-driven control surface |
| `scss/` | SCSS partials → `styles.css` (never hand-edit styles.css) |
| `mcp/` | MCP server (Obsidian CLI transport) |
| `tests/unit/` | vitest; calc characterization suites vs `tests/unit/fixtures/` |
| `references/` | Fresh screenshots of the OLD sheet — the visual parity targets |

## Build / Deploy / Loop

```
bun run build        # sass + esbuild -> main.js/styles.css
bun run deploy       # build + copy main.js/styles.css/manifest.json to the vault
bun run typecheck    # tsc --noEmit
bun run test:unit    # vitest (tests/unit)
```

Deploy target: `MiniSheet Dev/.obsidian/plugins/minisheet/`.

### Development cycle (MANDATORY)

```
1. CHANGE  — edit src/scss
2. DEPLOY  — bun run deploy
3. RELOAD  — minisheet_reload (verifies buildStamp CHANGED; stale = loud failure)
4. DRIVE   — minisheet_set_tab / minisheet_set_field / minisheet_get_computed
5. VERIFY  — minisheet_screenshot vs references/*.png; minisheet_errors clean
```

- **Math changes**: characterization tests in `tests/unit/calc/` are the contract
  (captured from the real legacy calculators). Never "fix" a quirk the old code
  had — quirks are preserved deliberately and documented in code comments.
- **Eval gotchas**: top-level `await` is rejected by the CLI eval context — wrap
  in an async IIFE stashing to `window.__msAsync[id]` and poll (the MCP helpers
  do this). Avoid `>`/`<`/`|`/`&` in inline eval text (cmd.exe quoting); the MCP
  tools transport payloads base64.
- `minisheet_reload` with no args reloads THIS plugin; legacy ids (datacore,
  obsidian-meta-bind-plugin, js-engine) reload the old stack.

## Design Constraints

- Sidebar-only ~321px, iPad-first (45px touch targets), dark theme.
- Fonts: Norwester (display), Taroca (labels) — embedded in `scss/_fonts.scss`;
  Crimson Text intentionally resolves through its fallback stack (the old vault
  never embedded it either).
- Colors: `--ms-red: #8b0000`, `--ms-gold: #ca9759`, `--ms-bronze`.
- All selectors scoped under `.minisheet-root` (+ separate roots: config,
  equipdb, partyinv, spelldb).
- **Style Settings**: the two accents and three fonts are user-customizable via
  the community Style Settings plugin. The `/* @settings */` block lives in
  `scss/_style-settings.scss`. Brand values are exposed as a body-scope SEAM —
  `--ms-accent-red/gold`, `--ms-font-display/label/body` — which the plugin
  NEVER defines, only consumes as `var(--ms-accent-gold, #ca9759)`. Defining a
  default on a `.minisheet-*-root` (class) would beat Style Settings' `body`
  write and silently break customization, so don't. New brand color/font usage
  must route through `--ms-gold`/`--ms-red` (or the global seam token) and use
  `color-mix()` for tints — never a raw brand hex. The reset toggle
  (`body.minisheet-obsidian-native`) remaps the seam to Obsidian theme vars.
  `main.ts` fires `parse-style-settings` on layout-ready.

## Known Legacy Data Hazards

- The old sheet + config notes DISAGREE on class levels (paladin 4 vs 5); the
  config note matches XP and wins on import (warned).
- Old skills tuples come in 3- and 4-element forms; importer is lenient.
- Hwayoung's captured AC fixture (17) contradicts her rendered shield (29) —
  her component bindings differ; recapture tracked in the M9 milestone.
