# ecosystem-10 — Top GitHub Issues Revealing Real-World Breakage

> Issues queried via `gh search issues` on 2026-06-11. These are what *actually* breaks — docs show
> the happy path; issues show the crashes. Each line: `[state] #num (date) — what it teaches`.
> **Method note:** `expo/expo` searched cleanly; **`facebook/react-native` search returned HTTP 422
> "Validation Failed"** at capture time (GitHub's search index intermittently rejects very large
> repos) — so RN-side breakage below is sourced from the confirmed changelog breaking-changes instead.

## New Architecture — runtime crashes (the recurring theme)

- **[closed] expo/expo #45313 (2026-05-08)** — "New Architecture Bridgeless runtime does not guarantee
  **FormData polyfill** availability during JS bundle evaluation … `[runtime not ready]` crash,
  SIGABRT." **Teaches:** under Bridgeless (New Arch), polyfills you assumed were globally present at
  bundle-eval time may not be — a class of crash that didn't exist on the old bridge.
- **[open] expo/expo #45314 (2026-05-03)** — "[expo-modules-core][iOS]
  `EXPermissionsService.registerRequesters`: **not thread-safe** — concurrent `RCTHost` init crashes
  app (SIGSEGV)." **Teaches:** New-Arch host init concurrency bugs surface as native SIGSEGV, hard to
  debug from JS.
- **[closed] expo/expo #46605 (2026-06-09)** — "Android **SIGSEGV in `expo::EventEmitter::emitEvent`
  on Fast Refresh** while React Native DevTools is attached." **Teaches:** a *dev-time* New-Arch crash
  tied to Fast Refresh + DevTools — can waste a debugging session if mistaken for app code.
- **[closed] expo/expo #46596 (2026-06-05)** — "[Android] Native crash:
  `ConcurrentModificationException` in `SharedObject::NativeState` teardown during
  **`Updates.reloadAsync()`**." **Teaches:** OTA reload path has New-Arch teardown races.

## EAS Update / OTA + runtimeVersion (fingerprint is the sharp edge)

- **[closed] expo/expo #43908 (2026-03-13)** — "[docs] why setting a **`runtimeVersion` policy of
  `fingerprint`** will cause the **dev server not to connect to Metro**." **Teaches:** the
  `fingerprint` policy (recommended for OTA safety in `ecosystem-05`) has a real DX gotcha — it can
  break the Metro dev-server connection. Know this before defaulting every project to `fingerprint`.
- **[open] expo/expo #33852 (2026-06-05)** — "**EAS fingerprint fails when using file-based secrets**."
  **Teaches:** fingerprint + secret-file workflows interact badly. Relevant to any agent wiring CI
  secrets.
- **[closed] expo/expo #40898 (2026-05-11)** — "**`npx @expo/fingerprint` non-deterministic** with
  Expo 54.0.22." **Teaches:** fingerprint hashing has had determinism bugs — a non-deterministic
  fingerprint silently changes your runtime version and can mis-target OTA updates.
- **[closed] expo/expo #34090 (2025-09-01)** — "**Missing `runtimeVersion` in Development Build after
  upgrading to SDK 52**." **Teaches:** SDK upgrades can drop the runtimeVersion from a dev build,
  breaking OTA targeting until reconfigured.

## expo-router — current open breakage (SDK 55/56)

- **[open] expo/expo #46791 (2026-06-11, today)** — "**[expo-router] Loaders don't work in layouts**."
  **Teaches:** data loaders in `_layout` files are currently broken — don't architect critical data
  loading in a layout loader yet.
