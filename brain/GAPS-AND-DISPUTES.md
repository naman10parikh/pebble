---
title: "GAPS-AND-DISPUTES — where the corpus disagrees, is unconfirmed, or pebble must resolve by experiment"
type: synthesis
created: "2026-06-11"
updated: "2026-06-11"
tags: [gaps, disputes, unconfirmed, open-questions, experiments, pebble]
sources:
  - "brain/research/raw/ecosystem-01-versions-matrix.md"
  - "brain/research/raw/ecosystem-04-expo-router.md"
  - "brain/research/raw/ecosystem-05-eas-build-submit-update.md"
  - "brain/research/raw/ecosystem-06-distribution-pipelines.md"
  - "brain/research/raw/ecosystem-07-push-notifications.md"
  - "brain/research/raw/ecosystem-08-decision-frameworks.md"
  - "brain/research/raw/ecosystem-10-github-issues.md"
  - "brain/research/raw/ecosystem-11-agent-operating-guide.md"
  - "brain/research/raw/field-store-review-ai-apps-2026.md"
  - "brain/research/raw/field-ota-update-boundaries-2026.md"
  - "brain/research/raw/field-migration-war-stories-2026.md"
  - "brain/research/raw/field-pwa-vs-native-2026.md"
  - "brain/research/raw/field-taste-disagreements-2026.md"
related: ["[[MOC - pebble]]", "[[OPINIONS]]", "[[KNOWN-PITFALLS]]", "[[EXPERTISE-MAP]]", "[[BATTLE-TESTED-SCENARIOS]]", "[[TOOL-MATRIX]]"]
summary: "Honest map of what the research does NOT settle — genuine source disagreements (both sides), unconfirmed figures, and the questions pebble must answer by running its own EAS build / experiments on the Energy stack."
---

# GAPS-AND-DISPUTES

> Intellectual honesty is part of taste. This file records where the corpus is **not** authoritative:
> (A) genuine disagreements between credible sources (both sides verbatim), (B) unconfirmed/single-source
> figures pebble must not quote as fact, and (C) questions only **pebble's own experiment** can resolve.
> When pebble cites anything here, it must flag the uncertainty, not launder it into a confident claim.

---

## PART A — Genuine disagreements between credible sources (both sides verbatim)

### Dispute 1 — Is bare React Native still a legitimate choice, or legacy risk?
- **Side "bare is legacy risk" (hardened consensus):** rubyroidlabs frames bare as *"legacy risk"* and
  *"economically inferior"* — upgrading large bare apps *"can consume 2–5 engineering days"* vs Expo+CNG
  *"shrinks to several hours,"* claiming **95% of projects should use Expo**, 5% edge cases. Andy G:
  bare is *"only ~10-15% of projects."*
- **Side "bare still matters / Expo has real costs":** Jack Rosa (Hashrocket): you can end up *"fighting
  against Expo's conventions rather than benefiting from them"*; Expo-only devs *"may find themselves
  lacking the deep native knowledge needed"* to debug at the native level; the custom-dev-build middle
  ground *"deserves more consideration than a binary choice."* rubyroidlabs itself concedes *"even bare RN
  teams often use EAS Build for iOS because managing signing + provisioning locally is tedious."*
- **The live numeric disagreement:** **95/5 (rubyroidlabs) vs 85/15 (Andy G)** Expo-vs-bare split.
- **pebble's resolution:** default-Expo-with-eyes-open ([[OPINIONS]] Stance 1) — the dissent is a *warning
  to retain native skill + an exit path*, not a reason to start bare. **Do not quote a single % as fact** —
  say "consensus ~85-95% Expo."
- **Source:** [raw: field-taste §B-Disagreement1]

### Dispute 2 — OTA aggressiveness vs store-compliance/stability safety
- **Side "OTA is the killer feature, push it":** Siddhant Shukla — pushing OTA *"without going through App
  Store review… is why people stick with Expo."* Treats EAS Update as a first-class shipping channel.
- **Side "OTA will brick you / use it conservatively":** Abdullahi's postmortems (silent reloads lose user
  input; long-backgrounded users never get fixes; first-launch phantom "Update Available"); expo/expo
  #45772 (100%-repro OTA *crash on activation* on SDK 54+55, *"OTA functionality is effectively
  unavailable; all JS changes require full `eas build` releases"*); Expo's own docs (error recovery
  *"is not a full safety net… in many cases, users will still see a crash"*).
- **pebble's resolution:** **both are true and they're about different dials.** The *compliance/boundary*
  (JS-only, never new native capability — Guideline 2.5.2) is **fixed and non-negotiable**; the
  *aggressiveness* (how fast/how much you OTA) is a **risk tradeoff** → be aggressive on rollout *cadence*
  with monitoring, never aggressive on *what* you push. ([[OPINIONS]] Stances 7-8.)
- **Source:** [raw: field-taste §B-Disagreement2, field-ota §3/§4]

