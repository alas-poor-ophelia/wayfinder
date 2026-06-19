# Changelog

Notable changes to Wayfinder. Each version's number matches its `manifest.json`
entry and its release tag (no `v` prefix).

## 1.0.1 — 2026-06-19

### Added

- A **Maneuvers folder** setting (shown when Path of War is enabled) to point
  Wayfinder at your Path of War maneuver notes — e.g. the `maneuvers/` folder
  from the wayfinder-rules pack — so maneuver links resolve, just like the
  spells folder. Previously the maneuver notes had to sit at a fixed default
  path.

## 1.0.0 — 2026-06-18

### Added

- **Path of War** — the third-party martial maneuver system, opt-in. Turn it on
  in Settings → Wayfinder → Path of War to get a Maneuvers tab, a maneuver
  database with loadouts, and stances and boosts wired into the sheet math. Off
  by default, and toggling it off only hides the surfaces — your maneuver data
  is kept.
- **Racial spell-like abilities** now appear on the sheet automatically. Picking
  a race or heritage that grants an at-will or per-day SLA (tieflings, aasimars,
  drow, dhampirs, and more) seeds it into the Spell-Like Abilities section —
  even for characters with no spellbook.
- **Quick-access buttons** on the configuration screen's sidebar open the spell,
  equipment, and maneuver databases and the party inventory in one tap.
- **Character storage options** — keep character data in the plugin, in a single
  vault file, or one file per character (smaller per-edit diffs, fewer Obsidian
  Sync conflicts), with an optional separate backup file. Settings → Wayfinder →
  Character storage.

### Changed

- Section 15 of the bundled Open Game Content notice now credits Path of War
  © 2014, Dreamscarred Press.

## 0.9.3 — 2026-06-16

### Changed

- Updated the remaining build-time dependencies (esbuild, postcss) to clear
  security advisories; the dependency tree now audits clean. No user-facing
  changes — these tools are not bundled into the plugin.

## 0.9.2 — 2026-06-16

### Changed

- Updated build-time dependencies (vite, rollup) to clear security advisories.
  No user-facing changes — these tools are not bundled into the plugin.

## 0.9.1 — 2026-06-16

### Changed

- Now requires Obsidian 1.8.7 or newer — matching the APIs the plugin already
  uses (the previous minimum was declared too low).
- Minor wording tweaks to a few settings labels, the ribbon tooltip, and the
  rule-import dialog to follow Obsidian's community-plugin style guidelines.

### Fixed

- Release assets now carry GitHub artifact attestations, so their build
  provenance can be cryptographically verified.

## 0.9.0 — 2026-06-16

### Added

- Archetype support for Swashbuckler, Sorcerer, Arcanist, Cleric, and Oracle.
  The abilities the sheet models — daily resource pools, class-skill changes,
  and channel-energy variants — are wired in; archetypes it cannot fully model
  yet are still labelled *partial* when you pick one.
- A character switcher: a control on the configuration screen, plus
  command-palette pickers, for moving between sheets.

### Changed

- Character creation now does more of the setup for you. Adding a class applies
  its default resource pools and class skills and provisions a spellbook for
  casters; choosing a race derives movement speed and energy resistances; and an
  *apply average HP* button fills in hit points.
- A new character starts with only the universally-available quick actions —
  Charge, Fighting Defensively, Flank, and Power Attack when Elephant in the
  Room is enabled. Class-specific actions stay on the bench until you add them.
  Existing characters are unchanged.

### Fixed

- Class skills granted by a class are no longer missed in some multiclass cases.

## 0.8.0 — 2026-06-15

- Initial public beta release (via BRAT).
