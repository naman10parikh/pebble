# ecosystem-09 — Best Starter / Template / Example Repos

> GitHub stats captured via `gh repo view` on 2026-06-11 (stars + last push = ground truth, not
> a stale listicle). "Last push" matters as much as stars — a 20k-star repo abandoned 2 years ago
> is worse than a 4k-star repo pushed this week.

## The shortlist (ranked by fit for a production AI mobile app)

### 1. `obytes/react-native-template-obytes` — **the default pick**
- **4,216★ · pushed 2026-06-02** (actively maintained by Obytes, a mobile agency).
- Stack: **Expo + pnpm + TypeScript + NativeWind/Tailwind + expo-router + EAS + GitHub Actions +
  env-vars + TanStack Query + react-hook-form + Zustand + react-native-mmkv + i18next**.
- Why: "the most production-grade *free* RN starter" — **every tool is actually configured, not just
  installed.** Multi-environment builds (prod/staging/dev), Husky + lint-staged, 10+ preconfigured
  GH Actions. It's the baseline every paid boilerplate gets compared to.
- **Best match for pebble** because it already aligns with the Energy fleet's pnpm + TS + EAS stack.
- Source: [github.com/obytes/react-native-template-obytes](https://github.com/obytes/react-native-template-obytes),
  [shipnative — Best RN Boilerplate 2026](https://www.shipnative.app/resources/research/best-react-native-boilerplate-2026).

### 2. `t3-oss/create-t3-turbo` — **full-stack monorepo (RN + web + API)**
- **6,058★ · pushed 2026-06-10** (extremely active).
- T3 stack + **Expo React Native** in a **Turborepo** monorepo, sharing types/API between a Next.js
  web app and the mobile app (tRPC end-to-end typesafety).
- Why: if pebble needs a **shared backend + web + mobile** in one repo, this is the canonical
  Turborepo reference (pairs with the monorepo guidance in `ecosystem-08`).
- Source: [github.com/t3-oss/create-t3-turbo](https://github.com/t3-oss/create-t3-turbo).

### 3. `infinitered/ignite` — **battle-tested, opinionated boilerplate + CLI**
- **19,828★ · pushed 2026-06-07** (Infinite Red; 9+ years continuous development).
- Comes with a **CLI + component/model generators**. "Ignite 11 (Bison)" includes Expo, full Android
  edge-to-edge, New Architecture on by default.
- Why: pick it when you want a respected base and your team is happy wiring product pieces. Heavier /
  more opinionated than Obytes.
- Source: [github.com/infinitered/ignite](https://github.com/infinitered/ignite),
  [infinite.red/ignite](https://infinite.red/ignite).

### 4. `byCedric/expo-monorepo-example` — **the pnpm-monorepo reference** (see `ecosystem-08`)
- **991★ · pushed 2026-06-10** (Expo team member). The cleanest pnpm-hoisted, EAS-buildable Expo
  monorepo to copy structure from.
- Source: [github.com/byCedric/expo-monorepo-example](https://github.com/byCedric/expo-monorepo-example).

### 5. `expo/examples` — **official per-API example projects**
- **3,641★ · pushed 2026-06-04** (Expo official). Small focused examples showing how to use each
  Expo API + integrations. Use as a lookup when wiring a specific capability, not as a full app base.
- Source: [github.com/expo/examples](https://github.com/expo/examples).

## ⭐ The one the pebble harness must ingest: `expo/skills`
- **`expo/skills` — 2,052★ · pushed 2026-06-11 (today).** "A collection of **AI agent skills** for
  working with Expo projects and Expo Application Services."
- This is the **official Expo agent-skills repo** announced in the SDK 55 changelog. It is purpose-
  built for **Claude Code / AI agents** to operate Expo + EAS. **pebble should vendor/reference these
  skills directly** rather than re-deriving EAS workflows.
- Source: [github.com/expo/skills](https://github.com/expo/skills),
  [expo.dev/changelog/sdk-55](https://expo.dev/changelog/sdk-55).

## The "just start" path (no template)
For a clean SDK-56 app with the modern defaults (expo-router, Native Tabs, Expo UI, `/src`):
```sh
npx create-expo-app@latest my-app
```
The **default `create-expo-app` template** in SDK 56 already ships expo-router + Expo UI primitives +
the `/src` structure — for many cases you don't need a third-party template at all. The mirror repo
`expo/expo-template-default` (31★, pushed 2026-06-10) just mirrors what `create-expo-app` produces;
file issues against `expo/expo`. Source:
[expo.dev/changelog/sdk-56](https://expo.dev/changelog/sdk-56).

## Reference scale (for context)
- **`expo/expo` — 50,000★ · pushed 2026-06-11** (the monorepo itself; where all Expo issues live).

## Modern-stack consensus (2026)
**Expo Router + NativeWind 4 + TypeScript** is what most new Expo projects default to; TS is
effectively required by RN job listings. Source:
[shipnative](https://www.shipnative.app/resources/research/best-react-native-boilerplate-2026),
[nativelaunch — Best Expo Templates 2026](https://nativelaunch.dev/best-expo-templates).

## A note on a *stale* repo (the cautionary contrast)
- `ixartz/React-Native-Boilerplate` — 405★ but **last pushed 2025-08-31** (~10 months stale at
  capture). Decent DX features (Detox, NativeWind) but **not tracking the SDK 55/56 New-Arch-only
  world** — a concrete example of why "stars" without "last push" misleads. Source:
  [github.com/ixartz/React-Native-Boilerplate](https://github.com/ixartz/React-Native-Boilerplate).

## "Could not confirm"
- Exact feature parity of each template against **SDK 56** specifically (Obytes/Ignite/t3-turbo were
  all pushed within ~2 weeks of capture, so they're current, but a per-template "supports SDK 56"
  assertion should be re-checked at use time against each repo's README).
