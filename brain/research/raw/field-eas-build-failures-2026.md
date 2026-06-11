# Field Intelligence — EAS Build Failures at Scale (2026)

> Scope: real EAS Build failures from the expo/eas-cli + expo/expo issue trackers and the
> official troubleshooting docs, June-2026 currency. Primary sources (GitHub issues) outrank
> blog posts. Compiled CP123 Wave-R. Every claim carries URL + date.
> Collection method: `gh search issues --repo expo/eas-cli "build failed" --sort created`.

---

## 1. Infrastructure-side failures (your code is fine, EAS broke)

These are the ones that destroy a team's afternoon because nothing in *their* repo changed.

### "Prepare project" tar-extraction failures — the recurring EAS-side killer

Three separate dated issues, same failure class — EAS's project-unpack step on the build VM
fails with a `tar` exit code, no code change on the user side:

- **#3529** (antoinevds, **2026-03-23**): "All EAS builds fail at 'Prepare project' — tar
  extraction error (exit code 2) since 22/03/2026 — no code changes." Exact log:
  > `tar -C /home/expo/workingdir/build --strip-components 1 -zxf /home/expo/workingdir/project.tar.gz exited with non-zero code: 2`
  "15+ consecutive builds have failed" from ~10pm UTC+1 on 2026-03-22. EAS CLI 18.4.0, Expo
  SDK 54, Windows 11, `EAS_NO_VCS=1`, ~839KB archive. Last good build same day 10:23am, identical
  code. User tried image variants, `--clear-cache`, `.easignore` edits, fresh npm install, local
  tar (worked). **No maintainer root-cause documented in-thread (labeled "needs review").**
  https://github.com/expo/eas-cli/issues/3529
- **#3532** (**2026-03-24**): "EAS Build fails with tar Permission denied during Prepare project
  (free plan, SDK 54)." Same window, free-plan flavor.
  https://github.com/expo/eas-cli/issues/3532
- **#3449** (**2026-03-03**): "iOS EAS Build fails in 'Prepare project' phase — tar: 'Failed to
  restore metadata: File exists'." https://github.com/expo/eas-cli/issues/3449

> TAKEAWAY: "Prepare project / tar" failures are almost always **EAS infra or VM-image
> regressions**, not your bug. Before burning hours: check EAS status, check if it started at a
> specific timestamp with no code change, and check the issue tracker for a same-day cluster.
> `EAS_NO_VCS=1` + Windows + large archive recurs in these reports.

### Server / GraphQL outright errors

- **#3827** (**2026-06-08**, freshest): "EAS Build failing with 'Unexpected server error' /
  GraphQL request failed — Android." https://github.com/expo/eas-cli/issues/3827
- **#3528** (**2026-03-23**): "Runtime version calculated on EAS: null" — EAS computing a null
  runtimeVersion, which then breaks update targeting. https://github.com/expo/eas-cli/issues/3528

### Permissions on the build VM

- **#3605** (**2026-04-14**): "EAS iOS build: EACCES permission denied mkdir node_modules — expo
  user cannot write to workingdir on every build." The `expo` user on the builder lacked write
  perms to the working dir. https://github.com/expo/eas-cli/issues/3605

---

## 2. eas-cli release-quality failures (the tool shipped broken)

Evidence that the CLI itself regresses between releases — pin your eas-cli version in CI.

- **#3754** (**2026-05-19**): "eas-cli 19.0.1 references itself on EAS Cloud workers but is not
  published to npm (build:internal fails with notarget)." A published CLI version that **cannot
  install itself** on the cloud worker. https://github.com/expo/eas-cli/issues/3754
- **#3749** (**2026-05-19**): "eas build fails on iOS with JSON parse error after upgrading to
  v18.13.1." Upgrade-induced JSON parse break. https://github.com/expo/eas-cli/issues/3749
- **#3764** (**2026-05-20**): "`eas device:create` (Developer Portal import) broken since v18.5.0
  — apple-utils pagination." Internal-device registration broke at a specific CLI version.
  https://github.com/expo/eas-cli/issues/3764

> TAKEAWAY: eas-cli has had multiple "broke at version X.Y.Z" regressions in 2026 (18.5.0,
> 18.13.1, 19.0.1). **Pin eas-cli exactly in CI** (`"eas-cli": "x.y.z"` / `--non-interactive`
> with a locked version) so a silent CLI bump doesn't break your pipeline overnight.

---

## 3. Toolchain / SDK-coupling failures (the hardest to debug)

