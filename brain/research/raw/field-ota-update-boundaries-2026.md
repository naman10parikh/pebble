# Field Intelligence — OTA Update Boundaries & Bricking Reality (Expo EAS Update, 2026)

> Scope: what OTA (EAS Update) can and cannot legally/technically do, real bricking incidents,
> the exact limits of automatic rollback, and the JS-vs-native boundary. June-2026 currency.
> Primary sources (expo/expo issues + Expo docs) outrank blogs. Compiled CP123 Wave-R.

---

## 1. The hard rule: OTA moves JS/assets, NEVER native code or features

Source: Expo docs + Abiodun Abdullahi production postmortem (Medium, **2026-04**,
https://medium.com/@biodunbio14/the-realities-of-ota-updates-with-expo-what-i-wish-i-knew-before-i-pushed-to-production-508561d7a043 ).

- OTA pushes **JavaScript, styles, and assets only — no native code.**
- Abdullahi's exact boundary rule (verbatim):
  > "If the change touches `package.json` dependencies, `app.config.js` plugins, or `ios/`/
  > `android/` folders, it is a binary release."
- The failure if you cross it: publishing an OTA that imports a new Expo module crashes the app
  with **"Native module cannot be null."** The JS references a native module that isn't in the
  installed binary.

### This is ALSO the Apple-compliance boundary

This technical limit lines up exactly with **Guideline 2.5.2** (see
field-store-review-ai-apps-2026.md). Apple permits OTA of *interpreted code/content* but
**not** code that "introduces or changes features or functionality." EAS Update stays legal
precisely because it can only ship JS/asset changes to an *already-reviewed* binary — it cannot
add native features. The moment you'd need new native capability, you must resubmit. (This is
why the vibe-coding apps got pulled: they delivered *new executable features* post-review.)

> The single most important pebble takeaway: **OTA = patch the reviewed JS. New capability =
> new binary + new review.** The technical wall and the policy wall are the same wall.

---

## 2. The runtimeVersion / fingerprint guardrail (and how it bites)

