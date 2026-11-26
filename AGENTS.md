# AGENTS.md

This repository is a JS library, a CLI and an agent skill. Agent instructions are in `SKILL.md`.

## Working in this repo

- Zero dependencies, no build. `src/camelot.js` must stay a single import-free ES module (it runs in browsers).
- Tests: `node test/run.js`. Every key mapping is checked round-trip over all 24 keys; keep it that way.
- The README chart and examples are real output of the CLI; regenerate them if behaviour changes.
- Author is HablaMusic <support@hablamusic.com>; no personal names.
