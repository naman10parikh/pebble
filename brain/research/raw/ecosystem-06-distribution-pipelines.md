# ecosystem-06 — Distribution Pipelines + App-Store Review Gotchas (esp. AI apps)

> TestFlight / Play Console pipelines via EAS Submit, plus the 2026 review-guideline minefield that
> trips AI apps specifically. **This file is the highest-risk-to-ignore in the folder** — a wrong
> assumption here gets an app *rejected* or *pulled*, not just slow.

## EAS Submit — the upload pipeline

### iOS → TestFlight → App Store
```sh
eas submit --platform ios
```
- Binary uploads to **App Store Connect**; appears in **TestFlight after ~10–15 min**.
- **TestFlight builds are NOT auto-released to production** — you manually submit for App Review.
- Credentials: Apple Developer account + **`ascAppId`** (App Store Connect app id) + **either** Apple
  ID creds **or** an **App Store Connect API Key** (the API key is the CI-friendly path — no 2FA).

### Android → Play Console
```sh
eas submit --platform android
```
- Uploads to a **track**: `internal` / `alpha` / `beta` / `production`.
- Credentials: a **Google Service Account Key** (JSON) with app permissions.
- **Gotcha:** Google requires **at least one MANUAL upload** of the app before API submissions work.
  An agent cannot bootstrap a brand-new Play listing purely via API — the first APK/AAB goes up by hand.

### CI / non-interactive
```sh
eas submit --platform android --latest --non-interactive
```
`--latest` selects the most recent build; `--non-interactive` skips prompts. **Essential for an agent**
— without `--non-interactive`, the CLI blocks on a TTY prompt and the run hangs. Source:
[docs.expo.dev/submit/introduction](https://docs.expo.dev/submit/introduction/).

## ⚠️ OTA updates: the line you must not cross (Apple + Google)

EAS Update / CodePush-style OTA is **allowed** — but only within a hard boundary, and **2026 saw
aggressive enforcement** against apps that crossed it.

### Apple (DPLA §3.3(b), guideline 3.3.1)
Downloaded interpreted code is allowed **provided it:**
1. **Does not change the app's primary purpose / advertised functionality**,
2. Does not create an internal app store,
3. Does not bypass security features.

**Allowed via OTA:** bug fixes, perf, copy/asset changes, minor UI tweaks, content updates to existing
features. **Prohibited:** payment/subscription-flow changes, new features that alter core purpose,
native-code modification.

### Google (Device and Network Abuse policy)
Apps may **not** update themselves outside Play or download executable **native** code — **but this
"does not apply to code that runs in a VM/interpreter providing indirect access to Android APIs (such
as JavaScript in a WebView)."** So **JS-only** EAS Update changes are fine; new permissions / native
binaries are not.

### Why React Native + EAS Update is compliant
**A fixed JS bundle that calls only audited native APIs is on the right side of the line** — the
*native layer*, reviewed at submission, never changes; the interpreter bridge provides the required
indirection; functionality stays within the advertised scope. Source:
[bitrise.io — What app stores allow with OTA updates](https://bitrise.io/blog/post/what-app-stores-allow-with-ota-updates-apple-and-google-policy-explained).

### 🔥 The 2026 enforcement wave (the cautionary tale)
**In early 2026 Apple blocked updates to Replit and Vibecode, and pulled "Anything" from the store
entirely** — because these "vibe-coding" apps **generate and execute code that modifies their own
behavior at runtime**, i.e. they update themselves outside review. Same principle that killed
Rollout.io in 2017. Source:
[bitrise.io](https://bitrise.io/blog/post/what-app-stores-allow-with-ota-updates-apple-and-google-policy-explained),
[dev.to — Apple's Guideline 4.7 update](https://dev.to/arshtechpro/apples-guideline-47-update-what-every-developer-hosting-html5-mini-apps-must-know-90).

> **Implication for pebble (a mobile harness that may itself ship AI features):** an app that lets
> users generate-and-run arbitrary code, or that materially changes its purpose via downloaded code,
> will be **rejected or pulled**. Ship a **fixed, reviewed native shell**; use OTA only for JS/asset
> iteration within the advertised purpose. Do **not** architect "the app rewrites itself from a
> server-sent program."

## The November 2025 + 2026 App Review Guideline changes that hit AI apps

Source: [Apple Developer News 2025-11-13 (id=ey6d8onl)](https://developer.apple.com/news/?id=ey6d8onl).

- **5.1.2(i) — third-party AI data disclosure.** You must **clearly disclose where personal data is
  shared with third parties, including third-party AI, and get explicit permission first.** Practical
  effect: **if your app sends user data to an external AI service, you need a consent modal naming the
  provider + data types BEFORE any data is shared.** (Directly relevant to any RN app calling an LLM API.)
- **4.7 — mini apps in scope.** HTML5 / JavaScript **mini apps and mini-games are now explicitly in
  scope** of the guidelines.
- **4.7.2 — no exposing native APIs** to non-embedded software without prior Apple permission; mini
  apps limited to WebKit + JavaScriptCore (Safari-equivalent capabilities).
- **1.2.1(a) / 4.7.5 — age-restriction mechanisms.** Creator apps (and apps with user/AI-generated
  content) must let users identify content exceeding the app's age rating and **restrict underage
  access via verified/declared age**.
- **4.1(c) — branding.** Can't use another developer's icon/brand/product name without approval.

### Age ratings for AI apps (App Store Connect)
- **New rating tiers added: 13+, 16+, 18+** (on top of 4+ and 9+).
- **AI generates unpredictable content** → Apple requires you to account for how AI assistants /
  chatbots might surface sensitive content when choosing your age rating. Under-rating an AI app is a
  rejection risk.
- **Deadline:** developers had to answer the updated age-rating questions **by 2026-01-31** to avoid
  submission interruption in App Store Connect. Source:
  [Apple Developer News — updated age ratings](https://developer.apple.com/news/?id=ks775ehf).

### Apps that use AI to generate/recommend/decide
Reviewed **more carefully**; **must clearly explain how they work**; apps that **mislead about AI
capabilities or hide automated processes are more likely to be rejected.** Source:
[theapplaunchpad — iOS App Store Review Guidelines 2026](https://theapplaunchpad.com/blog/ios-app-store-review-guidelines/).

## Practical pre-submission checklist for an AI mobile app (pebble harness)

1. **Consent modal** before any user data leaves the device for a third-party AI (name provider + data
   types) — guideline 5.1.2(i).
2. **Honest age rating** that accounts for AI-generated content — pick conservatively; under-rating is
   a rejection.
3. **No self-modifying code** / no "download-and-run arbitrary program" architecture — OTA only for
   JS/asset changes within advertised purpose.
4. **Clear disclosure** of automated decisions/recommendations in the app + listing.
5. **Privacy nutrition labels** consistent with actual data flows (AI calls included).
6. **First Play upload by hand**, then API submissions via service-account JSON.
7. **App Store Connect API Key** (not Apple-ID+2FA) for non-interactive iOS submits.

## "Could not confirm"
- Whether **Anything / Replit / Vibecode** were later reinstated after architecture changes (the
  sources captured the early-2026 removal, not a resolution).
- Exact current numbering of the OTA clause (sources cite both DPLA §3.3(b) and guideline 3.3.1 —
  verify the live guideline text before quoting a section number authoritatively).
