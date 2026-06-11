# pebble — Memory (pointer)

> The canonical bootstrap memory is **`memory/MEMORY.md`** (≤ ~1,500 words: the SDK-53→56 era-delta,
> the 5 breakage categories, Rule 0, the OTA wall, the headless reflexes). This file is a thin pointer
> kept for the inherited loop-files layout — do not duplicate the bootstrap here.

## Where pebble's memory lives

- **Bootstrap (load first):** `memory/MEMORY.md` — the facts pebble must hold before any task.
- **Queryable expertise brain:** `brain/*.md` — search it via `pebble brain "<query>"`
  (BM25 over the brain, wired through `scripts/memory-search.sh`). This is the deep store:
  EXPERTISE-MAP · BATTLE-TESTED-SCENARIOS · KNOWN-PITFALLS · OPINIONS · GAPS-AND-DISPUTES · TOOL-MATRIX.
- **Session learnings:** `memory/LEARNINGS.md`, `memory/daily/*.md`, `memory/topics/*.md`.

## Rule 0 (the one fact that overrides recall)

Training memory is **one era behind** (SDK 53 / RN 0.80). Never quote a version from memory —
`npm view react-native version` / `npm view expo dist-tags --json` / `npm view eas-cli version`
**before** quoting any version. (`brain/KNOWN-PITFALLS.md` §0, §9.)
