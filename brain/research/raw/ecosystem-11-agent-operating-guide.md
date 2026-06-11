# ecosystem-11 — What an AGENT Operating These Tools Must Know

> **This is the load-bearing file.** Everything else is context; this is the muscle memory. The
> recurring failure mode for an agent driving RN/Expo/EAS is **hanging on an interactive TTY prompt**
> or **authenticating wrong in a headless context**. Every command below is chosen to avoid that.

## Rule 0 — version ground truth before quoting

```sh
npm view react-native version      # latest RN
npm view expo dist-tags --json     # SDK -> version map
npm view eas-cli version           # EAS CLI
```
**Do not state a version from memory.** npm's `latest` can be *ahead* of the release blog (RN 0.86
was on npm 2 days before its blog post). npm is the source of truth for *availability*.

## Authentication in a headless/agent context

- **`EXPO_TOKEN`** — create a **personal access token** in your Expo account, export it as
  `EXPO_TOKEN`. The EAS CLI then authenticates **without an interactive login**. This is THE way an
  agent authenticates. Source: [docs.expo.dev/build/building-on-ci](https://docs.expo.dev/build/building-on-ci/).
- **Apple credentials (only if EAS must repair provisioning):** `EXPO_ASC_API_KEY_PATH`,
  `EXPO_ASC_KEY_ID`, `EXPO_ASC_ISSUER_ID`, `EXPO_APPLE_TEAM_ID`, `EXPO_APPLE_TEAM_TYPE`. Prefer the
  **App Store Connect API Key** over Apple-ID+2FA (2FA cannot be automated).
- **Google (Android submit):** a **service-account JSON** path in `eas.json` submit config.

## The non-interactive flag cheatsheet (memorize)

| Flag / env | Effect | Why an agent needs it |
|---|---|---|
| `--non-interactive` | No prompts; fail instead of asking | **Prevents hangs.** Use on EVERY eas command. |
| `--no-wait` | Return after triggering the build, don't block | Don't burn wall-clock/CI minutes waiting; poll later |
| `--json` | Machine-readable stdout (logs → stderr) | Parse build id / status programmatically |
| `--profile <name>` | Pick an `eas.json` build profile | `development` / `preview` / `production` |
| `--platform ios\|android\|all` | Target platform(s) | |
| `--local` | Build on this machine, not EAS cloud | Offline / no-cloud builds |
| `--latest` | (submit) pick the most recent build | Auto-select for submit |
| `EAS_NO_VCS=1` | Skip VCS requirement | **Local builds in a dir without git** (or dirty tree) |
| `EXPO_TOKEN=…` | Auth | Headless auth |

Source: [docs.expo.dev/build/building-on-ci](https://docs.expo.dev/build/building-on-ci/),
[expo/eas-cli](https://github.com/expo/eas-cli).

## Canonical commands

### Scaffold
```sh
npx create-expo-app@latest my-app          # SDK-56 default template (expo-router + Expo UI + /src)
cd my-app
npx expo install <pkg>                       # ALWAYS use 'expo install', not 'npm install', for native deps
npx expo-doctor@latest                       # validate deps vs React Native Directory (New-Arch compat)
```
> **`npx expo install` over `npm install`** is non-negotiable for native deps — it resolves the
> SDK-correct, New-Arch-compatible version. Hand-`npm install`ing a native lib is the #1 way to land
> an incompatible combo. (`ecosystem-02`)

### Build (cloud)
```sh
# CI/agent: trigger and don't wait
EXPO_TOKEN=$TOK npx eas-cli build --platform all --profile preview --non-interactive --no-wait --json
# poll status later
npx eas-cli build:list --limit 1 --json --non-interactive
npx eas-cli build:view <BUILD_ID> --json
```

### Build (local, no cloud)
```sh
EAS_NO_VCS=1 npx eas-cli build --platform ios --profile development --local --non-interactive
# or the pure-Expo local run (compiles + launches on simulator):
npx expo run:ios --simulator
npx expo run:android
```

### Submit to stores
```sh
# iOS -> TestFlight/App Store Connect (needs ascAppId + ASC API key)
npx eas-cli submit --platform ios --latest --non-interactive
# Android -> Play (needs service-account JSON; first upload must be manual)
npx eas-cli submit --platform android --latest --non-interactive
```

### OTA update (note the MANDATORY --environment since SDK 55)
```sh
npx eas-cli update --channel production --message "Fix X" --environment production --non-interactive
```
**Omitting `--environment` fails on SDK 55+.** (`ecosystem-05`)

### Credentials
```sh
npx eas-cli credentials                      # manage iOS/Android signing (interactive; pre-seed for CI)
npx eas-cli env:list                         # EAS environment variables
```

## iOS Simulator automation (how an agent "sees" the app)

1. **Make a simulator-installable build:** in `eas.json`, set `ios.simulator: true` on a profile
   (plus `developmentClient: true` + `distribution: "internal"` for a dev build):
   ```json
   { "build": { "sim": { "developmentClient": true, "distribution": "internal",
       "ios": { "simulator": true } } } }
   ```
2. **Build it:** `npx eas-cli build --platform ios --profile sim --non-interactive`.
3. **Install on the booted simulator** (non-interactive path):
   ```sh
   npx eas-cli build:run --platform ios --latest          # downloads + installs on simulator
   # or fully manual:
   tar -xvf app.tar.gz
   xcrun simctl install booted path/to/YourApp.app
   xcrun simctl launch booted <bundle.id>
   ```
4. **Simulator control with `simctl`** (the agent's hands):
   ```sh
   xcrun simctl list devices                  # find/boot a device
   xcrun simctl boot "iPhone 16"
   xcrun simctl io booted screenshot out.png  # SCREENSHOT — how the agent verifies UI as a user
   xcrun simctl openurl booted "myapp://path" # deep-link test
   ```
Source: [docs.expo.dev/build-reference/simulators](https://docs.expo.dev/build-reference/simulators/),
[docs.expo.dev/tutorial/eas/ios-development-build-for-simulators](https://docs.expo.dev/tutorial/eas/ios-development-build-for-simulators/).

> **`xcrun simctl io booted screenshot` is the agent's QA primitive** — it satisfies the "test as a
> USER, take a screenshot, READ it" discipline for a mobile app. The harness should screenshot after
> every meaningful nav and inspect it, exactly as the web harness screenshots prod.

### Android emulator equivalents
```sh
emulator -list-avds && emulator -avd <name>
adb install app.apk
adb shell am start -n <pkg>/.MainActivity
adb exec-out screencap -p > out.png          # screenshot
adb shell am start -a android.intent.action.VIEW -d "myapp://path"   # deep link
```

## UI / E2E testing (the user-flow layer)
- **Maestro** is the de-facto mobile E2E tool for Expo dev builds (flows in YAML; runs on sim +
  device). Pairs with a simulator dev build. Source:
  [maestro.dev — Running Maestro UI Tests in an Expo Dev Build](https://maestro.dev/blog/running-maestro-ui-tests-in-an-expo-development-builds).
- **Detox** is the older RN-native E2E option (gray-box). Some boilerplates (ixartz) still ship it.

## EAS + agent tooling (use these, don't re-derive)
- **`expo/skills`** (2,052★, pushed today) — **official Expo AI-agent skills for Claude Code** to
  drive Expo + EAS. The pebble harness should vendor/reference these. (`ecosystem-09`)
- **Expo MCP Server** — query EAS services + **TestFlight crashes** programmatically. Wire it into the
  harness `.mcp.json` so the agent can read build status + crash reports without scraping. (`ecosystem-05`)

## The agent's pre-flight checklist (run before any build/ship)
1. `npm view expo dist-tags` + `npm view react-native version` — confirm versions.
2. `npx expo-doctor@latest` — New-Arch compat + dep health.
3. `EXPO_TOKEN` set? Apple ASC key / Google service-account JSON in place?
4. Every `eas`/`expo` command has `--non-interactive` (and `--no-wait`/`--json` where building).
5. `eas update` calls include `--environment`.
6. After build: `build:run` → `simctl screenshot` → **read the screenshot** before declaring success.
7. Before OTA: did anything native change? If yes, **rebuild + bump runtimeVersion**, don't OTA.

## "Could not confirm"
- The exact current `eas.json` schema key for simulator on **SDK 56** (`ios.simulator: true` is the
  long-standing key and was confirmed in the simulators doc; verify against the live
  `docs.expo.dev/build-reference/simulators` at use time in case 56 renamed it).
- Whether `--no-wait` is honored identically by `eas submit` (it's documented for `eas build`;
  confirm before relying on it for submit).