### Xcode-version coupling you cannot override — VisionCamera V5 / NitroModules

- **#3616** (**2026-04-17**): "VisionCamera V5 (NitroModules) fails to compile on Xcode 26 beta
  assigned by EAS Build for Expo SDK 54." Exact error:
  > `Rename failed: .../VisionCamera.build/Objects-normal/arm64/AVCaptureSession+addAudioInput-e3ea27bd.o.tmp -> AVCaptureSession+addAudioInput.o: No such file or directory`
  Root cause: **EAS auto-assigns Xcode 26 beta for SDK 54**, and NitroModules + Xcode-26-beta's
  object-file-rename handling are incompatible. Killer constraint: *"There is currently no way to
  opt out of Xcode 26 beta for SDK 54"* — the `image` field in eas.json to pin Xcode is
  **rejected by eas-cli 18.7.0 with `"image is not allowed"`.** Workaround: downgrade to Expo SDK
  53, which forces Xcode 16.2 and compiles. (eas-cli 18.7.0, SDK 54, react-native-vision-camera
  5.0.1.) https://github.com/expo/eas-cli/issues/3616

> TAKEAWAY: On managed EAS you do **not** fully control the Xcode version — EAS picks it from your
> SDK. When a native module breaks on a beta Xcode, your only levers are (a) downgrade SDK, or (b)
> wait for the module to support the new Xcode. Plan native-module upgrades around EAS's
> Xcode-assignment, not the other way around.

### Node-version coupling on submit jobs

- **#3589** (**2026-04-09**): "type: submit jobs run unnecessary npm ci on hardcoded Node 20,
  intermittently fails for projects requiring Node 22+." EAS submit jobs hardcoded Node 20 and
  ran an unneeded `npm ci`, breaking Node-22+ projects intermittently.
  https://github.com/expo/eas-cli/issues/3589

### SDK-version rejection on update

- **#3669** (**2026-05-01**): "sdkVersion 54.0.0 is not supported While Sending Updated" — EAS
  Update rejecting a current SDK version. https://github.com/expo/eas-cli/issues/3669

---

## 4. The documented (official) failure causes — what Expo says to check first

Source: Expo docs, "Troubleshoot build errors and crashes"
(https://docs.expo.dev/build-reference/troubleshooting/). Verbatim error→cause→fix:

- **Gradle OOM**: `"Gradle build daemon disappeared unexpectedly (it may have been killed or may
  have crashed)"` → Node JS-bundler process killed, usually huge bundles / large text files
  treated as source. **Fix**: `large` resource class in eas.json; analyze with Expo Atlas.
- **Metro bundling**: `"Metro encountered an error: Unable to resolve module ./src/Routes"` /
  `"Task :app:bundleReleaseJsAndAssets FAILED"` → most common real cause is **filename case
  differing in Git vs filesystem** (`routes.js` in Git but `Routes.js` on disk — works on
  case-insensitive macOS, fails on the Linux builder). **Fix**: run `npx expo export` locally to
  catch it before EAS.
- **Files in .gitignore not uploaded**: `"None of these files exist"` → "any file or directory
  mentioned in the .gitignore is not uploaded." **Fix**: don't import gitignored files
  client-side; base64-encode secrets and recreate via EAS Build hooks.
- **Dependency mismatch**: **Fix**: `npx expo-doctor` to verify SDK-compatible dependency
  versions.

> The case-sensitivity one is the single most common "works on my Mac, fails on EAS" trap —
> macOS is case-insensitive, the EAS Linux builder is case-sensitive.

---

## 5. The pattern across all of it (taste)

1. **A clustered, timestamped, no-code-change failure = EAS infra, not you.** Check the tracker
   for a same-day spike before debugging your repo.
2. **Pin eas-cli.** Multiple 2026 regressions shipped in point releases.
3. **You don't own the Xcode/Node version on managed EAS** — it's derived from your SDK. Native
   module upgrades must be planned around EAS's assignment.
4. **Reproduce locally first** (`npx expo export`, `npx expo-doctor`) — it's free and catches the
   case-sensitivity + dependency + Metro-resolution failures that otherwise cost a cloud build.

---

## Sources (this file)

- expo/eas-cli issues (all accessed 2026-06-11 via `gh search`): #3827, #3764, #3754, #3749,
  #3669, #3616, #3605, #3589, #3532, #3529, #3528, #3449 —
  https://github.com/expo/eas-cli/issues/<number>
- Expo Docs, "Troubleshoot build errors and crashes" —
  https://docs.expo.dev/build-reference/troubleshooting/