Source: Expo docs + reactnativerelay OTA guide
(https://reactnativerelay.com/article/react-native-ota-updates-eas-update-rollouts-rollbacks-cicd)
+ Abdullahi postmortem.

- The **fingerprint policy** hashes your native dependency graph + config plugins. Add a native
  module → fingerprint changes → runtimeVersion changes → **EAS refuses to send the new JS to
  old binaries.** This is the guardrail that *stops* you from bricking prod by shipping JS that
  needs absent native code.
- The **`appVersion` policy** gotcha (Abdullahi, two failure modes, verbatim):
  1. "Bumping `version` in `app.config.js` for OTA scopes it to a runtime version no user has
     yet" → your OTA reaches nobody.
  2. "Forgetting to bump `version` for new binary lets OTA reach old binary, causing crashes
     with 'Native module cannot be null'."
  - His rule: *"Change `version` only when shipping a new binary. OTAs carry the same `version`
    as the binary they patch."*

> TAKEAWAY: prefer the **fingerprint** runtimeVersion policy — it computes the native-compat
> boundary for you. The `appVersion` policy makes targeting a manual discipline that humans get
> wrong in exactly the two ways above.

---

## 3. Real bricking incidents (primary sources)

### #45772 — OTA crash on bundle activation, 100% reproducible, SDK 54 AND 55 (the bad one)

Source: expo/expo issue #45772 (dev-yenin / dev-yenin, opened **2026-05-14**) —
https://github.com/expo/expo/issues/45772

- Symptom: OTA updates **consistently crash on iOS at bundle activation on first launch after
  download.** Uncaught NSException on the `expo.controller.errorRecoveryQueue` during a
  `Data.write(to:options:)` op.
- Exact signature:
  > `Exception Type: EXC_CRASH (SIGABRT)` / `Triggered by Thread: 15 (Dispatch queue:
  > expo.controller.errorRecoveryQueue)` — origin: "expo-updates error recovery" logic,
  > Foundation `Data.write(to:options:)` in adjacent traces.
- Affected: **SDK 54 (expo-updates@29.0.17) AND SDK 55 (expo-updates@55.0.22), RN 0.83.6,
  Hermes + New Architecture enabled.**
- 100% reproducible: TestFlight install → delete/reinstall → publish JS-only OTA → keep app open
  ~60s to download → force-kill → reopen → crash within ~30s.
- Brutal scope: occurs with BOTH `Updates.reloadAsync()` and auto cold-start; **regardless of
  runtimeVersion policy (fingerprint OR appVersion)**; **persists with anti-bricking measures
  both enabled and disabled.** Dashboard shows "Known launches: 1, Known crashes: 1" and reverts
  to embedded bundle.
- Workaround: "OTA functionality is effectively unavailable; all JS changes require full
  `eas build` releases."
- Status: still open, labeled "incomplete issue: missing or invalid repro" (i.e., not yet
  fixed/triaged by Expo as of capture).

> This is the scariest 2026 OTA data point: a config where the *error-recovery queue itself*
> crashes, on the newest SDKs, with New Arch on — meaning the safety net is the thing that
> fails. If pebble ships on SDK 54/55 + New Arch, treat OTA as *not yet trustworthy on iOS*
> until this is resolved; gate it behind gradual rollout + crash monitoring.

### #42112 — SDK 55 dev-client boot crash when an OTA was previously selected

- "[SDK 55][iOS][expo-updates][expo-dev-client] Crash on boot when an OTA update was previously
  selected using the dev client." https://github.com/expo/expo/issues/42112

### #26231 — app crashing on first load after an OTA update

- "App crashing on first load after and OTA update with EAS." A longstanding flavor of the
  first-launch-after-OTA crash. https://github.com/expo/expo/issues/26231

---

## 4. What automatic rollback CANNOT save you from (the 10-second wall)

Source: Expo docs, "Error recovery" — https://docs.expo.dev/eas-update/error-recovery/ (verbatim).

How it works: expo-updates catches fatal JS errors within **~10 seconds of launch**, keyed on
whether the first view rendered ("content appeared"):
- **Before content appears**: failed update marked + skipped; checks for a newer update in a 5s
  window, downloads + reloads; if that also fails, rolls back to the last successful update.
- **After content appears**: checks for updates but does **NOT** auto-rollback (to avoid
  corrupting persistent state) — instead **crashes after 5s** or when download completes.

Hard limits (verbatim):
> "If more than 10 seconds have elapsed between your app's first render and the time a fatal
> error is thrown, `expo-updates` will not catch this error at all and none of the error
> recovery code will be triggered."

Cannot recover from:
- Crashes >10s post-launch.
- Updates that modified persistent state non-backwards-compatibly (rollback becomes unsafe).
- No older successful update exists on the device.
- Broken updates that corrupted local data before first render.

And the explicit disclaimer (verbatim):
> "The error recovery flow is intended to be as lightweight as possible. It is not a full
> safety net that protects your end users from the results of errors; in many cases, users will
> still see a crash."

> TAKEAWAY: auto-rollback only covers **fast, early, render-time** JS crashes that haven't
> mutated state. A bug that crashes 12s in, or after a bad migration to AsyncStorage/SQLite, is
> NOT covered — those users are stuck until they reinstall. Do not treat EAS rollback as a
> seatbelt for arbitrary OTA bugs.

---

## 5. Operational playbook distilled (from reactnativerelay + 72technologies + Abdullahi)

Sources: reactnativerelay OTA guide (above); 72Technologies "Expo EAS OTA Updates: A Safe
Production Playbook" (https://www.72technologies.com/blog/expo-eas-ota-updates-without-bricking-production );
Abdullahi postmortem.

1. **Gradual rollouts, always.** Don't 100% an OTA. Roll to a % and watch crash rate before
   widening. (reactnativerelay, 72technologies)
2. **Know your rollback before you need it**: `eas update --branch production --republish` (or
   `--branch production` republish of the prior bundle) reverts prod. Have it in a runbook.
3. **Never reload silently.** Abdullahi's v1 (silent apply) lost users' in-progress
   typing/scrolling on reload → use a foreground modal ("Update Now" / "Maybe Later").
4. **Check on every `AppState → "active"`, not just launch** — otherwise long-backgrounded users
   (weeks) never cold-start and never get the fix (his v2 failure: "working perfectly and helping
   no one").
5. **Skip the OTA check on a user's first launch** (AsyncStorage flag) — otherwise brand-new
   App-Store users see "Update Available" on screen one, because expo-updates compares against
   the *packaged* binary and any OTA published after the binary build looks like a pending update.
6. **Disable "Maybe Later" while downloading** to avoid orphaned/half-downloaded bundles.
7. **Monitor**: error rate per release; if it spikes, republish previous immediately.

---

## 6. The 2025→2026 invalidation: CodePush is DEAD

Source: search corroboration (multiple, incl. Expo migration docs / reactnativerelay) —
**CodePush was retired in March 2025 and is incompatible with React Native's New Architecture.**
EAS Update is the recommended replacement for remote JS updates. Any 2024-era guide that says
"use CodePush/AppCenter for OTA" is invalid in 2026 — AppCenter retired and CodePush does not
work with the New Architecture (which is mandatory from RN 0.82+). Plan OTA on **EAS Update
only**.

---

## Sources (this file)

- Expo docs, "Error recovery" (EAS Update) — https://docs.expo.dev/eas-update/error-recovery/
- expo/expo #45772 (2026-05-14) — https://github.com/expo/expo/issues/45772
- expo/expo #42112 — https://github.com/expo/expo/issues/42112
- expo/expo #26231 — https://github.com/expo/expo/issues/26231
- Abiodun Abdullahi, "The Realities of OTA Updates with Expo," Medium, 2026-04 —
  https://medium.com/@biodunbio14/the-realities-of-ota-updates-with-expo-what-i-wish-i-knew-before-i-pushed-to-production-508561d7a043
- React Native Relay, "EAS Update: RN OTA Updates Guide 2026" —
  https://reactnativerelay.com/article/react-native-ota-updates-eas-update-rollouts-rollbacks-cicd
- 72Technologies, "Expo EAS OTA Updates: A Safe Production Playbook" —
  https://www.72technologies.com/blog/expo-eas-ota-updates-without-bricking-production
