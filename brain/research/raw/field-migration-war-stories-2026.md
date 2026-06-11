# Field Intelligence — Migration War Stories (2026)

> Scope: real timelines + what actually broke migrating to the New Architecture, Reanimated
> 3→4, RN 0.85, and bare→Expo. June-2026 currency. Compiled CP123 Wave-R.
> Every claim carries URL + date/source.

---

## 1. The forcing function: there is no opt-out anymore (2025→2026 invalidation)

- **Legacy architecture was frozen in June 2025**; new React/RN features land only on the New
  Architecture. (Expo "New Architecture" guide — https://docs.expo.dev/guides/new-architecture/ )
- **From React Native 0.82, the New Architecture is always enabled and cannot be disabled.**
  Expo **SDK 55 uses RN 0.83** and inherits this. **Expo SDK 55 dropped the legacy architecture
  entirely.** (byteiota "Expo SDK 55: Legacy Architecture Is Gone"
  https://byteiota.com/expo-sdk-55-legacy-architecture-is-gone-migrate-now/ ; reactnativerelay
  SDK 53→55 guide https://reactnativerelay.com/article/expo-sdk-55-migration-guide-breaking-changes-sdk-53-to-55 )
- **React Native 0.85 (released 2026-04-07)** is "the first stable release built **entirely on
  the new architecture, with no bridge fallback**." The bridge serialization model is gone.
  (bacancytechnology https://www.bacancytechnology.com/blog/react-native-0-85 )

> Any 2024-era advice that says "you can keep `newArchEnabled: false`" is **dead** in 2026. The
> only question left is *when* you migrate, not *whether*.

---

## 2. Real timeline: a 2-dev team, 12 days, exactly what broke (the best war story)

Source: amillionmonkeys, "React Native New Architecture: What Actually Changed When We Migrated"
— https://www.amillionmonkeys.co.uk/blog/react-native-new-architecture-migration

- **Total time: 12 days, 2 developers.** Breakdown given as: "Dependency research & planning: 1
  day" … through "QA & final testing: 1 day."
- **Libraries that REQUIRED REPLACEMENT (not just bump):**
  - `react-native-camera` (unmaintained) → `react-native-vision-camera`
  - `AsyncStorage` (deprecated) → `MMKV`
- **Libraries that required breaking UPDATES:**
  - Firebase **v18 → v20** ("breaking config changes")
  - `react-native-maps` **v1.3 → v1.8** ("API changes")
  - `react-native-permissions` **v3.x → v4.x**
- **Worked immediately (no change):** React Navigation (v6.3+), Zustand, React Query, Reanimated
  (v3.6+).
- **Surprises (verbatim):**
  - "Budget 30-50% of migration time just for dependency wrangling."
  - PropTypes "were completely removed — The New Architecture enforces TypeScript types through
    Codegen."
  - iOS builds needed aggressive cache clearing; Metro needed
    `npx react-native start --reset-cache` to resolve modules.
  - Concurrent rendering "exposed edge cases in state management that required ensuring cleanup
    in useEffect return functions."
- **Measured perf (why it's worth it):**
  - iOS cold start **1,840ms → 1,520ms (17% faster)**; list scrolling 60fps frames **73% → 89%**.
  - Android cold start **2,340ms → 1,780ms (24% faster)**.
- **Their verdict (TASTE, verbatim):** "For new projects, absolutely use the New Architecture."
  For existing apps, migrate "opportunistically — when we have a planned feature update and the
  dependencies align."

> Cross-check on duration: other 2026 sources put **most migrations at 2–8 weeks depending on
> custom native code** (agilesoftlabs https://www.agilesoftlabs.com/blog/2026/03/react-native-new-architecture-migration ;
> impacttechlab https://impacttechlab.com/react-native-new-architecture-app-performance/ ). The
> 12-day figure is a *small/medium app with mostly-compatible deps*. Heavy custom-native apps
> are weeks-to-months. **Don't quote 12 days as universal.**

---

## 3. The specific things that break on Fabric (the gotchas that produce silent failures)

Source: Janani Umapathy, "React Native Migration: Every Issue I Faced Moving to the New
Architecture" (Dev Genius / blog.devgenius.io) —
https://blog.devgenius.io/react-native-migration-every-issue-i-faced-moving-to-the-new-architecture-and-how-i-fixed-each-943874e52b2a
(content via search extract; the page hard-redirects through Medium's identity gate).

- **White screen, no crash, no error.** App builds and launches but renders a blank white screen
  with zero diagnostics — the worst kind of failure because there's nothing to grep.
- **Refs are always null / `ref.current.measure()` stopped working / `ActionSheetIOS` breaks.**
  Root cause: **Fabric's view flattening** — Fabric removes "unnecessary" `View` wrappers from
  the native hierarchy when they don't contribute to layout, so refs that pointed at those
  wrappers are now null. Fix: stop relying on flattened wrappers; use `collapsable={false}` on
  views you must keep in the native tree, or restructure to ref a view that survives flattening.
- **React 18 concurrent race conditions.** The Fabric renderer enables React 18 concurrent
  features, which "exposed race conditions in state management." Event listeners "weren't
  cleaning up correctly during fast screen transitions." Fix: proper `useEffect` cleanup +
  `AbortController` for async ops.
- **Every third-party native module must be audited first.** Check `reactnative.directory` and
  each library's GitHub issues for "new architecture" before enabling. (Same advice echoed by
  amillionmonkeys and Expo docs — `expo-doctor` integrates with React Native Directory to flag
  incompatible/untested libs.)

> The Fabric **view-flattening → null-ref** failure is the most-cited subtle migration bug in
> 2026 and produces *silent* breakage (white screen / dead ActionSheet) rather than a stack
> trace. Budget time to hunt these specifically.

---

## 4. Reanimated 3.x → 4.x — a migration inside the migration

Source: Software Mansion docs, "Migrating from Reanimated 3.x to 4.x"
(https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/ ) +
compatibility table (https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/ ).

- **Reanimated 4.x supports ONLY the New Architecture and drops Legacy entirely.** Legacy apps
  must stay on 3.x. So you cannot adopt Reanimated 4 until you've finished the Fabric migration —
  it's coupled.
- **New required dependency: `react-native-worklets`.** Worklets moved out of Reanimated into a
  separate package; you must install it and rebuild native.
- **Babel plugin change:** `'react-native-reanimated/plugin'` → `'react-native-worklets/plugin'`.
- **API renames (args now passed directly):** `runOnJS → scheduleOnRN`, `runOnUI → scheduleOnUI`,
  `runOnRuntime → scheduleOnRuntime`, `executeOnUIRuntimeSync → runOnUISync`,
  `makeShareableCloneRecursive → createSerializable`.
- **Removed APIs:** `useWorkletCallback` (use `useCallback` + `'worklet';`),
  `addWhitelistedNativeProps`/`addWhitelistedUIProps`, `combineTransition` (use
  `EntryExitTransition.entering().exiting()`), `useAnimatedGestureHandler` (migrate to Gesture
  Handler 2 `Gesture` API), **React Native V8 engine support**.
- **`withSpring` semantics changed:** `restDisplacementThreshold`/`restSpeedThreshold` → single
  `energyThreshold`; `duration` is now *perceptual* — **multiply old durations by 1.5** for
  equivalent feel. (This silently changes your animations even if it compiles.)
- **Worklet version-mismatch failure:** misaligned Reanimated/worklets versions cause runtime
  errors like **"duplicate worklet instances."** (search corroboration)
- **Reanimated 4.x supports only the three latest RN versions** — tight support window.

> Two coupled traps: (1) you can't take Reanimated 4 until Fabric is done; (2) even after it
> compiles, `withSpring` duration semantics changed, so animations *feel* different — a
> design-QA regression that won't show up in a build error.

---

## 5. RN 0.85 upgrade breakage (April 2026) — search-and-replace work

Source: bacancytechnology, "React Native 0.85" (release **2026-04-07**) —
https://www.bacancytechnology.com/blog/react-native-0-85

- **Jest preset extracted**: built-in preset moved to `@react-native/jest-preset` — install +
  configure separately or your tests break.
- **Node EOL drop**: requires Node ≥ v20.19.4; **Node 21 and 23 explicitly unsupported**.
- **`StyleSheet.absoluteFillObject` removed** → use `StyleSheet.absoluteFill`.
- **Android internals removed/hidden**: `ReactTextUpdate` now internal; `CatalystInstanceImpl`
  and other classes removed entirely (breaks anything reaching into them).

---

## 6. Bare → Expo migration (prebuild) — what bites

Source: search corroboration (Expo migration docs; oneuptime managed→bare guide
https://oneuptime.com/blog/post/2026-01-15-expo-managed-to-bare-workflow/view ;
rubyroidlabs "Scaling RN Without Expo" https://rubyroidlabs.com/blog/react-native-without-expo-legacy-risk/ ).

- **Prebuild-rebuild trap (SDK 53→54):** a known issue requires a *completely fresh* dev build —
  delete `android`, `ios`, `node_modules`, reinstall, `npx expo prebuild --clean`, rebuild.
  Half-measures leave stale native state and mysterious failures.
- **CodePush retired March 2025 + incompatible with New Architecture** → any bare app that used
  CodePush for OTA must move to EAS Update during the migration (see
  field-ota-update-boundaries-2026.md).
- **SDK major bumps are breaking** and need real cross-app testing; the Expo upgrade helper
  reduces but does not eliminate manual code changes.

---

## 7. The distilled migration playbook (taste across all sources)

1. **Dependency audit FIRST** (`reactnative.directory` + each lib's GitHub "new architecture"
   issues + `expo-doctor`). Budget **30–50% of total time** here — it's the real cost.
2. **Expect silent failures, not stack traces** — white screen, null refs from view flattening,
   "duplicate worklet instances," animations that feel different post-Reanimated-4.
3. **Couple your upgrades correctly:** Fabric → then Reanimated 4 → then RN 0.85; you can't
   reorder these.
4. **Plan native-module upgrades around EAS's Xcode/Node assignment** (see
   field-eas-build-failures-2026.md #3616).
5. **Migrate opportunistically on existing apps; New Arch by default on new apps.** (amillionmonkeys)

---

## Sources (this file)

- amillionmonkeys, "RN New Architecture: What Actually Changed When We Migrated" —
  https://www.amillionmonkeys.co.uk/blog/react-native-new-architecture-migration
- Janani Umapathy, "RN Migration: Every Issue I Faced…" (Dev Genius) —
  https://blog.devgenius.io/react-native-migration-every-issue-i-faced-moving-to-the-new-architecture-and-how-i-fixed-each-943874e52b2a
- Software Mansion, "Migrating from Reanimated 3.x to 4.x" —
  https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/
- Software Mansion, Reanimated compatibility table —
  https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/
- bacancytechnology, "React Native 0.85" (2026-04-07) —
  https://www.bacancytechnology.com/blog/react-native-0-85
- Expo, "React Native's New Architecture" — https://docs.expo.dev/guides/new-architecture/
- byteiota, "Expo SDK 55: Legacy Architecture Is Gone" —
  https://byteiota.com/expo-sdk-55-legacy-architecture-is-gone-migrate-now/
- reactnativerelay, "Expo SDK 55 Migration Guide: 53 to 55" —
  https://reactnativerelay.com/article/expo-sdk-55-migration-guide-breaking-changes-sdk-53-to-55
- agilesoftlabs, "RN New Architecture Migration Guide (2026)" —
  https://www.agilesoftlabs.com/blog/2026/03/react-native-new-architecture-migration
- oneuptime, "Expo Managed to Bare Workflow" (2026-01-15) —
  https://oneuptime.com/blog/post/2026-01-15-expo-managed-to-bare-workflow/view
- rubyroidlabs, "Scaling RN Without Expo in 2026" —
  https://rubyroidlabs.com/blog/react-native-without-expo-legacy-risk/
