# Field Intelligence — Explicit TASTE, Disagreements & 2026 Invalidations (Mobile/RN)

> Scope: verbatim opinions that great mobile engineers hold (with attribution), where credible
> sources genuinely DISAGREE (both sides verbatim), and what changed in 2026 that invalidates
> 2025 conventional wisdom. Compiled CP123 Wave-R. Every quote carries author + URL + date.

---

## PART A — TASTE (verbatim opinions, attributed)

### On Expo vs bare — the strong takes

- **Siddhant Shukla** ("React Native in 2026: A Year In, Here's What I Actually Think," Medium,
  **2026-02-20**, https://medium.com/@siddhant.shukla_3691/react-native-in-2026-a-year-in-heres-what-i-actually-think-1d46b9ffa723 ):
  > "My advice if you're starting today: begin with Expo."
  > "Don't let anyone convince you that bare React Native is the 'real' way to do it."
  > "The first time I pushed an OTA update to a production app without going through App Store
  > review, I understood why people stick with Expo."
  > "don't read too many 'React Native is dead' takes... The framework is healthier now than it
  > was when I picked it up."

- **Andy G** ("React Native in 2026: What Changed and Why It Finally Feels Stable," Medium,
  **2026-03-17**, https://medium.com/@andy.a.g/react-native-in-2026-what-changed-and-why-it-finally-feels-stable-fe96b7a7a8b8 ):
  > "In 2026, React Native is in the best shape it's ever been. Not perfect — it never will be —
  > but genuinely stable, performant, and pleasant to work with."
  > "The New Architecture... In 2026, it's done. Not 'done with caveats' — actually done."
  > On native modules: "Expo Modules API is how you write native modules now."

- **Jack Rosa** (Hashrocket, "Expo for React Native in 2025: A Perspective," **2025-11-11**,
  https://hashrocket.com/blog/posts/expo-for-react-native-in-2025-a-perspective ) — the
  *nuanced* take that resists the bandwagon:
  > developers may find themselves "fighting against Expo's conventions rather than benefiting
  > from them" when specialized native work is needed.
  > "developers who exclusively use Expo may find themselves lacking the deep native knowledge
  > needed" for debugging at the native level.
  > Custom development builds are an "increasingly popular" middle ground. Rosa "notably avoids
  > declaring one approach universally superior."

### On state management (taste that average engineers don't hold)

- **Andy G**: abandoned **Redux** for **Zustand** — "90% less boilerplate for app-scale state."
- **AsyncStorage is over**: "MMKV is 30x faster and has a synchronous API" (Andy G). Corroborated
  by amillionmonkeys, who *replaced* AsyncStorage with MMKV during their New-Arch migration.

### On AI-generated mobile code (directly pebble-relevant)

- **Siddhant Shukla**, on shipping LLM output unreviewed:
  > "But 'I'll just ship the generated code' has burned me enough times that I don't do it
  > anymore."
  This is the field's taste on AI-in-the-loop: generate, but **review at the native boundary** —
  the same boundary where Fabric view-flattening and TurboModule nulls cause silent failures.

### On lists — "stop reaching for FlatList by default"

- **pkgpulse guide** (2026, https://www.pkgpulse.com/guides/flashlist-vs-flatlist-vs-legendlist-react-native-lists-2026 )
  — taste, with the load-bearing caveats most people miss:
  > FlashList's `estimatedItemSize` is "Required" — "If your items average 120px but you provide
  > `estimatedItemSize={40}`, FlashList will recalculate layouts frequently, reducing the
  > performance benefit." (Teams "frequently underestimate item height, gutting the performance
  > win.")
  > Mixed item types need `getItemType`, else "FlashList might try to recycle a header component
  > into a regular item slot, causing visual glitches."
  > "Don't skip memoization before upgrading: Skipping straight to a new list library can hide
  > item-component bugs that memoization and stable keys would have caught."
  - The mature opinion is **not** "stop using FlatList": "FlatList will never go away because
    it's part of React Native core… millions of production apps rely on it for lists that don't
    push performance limits." Reach for FlashList at **500+ items or visible jank**;
    FlashList migration "takes roughly 15 minutes" and is "the safest upgrade for most existing
    React Native apps."

### On when to NOT use React Native at all

- Experienced-engineer consensus (softaims JSI guide
  https://softaims.com/blog/react-native-new-architecture-2026 ; Siddhant Shukla):
  > "Consider native if you're building a game, a video/photo editing app, an AR experience, or
  > anything that needs to push the GPU hard. React Native's abstraction adds overhead that
  > matters for these use cases."

### On PWA overconfidence (taste)

- **magicbell**: "Be honest about these limits. Native apps remain the better choice in these
  cases." The opinion: engineers chronically **overestimate** iOS PWA capability (push,
  background, storage). (See field-pwa-vs-native-2026.md.)

---

## PART B — Where credible sources DISAGREE (both sides verbatim)

### Disagreement 1: Is bare React Native still a legitimate choice, or legacy risk?

- **"Bare is legacy risk" (strong consensus side)** — rubyroidlabs, "Scaling RN Without Expo in
  2026" (https://rubyroidlabs.com/blog/react-native-without-expo-legacy-risk/ ): frames bare as
  "legacy risk" and "economically inferior." Quantifies: in bare, upgrading large apps "can
  consume 2–5 engineering days," vs Expo+CNG "shrinks to several hours." Claims **95% of projects
  should use Expo**, 5% edge cases. The only nod to bare: "teams can migrate their pipeline to
  custom infrastructure if… compliance requirements change" — framed as an *Expo* benefit (you
  can leave), not a reason to start bare. *(This source is essentially one-sided pro-Expo — a
  data point that the consensus has hardened.)*
  - Andy G agrees: bare is "only ~10-15% of projects."

- **"Bare still matters / Expo has real costs" (dissent)** — Jack Rosa (Hashrocket): you can end
  up "fighting against Expo's conventions"; Expo-only devs "lack the deep native knowledge"; the
  custom-dev-build middle ground "deserves more consideration than a binary choice." rubyroidlabs
  itself concedes "even bare RN teams often use EAS Build for iOS because managing signing +
  provisioning locally is tedious."

> Resolution for pebble: the disagreement has narrowed to **default-Expo with eyes open** — use
> Expo + custom dev builds + config plugins; the dissent is a *warning to retain native
> debugging skill and an exit path*, not a recommendation to start bare. The 95/5 vs 85/15 split
> is the only live numeric disagreement.

### Disagreement 2: OTA aggressiveness vs store-compliance safety

- **"OTA is the killer feature, push it"** — Siddhant Shukla: pushing OTA "without going through
  App Store review" is *why people stick with Expo.* The pro-OTA camp treats EAS Update as a
  first-class shipping channel.

- **"OTA will brick you / use it conservatively"** — the production postmortems push back hard:
  - Abiodun Abdullahi (field-ota): silent OTA reloads lose user input; long-backgrounded users
    never get fixes; first-launch users see phantom "Update Available"; the rule is gradual
    rollout + known rollback command + foreground modal.
  - expo/expo #45772: a 100%-reproducible OTA *crash on activation* on SDK 54+55 with New Arch,
    where the **error-recovery queue itself crashes** — "OTA functionality is effectively
    unavailable; all JS changes require full `eas build` releases."
  - Expo's own docs: error recovery "is not a full safety net… in many cases, users will still
    see a crash" (>10s post-launch crashes, state-mutating bugs are uncovered).

> Resolution for pebble: both are true and the **compliance ceiling is fixed** — OTA may ship
> JS/assets to a reviewed binary, never new native features (Guideline 2.5.2; the vibe-coding
> removals prove enforcement). The *aggressiveness* dial (how fast/how much you OTA) is a risk
> tradeoff; the *boundary* (JS-only, no new capability) is not negotiable. Be aggressive on
> rollout *cadence* with monitoring; never aggressive on *what* you push.

### Disagreement 3: "New Architecture is done" vs "the long tail still breaks"

- **"It's done"** — Andy G: "actually done," not "done with caveats."
- **"Done, but the field is littered with silent breakage"** — Janani Umapathy (white screen,
  null refs from view flattening), the Reanimated 3→4 coupling (worklets split, withSpring
  duration ×1.5), VisionCamera/NitroModules failing on EAS's forced Xcode 26 beta (#3616),
  RN 0.85 removing APIs. And Siddhant Shukla's grounding hate: "The Android long tail is the
  real enemy… your perfectly working app renders strangely on a 2022 Samsung"; "Debugging at the
  native boundary is still clunky."

> Resolution: the *architecture* is stable; the *migration + device long-tail* is where time
> goes. "Done" describes the platform, not your upgrade.

---

## PART C — What changed in 2026 that INVALIDATES 2025 conventional wisdom

1. **"You can keep the old architecture" → FALSE.** RN 0.82+ forces New Arch on (cannot disable);
   RN 0.85 (2026-04-07) is "entirely on the new architecture, **no bridge fallback**"; Expo SDK
   55 dropped legacy entirely. (bacancytechnology; byteiota; Expo docs)
2. **"Use CodePush/AppCenter for OTA" → DEAD.** CodePush retired March 2025 and is **incompatible
   with the New Architecture.** EAS Update is the only supported RN OTA path now. (field-ota)
3. **"Reanimated plugin in babel.config" → CHANGED.** Reanimated 4 split worklets into
   `react-native-worklets`; plugin is now `'react-native-worklets/plugin'`; many APIs renamed
   (`runOnJS → scheduleOnRN`, etc.); Reanimated 4 is **New-Arch-only**. (Software Mansion docs)
4. **"AsyncStorage is the default KV store" → SUPERSEDED.** Field consensus moved to **MMKV**
   ("30x faster, synchronous"); New-Arch migrations actively rip out AsyncStorage. (Andy G;
   amillionmonkeys)
5. **"FlatList is fine for everything" → REFINED.** FlatList for <300 items; FlashList default at
   500+/jank; LegendList (New-Arch-only) is the new performance ceiling (60fps floor on 10k-item
   lists, ~150MB vs FlatList's 300–400MB). (pkgpulse)
6. **"Flipper for debugging" → DEAD.** (Andy G: "Dead.") Use the new RN DevTools / Hermes-based
   tooling.
7. **"Eject to bare for native modules" → OBSOLETE.** Continuous Native Generation (CNG) + Expo
   Modules API + config plugins removed the eject trade-off; "Expo Modules API is how you write
   native modules now." (Andy G; rubyroidlabs)
8. **"AI apps are fine if they're useful" → INSUFFICIENT.** 2026 enforcement: thin LLM wrappers
   get 4.3-spammed; apps that execute server-delivered code/features get 2.5.2-pulled (Replit,
   Vibecode, "Anything"); the 2026-06-09 guideline update adds "may be removed" teeth for
   low-effort apps and UGC-removal responsibility. (field-store-review)
9. **"PWA push works on iOS now (since 2023)" → ASTERISKED.** Yes since iOS 16.4, **but
   home-screen-install-only, no silent/rich push, and BLOCKED in the EU (iOS 17.4+)**; plus
   7-day cache eviction and 50MB cap make PWA unreliable for durable/proactive agent use cases.
   (field-pwa)
10. **"Hermes vs JSC is a real decision" → MOSTLY SETTLED.** Hermes is default on both platforms
    (faster startup, lower memory, usable stack traces); New Arch dropped V8 engine support in
    Reanimated 4. (softaims; Software Mansion)

---

## Sources (this file)

- Siddhant Shukla, Medium, 2026-02-20 — https://medium.com/@siddhant.shukla_3691/react-native-in-2026-a-year-in-heres-what-i-actually-think-1d46b9ffa723
- Andy G, Medium, 2026-03-17 — https://medium.com/@andy.a.g/react-native-in-2026-what-changed-and-why-it-finally-feels-stable-fe96b7a7a8b8
- Jack Rosa, Hashrocket, 2025-11-11 — https://hashrocket.com/blog/posts/expo-for-react-native-in-2025-a-perspective
- rubyroidlabs, "Scaling RN Without Expo in 2026" — https://rubyroidlabs.com/blog/react-native-without-expo-legacy-risk/
- pkgpulse, "FlashList vs FlatList vs LegendList 2026" — https://www.pkgpulse.com/guides/flashlist-vs-flatlist-vs-legendlist-react-native-lists-2026
- softaims, "RN New Architecture 2026: JSI & Production Guide" — https://softaims.com/blog/react-native-new-architecture-2026
- Software Mansion, Reanimated 3→4 migration — https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/
- bacancytechnology, "React Native 0.85" — https://www.bacancytechnology.com/blog/react-native-0-85
- byteiota, "Expo SDK 55: Legacy Architecture Is Gone" — https://byteiota.com/expo-sdk-55-legacy-architecture-is-gone-migrate-now/
- (cross-refs) field-store-review-ai-apps-2026.md, field-ota-update-boundaries-2026.md,
  field-pwa-vs-native-2026.md, field-migration-war-stories-2026.md
