# MiniSheet — Plan

The original Datacore rewrite plan that lived here is **superseded**. The
project pivoted to a **standalone Obsidian plugin** (Preact + TypeScript +
esbuild, character data in plugin `data.json`, rules as indexed vault notes).

- Approved plan: `C:\Users\whipl\.claude\plans\swirling-pondering-feather.md`
- Development guide: `CLAUDE.md`
- Milestone history: `git log` (M0 scaffold → M11 cleanup)

## Status (2026-06-10)

All milestones M0–M11 are implemented:

- Verified MCP agent loop (buildStamp-checked reloads, bridge state tools)
- Characterization fixtures captured from the live legacy calculators
- Full math port (146 unit tests green, quirks preserved deliberately)
- Legacy import for Adarin + Hwayoung (lenient, conflict-warned)
- Five tabs at visual parity: combat / skills / spells (slots) / rules / adjustments
- New character + configure character flows
- Searchable Rules tab over vault notes (`Rules/` folder)
- Familiar links: derived pools, master-derived hpMax/BAB

## Deferred (future phases)

- Full spellbook (prepared/spontaneous/hybrid renderers, loadouts, spell DB)
  — mount point: `src/components/spells/`
- Inventory system, XP tracker
- Combat-toggle hover tooltips, Adventuring/Inventory sub-tabs
- Hwayoung-specific banner offset variant