- **[open] expo/expo #46481 (2026-06-02)** — "**[expo-codemod] `sdk-56-expo-router-react-navigation-
  replace` misses imports in some files (~25% of import sites)**." **Teaches:** the official SDK-56
  upgrade **codemod is incomplete** — after running it, ~1 in 4 import sites may be unmigrated. An
  agent must manually verify imports post-codemod, not trust it blindly.
- **[open] expo/expo #46621 (2026-06-09)** — "[expo-router/js-top-tabs]: **App crashes on fast going
  back**." **Teaches:** rapid back-navigation in JS top-tabs crashes — a real UX edge case.
- **[open] expo/expo #46284 (2026-05-26)** — "[expo-router] **Unknown empty space in FlatList inside
  Native tabs**." **Teaches:** FlashList/FlatList layout inside the new Native Tabs has insets/spacing
  bugs.
- **[open] expo/expo #46480 (2026-06-09)** — "[expo-router] **Export `createNativeStackNavigator`
  factory publicly**." **Teaches:** advanced navigator customization is currently gated — you can't
  cleanly drop to the underlying React Navigation factory.

## Metro + monorepo (the pnpm pain, confirmed in issues)

- **[closed] expo/expo #44500 (2026-04-09)** — "[expo-router][web] **Metro crash 'Cannot read
  properties of undefined (reading getPackage)' on expo>=55.0.10 in pnpm monorepo**." **Teaches:**
  concrete confirmation that **pnpm monorepos + expo-router + Metro** still break — matches the
  `nodeLinker: hoisted` guidance in `ecosystem-08`. This is not theoretical.
- **[closed] expo/expo #28775 (2025-12-22)** — "[expo-51] Android **unable to resolve module
  `expo-router/entry` inside monorepo**." **Teaches:** the classic monorepo module-resolution failure.
- **[closed] expo/expo #37407 (2026-01-27)** — "`SurfaceRegistryBinding::startSurface failed. Global
  was not installed`" on `npx expo start --dev-client`. **Teaches:** a cryptic New-Arch dev-client
  startup error often rooted in bundle/resolution issues.

## Push notifications (docs lie about Expo Go — confirmed)

- **[closed] expo/expo #41118 (2026-06-08)** — "[docs] **Push notifications docs say Expo Go can send
  push notifications in some places.**" **Teaches:** the docs themselves had stale claims that Expo Go
  supports push — confirming the `ecosystem-07` gotcha that **remote push needs a dev build** and even
  Expo's own docs were inconsistent about it.
- **[closed] expo/expo #41146 (2026-05-25)** — "[expo-notifications] **headless background push on
  Android can't execute `fetch` while app is in background**." **Teaches:** background-push + network
  fetch is constrained on Android.
- **[open] expo/expo #44621 (2026-04-23)** — "[docs] **notification linking on app cold start**
  unclear." **Teaches:** deep-linking from a notification tap on cold start is a known rough edge.

## Build-config (SDK 53 era, still instructive)

- **[closed] expo/expo #41382 (2026-06-08)** — "Android build fails on SDK 53 after installing
  **`expo-localization`**: `ExpoModulesPackageList references missing ExpoFetchModule` (New
  Architecture)." **Teaches:** adding a single config-plugin lib can break the New-Arch package list —
  run a clean prebuild after adding native libs.

## RN-side confirmed breaking changes (from changelog, since gh-search was unavailable)

- **RN 0.85: `StyleSheet.absoluteFillObject` removed** — code using it fails to build until migrated.
- **RN 0.85: Jest preset moved to a dedicated package** — CI test runs break until you install the
  new package and update the Jest config. (A very common silent CI breakage in this window.)
- **RN 0.84: min Node 22** — older CI images fail `npm install`.
- **RN 0.81 / SDK 54: first-party JSC removed** — JSC-dependent setups break; move to Hermes.
Source: [reactnative.dev/blog](https://reactnative.dev/blog),
[reactnativecrossroads — RN 0.85 changelog dive](https://reactnativecrossroads.com/posts/react-native-085-changelog-dive/).

## The meta-lesson for the agent
The dominant 2026 breakage categories are: **(1) New-Arch native crashes (SIGSEGV/SIGABRT) that look
like app bugs but aren't, (2) `fingerprint` runtimeVersion DX traps, (3) pnpm-monorepo Metro
resolution, (4) incomplete upgrade codemods, (5) Expo-Go push assumptions.** When something breaks,
check these five before deep-debugging app code.

## "Could not confirm"
- **High-engagement `facebook/react-native` issues** — `gh search`/`gh api search` returned HTTP 422
  for that repo at capture time. Re-run later, or browse
  [github.com/facebook/react-native/issues](https://github.com/facebook/react-native/issues) sorted by
  reactions, to fill this gap.
- Whether the listed **open** expo-router issues (#46791, #46621, #46284) are fixed in a patch after
  capture — recheck their status before relying on the workaround framing.
