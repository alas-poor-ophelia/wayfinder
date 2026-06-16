# Release runbook

How to cut a release for **Wayfinder** (the plugin) and **wayfinder-rules** (the
spell/rules note pack). Internal doc — not shipped to users.

## 0. Pre-flight (green as of this prep)

```
bun run check        # typecheck + lint + unit tests  -> 844 tests passing
bun run build:prod   # emits main.js (~3.6 MB) + styles.css (~320 KB)
```

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
3. **Confirm versions agree.** `manifest.json` `version` (currently `0.8.0`),
   `versions.json` (`"0.8.0": "1.4.11"`), and `package.json` `version` should match.
4. **Create the GitHub repo** `alas-poor-ophelia/wayfinder`, then:
   ```
   git remote add origin https://github.com/alas-poor-ophelia/wayfinder.git
   git push -u origin main
   ```
5. **Tag and push** — the tag MUST equal the manifest version, no `v` prefix:
   ```
   git tag 0.8.0
   git push origin 0.8.0
   ```
6. **Watch the Action.** It guards `tag == manifest.version`, builds, and creates
   the release. Confirm the three assets are attached and the release is **not**
   marked pre-release (pre-releases hide from the main repo page and from BRAT).
7. **Smoke-test via BRAT** in a clean vault: *BRAT: Add a beta plugin* →
   `alas-poor-ophelia/wayfinder` → enable → open the sheet.

To cut later versions: bump `manifest.json`, add a `versions.json` entry, commit,
then tag with the new version.

## 2. wayfinder-rules (spell/rules note pack)

A plain content repo. The plugin's README points users here to clone or download
the spell notes and set **Settings → Wayfinder → Spells folder**.

1. **Create** `alas-poor-ophelia/wayfinder-rules`.
2. **Copy the notes in.** From the vault:
   `MiniSheet Dev/MiniSheet/z_Components/database/spells/` (~2,829 `.md` files).
   Keep them in a clearly named folder, e.g. `spells/`, so the repo can hold other
   loose note sets later (rules, feats, …) without restructuring.
3. **Add** a short `README.md` (what this is, how to point the Spells folder at it),
   the **`OGL-1.0a.txt`** and a `NOTICE` crediting Open Game Content — copy
   `LICENSES/OGL-1.0a.txt` and `LICENSES/NOTICE.md` from this repo as the basis.
4. **(Optional) Packaged ZIP per release.** Drop the workflow below at
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