### Dispute 3 — "The New Architecture is done" vs "the long tail still breaks"
- **Side "it's done":** Andy G — *"In 2026, it's done. Not 'done with caveats' — actually done."*
- **Side "done, but littered with silent breakage":** Janani Umapathy (white screen, null refs from view
  flattening), Reanimated 3→4 coupling (worklets split, `withSpring` ×1.5), VisionCamera/NitroModules on
  EAS's forced Xcode 26 beta (#3616), RN 0.85 removed APIs; Shukla: *"The Android long tail is the real
  enemy… your perfectly working app renders strangely on a 2022 Samsung"* and *"Debugging at the native
  boundary is still clunky."*
- **pebble's resolution:** the **architecture** is stable; the **migration + device long-tail** is where
  time goes. "Done" describes the platform, not your upgrade or your device matrix.
- **Source:** [raw: field-taste §B-Disagreement3]

### Dispute 4 — Apple's *motive* in the vibe-coding crackdown (revenue vs 2.5.2 compliance)
- **Side "revenue protection":** RSWebSols / theoutpost.ai frame Apple's motive as protecting App Store
  revenue — vibe-coding tools let people make apps that *"bypass the App Store Review process."*
- **Side "2.5.2 compliance":** Apple's stated rule is **Guideline 2.5.2** (executing code that changes
  features), regardless of motive.
- **pebble's resolution:** **the rule applied is 2.5.2 regardless of which framing is true.** Architect to
  2.5.2 (fixed reviewed shell; dynamic code only in WebKit); don't bet on the motive. ([[OPINIONS]] Stance 16.)
- **Source:** [raw: field-store-review §2]

---

## PART B — Unconfirmed / single-source figures (do NOT quote as fact)

| Claim | Status | Why suspect | How pebble should treat it |
|---|---|---|---|
| **"~15% of apps now rejected"** due to stricter enforcement | **UNCONFIRMED** | Single secondary source (appnatively), no Apple primary | Say "rejections rose in 2026"; never cite 15%. [raw: field-store-review §3] |
| **"~70% of projects, a PWA is enough"** | **UNCONFIRMED** | Blog estimate (webscraft/mobiloud), not a measured survey | Use the **"3+ → native"** *rule* instead of the %. [raw: field-pwa-vs-native §1] |
| PWA cost = **40-60%** of dual-native (one source: **3-10x** cheaper) | **DIRECTIONAL** | Range-y; sources differ on magnitude | Quote as "meaningfully cheaper (~40-60%)," note the spread. [raw: field-pwa-vs-native §1] |
| New-Arch migration = **12 days** | **NOT UNIVERSAL** | One small/medium app w/ mostly-compatible deps; other sources say **2-8 weeks**, heavy-native = months | Never quote 12 days as typical; say "days-to-weeks; budget 30-50% for dep wrangling." [raw: field-migration §2] |
| RN-vs-Flutter **market-share split** | **NO AUTHORITATIVE %** | Sources give directional momentum only | Say "both healthy; RN = React reuse, Flutter = perf." [raw: ecosystem-08] |
| Apple's *"AI = regulated data category"* | **PHRASING, NOT GUIDELINE** | appnatively's wording, not verbatim Apple text | Map to the real rules (5.1.1 / privacy manifest); don't quote the phrase as a guideline title. [raw: field-store-review §4] |
| **RN 0.86.0 full changelog** | **PARTIAL** | npm tarball + partial CHANGELOG.md + RC notes only; **release blog not yet published** at capture | Confirmed deltas only (Pressable `android_ripple` PlatformColor+alpha; Hermes-V1 DevTools fix; CocoaPods RCTDefines.h fix). Re-check the blog. **npm `latest` can be AHEAD of the blog — don't conclude "0.86 doesn't exist" from a blog check.** [raw: ecosystem-01, ecosystem-02] |

---

## PART C — Unconfirmed *technical* items (verify against the live doc before hard-coding)

These are flagged "could not confirm" in the raw research — verify before baking into a scaffold/script:

1. **expo-router typed-routes config key on SDK 56** — `experiments.typedRoutes` is the historically stable
   key; the live Notation page confirmed the *feature* but not the exact 56 key. Verify `docs.expo.dev/
   router` before scaffolding. [raw: ecosystem-04]
2. **`[...rest]` catch-all syntax** — long-standing convention but the Notation page read didn't render the
   catch-all row; confirm against live Notation + Shared-routes pages. [raw: ecosystem-04]
3. **Is `--environment` required on ALL `eas update` calls or only when an environment-scoped config
   exists?** SDK-55 note says "requires"; verify against current `docs.expo.dev/eas-update` before
   hard-coding it into every script. (Default: include it — failing safe.) [raw: ecosystem-05]
4. **`eas.json` simulator key on SDK 56** — `ios.simulator: true` is long-standing + was confirmed in the
   simulators doc; verify it wasn't renamed in 56. [raw: ecosystem-11]
