# Release runbook

How to cut a release for **Wayfinder** (the plugin) and **wayfinder-rules** (the
spell/rules note pack). Internal doc — not shipped to users.

## 0. Pre-flight (green as of this prep)

```
bun run preflight    # check + bun audit + build:prod  (the one-shot release gate)
```

`bun run preflight` runs, in order: `bun run check` (typecheck + lint + format +
unit tests), then `bun audit` (fails on ANY dependency advisory — the store's
Dependencies check flags these, so catch them here), then `bun run build:prod`
(emits `main.js` + `styles.css`). The release workflow also runs `bun audit`, so
a vulnerable lockfile can't be published even if pre-flight is skipped.

Plugin bundle is ~3.9 MB total — under Obsidian's 5 MB limit. The spell prose
notes (~16 MB) are deliberately **not** bundled; they ship as wayfinder-rules.

## 1. Wayfinder plugin

The release is automated by `.github/workflows/release.yml`: pushing a tag whose
name equals the `manifest.json` version builds and publishes a GitHub Release with
`main.js`, `styles.css`, and `manifest.json` attached.

1. **Commit the working tree.** The pre-release quality pass, plus this prep
   (`README.md`, `readme-images/`, `LICENSE`, `.github/workflows/`, `RELEASE.md`),
   are uncommitted. Review and commit them.
2. **Land on `main`.** Merge `quality/pre-release-forge` → `main` (tag from `main`).
3. **Confirm versions agree.** `manifest.json` `version`, the newest
   `versions.json` entry, and `package.json` `version` must all match (e.g.
   `1.0.1` with `"1.0.1": "1.8.7"`).
4. **Create the GitHub repo** `alas-poor-ophelia/wayfinder`, then:
   ```
   git remote add origin https://github.com/alas-poor-ophelia/wayfinder.git
   git push -u origin main
   ```
5. **Tag and push** — the tag MUST equal the manifest version, no `v` prefix:
   ```
   git tag 1.0.1
   git push origin 1.0.1
   ```
6. **Watch the Action.** It guards `tag == manifest.version`, builds, and creates
   the release. Confirm the three assets are attached and the release is **not**
   marked pre-release (pre-releases hide from the main repo page and from BRAT).
7. **Smoke-test via BRAT** in a clean vault: *BRAT: Add a beta plugin* →
   `alas-poor-ophelia/wayfinder` → enable → open the sheet.

To cut later versions: bump `manifest.json`, add a `versions.json` entry, commit,
then tag with the new version.

## 2. wayfinder-rules (spell + maneuver note pack)

A plain content repo (already created at `alas-poor-ophelia/wayfinder-rules`).
The plugin's README points users here to clone or download the notes and set
**Settings → Wayfinder → Spells folder** (and **Maneuvers folder** for Path of
War).

1. **Refresh the notes.** From the vault, copy into the matching repo folders:
   - `MiniSheet Dev/MiniSheet/z_Components/database/spells/` → `spells/` (~2,829 `.md`).
   - `MiniSheet Dev/MiniSheet/z_Components/database/maneuvers/` → `maneuvers/`
     (~413 `.md`, in discipline subfolders).
   Each note set lives under its own folder so the repo can hold more later.
2. **Keep `NOTICE.md` Section 15 current.** Spells are Paizo OGC; the maneuvers
   add **Path of War © 2014** and **Path of War: Expanded © 2016, Dreamscarred
   Press** (the notes span both books). `OGL-1.0a.txt` and `NOTICE.md` are
   already in the repo — update them, don't recreate.
3. **(Optional) Packaged ZIP per release.** Drop the workflow below at
   `.github/workflows/package.yml`, then `git tag 1.0 && git push origin 1.0` to
   attach a `wayfinder-rules.zip`. Without it, users can still use GitHub's
   *Code → Download ZIP*.

```yaml
name: Package rules
on:
  push:
    tags:
      - "*"
permissions:
  contents: write
jobs:
  package:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Zip notes
        run: zip -r wayfinder-rules.zip . -x ".git/*" ".github/*"
      - name: Create release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh release create "${GITHUB_REF_NAME}" \
            --title "${GITHUB_REF_NAME}" \
            --notes "Wayfinder rules notes ${GITHUB_REF_NAME}." \
            wayfinder-rules.zip
```

## Notes / gotchas

- **Tag = version, no `v`.** Obsidian's community manifest and BRAT both expect the
  release tag to equal `manifest.json` `version` exactly. The plugin workflow fails
  fast if they disagree.
- **README lives in two places.** The canonical copy is in the vault; this repo's
  `README.md` is a copy for GitHub. When you edit one, copy it across (the
  `readme-images/` set too).
- **Community directory** submission (later) is a separate PR to
  `obsidianmd/obsidian-releases` adding an entry to `community-plugins.json`. Not
  needed for the BRAT-based launch.
