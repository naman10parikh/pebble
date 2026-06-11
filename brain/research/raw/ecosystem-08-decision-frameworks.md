# ecosystem-08 — Decision Frameworks: RN vs PWA vs Bare vs Flutter + Monorepo Setups

## Part A — RN (Expo) vs Bare RN vs PWA vs Flutter

### The honest trade-off matrix (2026)

| Axis | Expo (managed RN) | Bare RN | PWA | Flutter |
|---|---|---|---|---|
| Time-to-ship | **Fastest** (EAS, OTA, dev builds) | Slow (manage native yourself) | Fast (web skills) | Medium |
| Native device APIs | Full (config plugins + native modules) | Full | **Limited** (iOS lags: push/bg-sync gaps; NFC/HealthKit native-only) | Full |
| Raw render perf | Good (New Arch + Hermes V1) | Good | Good for content; weaker for heavy interaction | **Near-native** (compiled, own renderer) |
| Code/skill reuse | JS/TS + React | JS/TS + React | JS/TS + web | Dart (new language) |
| App-store presence | Yes | Yes | **No** (web install only) | Yes |
| Cost (2026 est.) | Low–medium | Medium–high | **40–60% of dual-native** | Medium |
| OTA updates | **Yes (EAS Update)** | Yes (CodePush-style) | N/A (it's the web) | Limited |

Sources: [topflightapps PWA vs Native 2026](https://topflightapps.com/ideas/native-vs-progressive-web-app/),
[instinctools PWA vs Native 2026](https://www.instinctools.com/blog/pwa-vs-native-app/),
[techaheadcorp Flutter vs RN 2026](https://www.techaheadcorp.com/blog/flutter-vs-react-native-in-2026-the-ultimate-showdown-for-app-development-dominance/),
[strv Native/RN/Flutter/PWA](https://www.strv.com/blog/is-native-react-native-flutter-or-pwa-right-for-you-engineering-business).

### The 2026 PWA caveat (important nuance)
The PWA-vs-native gap **narrowed in 2026**: the web platform now supports push across all major
browsers, background sync, file-system access, Bluetooth/USB/NFC, and some AR — and **EU regulatory
pressure pushed Apple to open iOS to PWAs further.** BUT on iOS, PWAs **still** have rougher push,
no/limited background sync, and **NFC / advanced sensors / HealthKit remain native-only.** For
*content* apps (e-commerce, news, blogs, creators) a PWA is often the right, cheaper call; for
*hardware/AR/on-device-ML* apps it isn't viable. Source:
[topflightapps](https://topflightapps.com/ideas/native-vs-progressive-web-app/),
[progressier PWA vs Native table](https://progressier.com/pwa-vs-native-app-comparison-table).

### Decision rule (for the pebble harness)
- **Needs camera/GPS/sensors/HealthKit/NFC, AR/VR, on-device ML, or heavy real-time UI** → native
  cross-platform (**Expo RN** is the default; bare RN only if you need a native bit Expo can't config).
- **Content-first, SEO matters, budget-constrained, flaky-connectivity users** → **PWA**.
- **Flutter** wins on **raw render perf** (3D/games, custom-painted UI) but costs a **new language
  (Dart)** and forfeits JS/React reuse — only choose it when render perf is the dominant constraint
  AND the team has no React investment to protect.
- **Why Expo over bare RN** in 2026: EAS Build/Submit/Update, dev clients, config plugins, and the
  New-Arch-correct dependency resolution remove ~all the native-toolchain pain that justified bare RN
  historically. Bare RN is now a deliberate escape hatch, not the default.

### Flutter-vs-RN momentum (one-line, as requested "in passing")
Both are healthy in 2026; RN's pitch is **JS/React reuse + OTA + Expo DX**, Flutter's is
**compiled near-native perf + single renderer**. For an org already on React/TypeScript (like the
Energy fleet), **RN/Expo is the lower-friction choice** — Flutter's Dart requirement is the deciding
cost. (Synthesis from the comparison sources above.)

## Part B — Monorepo React Native setups

### The canonical reference
**`byCedric/expo-monorepo-example`** — **991★, pushed 2026-06-10** (actively maintained by an Expo
team member). "Fast pnpm monorepo for cross-platform apps built with Expo / React Native." This is
*the* reference to copy. Source:
[github.com/byCedric/expo-monorepo-example](https://github.com/byCedric/expo-monorepo-example).

### Folder structure (Expo's official recommendation)
```
my-monorepo/
  apps/
    mobile/            # the Expo app
    web/               # optional web app
  packages/
    ui/                # shared components
    config/            # shared tsconfig/eslint
  package.json         # workspaces root
  pnpm-workspace.yaml
```
Supported package managers: **Bun, npm, pnpm, Yarn (v1 + Berry)**. Source:
[docs.expo.dev/guides/monorepos](https://docs.expo.dev/guides/monorepos/).

### Metro config — SDK 52+ auto-configures it
**On SDK 52+ you do NOT manually configure Metro for monorepos** — `expo/metro-config` handles it. If
migrating an old project, **delete** these from `metro.config.js` then `npx expo start --clear`:
`watchFolders`, `resolver.nodeModulesPath`, `resolver.extraNodeModules`,
`resolver.disableHierarchicalLookup`. Source:
[docs.expo.dev/guides/monorepos](https://docs.expo.dev/guides/monorepos/).

For **pre-52** SDKs (manual):
```js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const monorepoRoot = path.resolve(__dirname, '../..');
const config = getDefaultConfig(__dirname);
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
module.exports = config;
```

### ⚠️ pnpm gotcha — use the hoisted node-linker
pnpm's **default isolated/symlink layout breaks RN tooling** (which expects a flatter `node_modules`).
Fix in `pnpm-workspace.yaml`:
```yaml
nodeLinker: hoisted
```
**Do NOT set `disableHierarchicalLookup: true`** — it stops pnpm from finding packages in the store.
**Pin `react` and `react-native` to single versions** to avoid multiple instances running at once.
Source: [docs.expo.dev/guides/monorepos](https://docs.expo.dev/guides/monorepos/),
[callstack — RN monorepo with pnpm](https://www.callstack.com/blog/react-native-monorepo-with-pnpm-workspaces).

### ⚠️ EAS Build + pnpm gotcha
**EAS Build internally assumes Yarn, not pnpm**, and may not understand the pnpm layout. Plan for
this: either keep a yarn-compatible lockfile path, or follow byCedric's example which is tuned to
build cleanly on EAS with pnpm. Source:
[dev.to — Working Expo + pnpm Workspaces](https://dev.to/isaacaddis/working-expo-pnpm-workspaces-configuration-4k2l),
[callstack](https://www.callstack.com/blog/react-native-monorepo-with-pnpm-workspaces).

### Turborepo
**pnpm (global store install speed) + Turborepo (task running + caching)** is the standard combo;
Turbo caches task outputs and skips reruns when inputs are unchanged. Source:
[Areesh Alam — RN monorepo with Turbo+pnpm+Expo](https://medium.com/code-sense/how-i-finally-got-a-react-native-monorepo-working-with-turbo-pnpm-and-an-expo-shell-after-c8afd85522ea).

### Relevance to pebble / the Energy fleet
The Energy repo is a **pnpm monorepo** (per CLAUDE.md). A pebble mobile app dropped into it should
follow **byCedric's pnpm-hoisted pattern** and **expect the EAS-assumes-Yarn friction** — budget for
it rather than discovering it at the first cloud build.

## "Could not confirm"
- Precise 2026 market-share split RN vs Flutter (sources give directional momentum, not a single
  authoritative %; treat the "both healthy, RN = React reuse, Flutter = perf" framing as the safe claim).
- Whether `nodeLinker: hoisted` belongs in `pnpm-workspace.yaml` vs `.npmrc` for the **current** pnpm
  major (Expo docs show `pnpm-workspace.yaml`; some pnpm versions read it from `.npmrc` — verify
  against the installed pnpm version).
