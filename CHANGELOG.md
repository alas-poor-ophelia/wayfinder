# Changelog

Notable changes to Wayfinder. Each version's number matches its `manifest.json`
entry and its release tag (no `v` prefix).

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