5. **Does `--no-wait` work on `eas submit` (not just `eas build`)?** Documented for build; confirm before
   relying on it for submit. [raw: ecosystem-11]
6. **`nodeLinker: hoisted` — `pnpm-workspace.yaml` vs `.npmrc`** for the *installed* pnpm major. Expo docs
   show `pnpm-workspace.yaml`; some pnpm versions read it from `.npmrc`. Verify against the installed pnpm.
   [raw: ecosystem-08]
7. **Expo Go iOS remote-push removal timing** — sources named **Android** SDK 53; iOS parity is implied by
   the "dev build required" framing but not separately dated. (Operationally moot: test push in a dev build
   regardless.) [raw: ecosystem-07]
8. **Exact OTA-clause numbering** — sources cite both DPLA §3.3(b) and guideline 3.3.1; verify the live
   guideline text before quoting a section number authoritatively. [raw: ecosystem-06]

---

## PART D — Reinstatement / status items the corpus snapshotted but did NOT resolve

| Item | What's known | What's unresolved |
|---|---|---|
| **"Anything" (Dhruv Amin)** | Pulled 2026-03-26, **returned 2026-04-03** | What architecture change got it back in (the corpus notes the return, not the fix) |
| **Replit / Vibecode** | Updates **blocked** 2026-03-18 | Whether they were later reinstated after architecture changes — **unconfirmed** |
| **Expo Go for SDK 55/56 on the App Store** | Stuck in Apple review with no timeline as of **2026-05-04** | Whether it cleared review after that date — snapshot of an in-flight situation |
| **expo-router open issues** (#46791 loaders-in-layouts, #46621, #46284) | Open at capture (June 2026) | Whether fixed in a later patch — **recheck status before relying on workarounds** |
| **#45772 OTA activation crash** | Open, "incomplete issue: missing or invalid repro" at capture | Whether Expo triaged/fixed it — **gates Stance 8's "OTA not-yet-trustworthy on SDK 54/55"** |
[raw: field-store-review §2, ecosystem-03, ecosystem-10, field-ota §3]

---

## PART E — What ONLY pebble's own experiment can resolve (the to-run list)
These are not answerable from any blog/issue — pebble must **run them on the Energy stack** and write the
result back here (closing the gap turns an unknown into [[KNOWN-PITFALLS]] or [[OPINIONS]] data):

1. **Does the #45772 OTA-activation crash reproduce on the Energy stack's pinned SDK?** Run the documented
   repro (TestFlight install → reinstall → JS-only OTA → ~60s open → force-kill → reopen) on pebble's
   actual SDK/RN/arch combo. **This decides whether OTA is usable or whether all JS changes must ship as
   full builds.** → updates [[OPINIONS]] Stance 8 + [[BATTLE-TESTED-SCENARIOS]] #2. [raw: field-ota §3]
2. **Does a clean EAS build succeed on the Energy pnpm monorepo, or does the "EAS-assumes-Yarn" friction
   bite?** Run pebble's first `eas build` in-monorepo with `nodeLinker: hoisted` and record what (if
   anything) breaks vs `byCedric/expo-monorepo-example`. → updates [[KNOWN-PITFALLS]] §5. [raw: ecosystem-08 §B]
3. **What SDK does pebble actually pin, and does Expo Go work for it on a physical device?** Determine the
   pinned SDK (≤54 = legacy-arch-capable but EOL; 55/56 = New-Arch-only) and whether dev-build-only push
   testing is forced. → updates [[EXPERTISE-MAP]] version delta. [raw: ecosystem-03]
4. **Does `fingerprint` break pebble's Metro dev-server connection (#43908) on its stack?** Set
   `fingerprint`, attempt a dev-client → Metro connect, record. → confirms/relaxes [[KNOWN-PITFALLS]] §2
   for pebble specifically. [raw: ecosystem-10]
5. **Is `--environment` required on every `eas update` for pebble's config?** Empirically test with/without
   on a throwaway channel. → resolves Part-C item 3. [raw: ecosystem-05]
6. **Fill the `facebook/react-native` high-engagement-issue gap.** `gh search` returned HTTP 422 for that
   repo at capture; re-run later or browse issues sorted by reactions to surface RN-core breakage the
   corpus missed. → adds to [[BATTLE-TESTED-SCENARIOS]]. [raw: ecosystem-10 §could-not-confirm]

---

## How this file feeds the DSIP loop
`dsip.json` runs `re-verify-tool-matrix` + `refresh-brain` nightly. **Every gap closed by experiment or a
re-check moves OUT of this file and INTO [[KNOWN-PITFALLS]]/[[OPINIONS]]/[[TOOL-MATRIX]] as settled fact**,
with the date resolved. This file should *shrink* over pebble's life — a growing GAPS file means the loop
isn't learning. Unconfirmed figures (Part B) must never be quoted as fact in any pebble deliverable.
