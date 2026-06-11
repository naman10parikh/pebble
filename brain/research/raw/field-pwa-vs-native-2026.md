# Field Intelligence — When a PWA Genuinely Suffices vs When Native Is Mandatory (2026)

> Scope: the honest 2026 decision boundary between PWA and native mobile, with the specific
> iOS/Safari constraints that force native and the cost deltas that pull toward PWA.
> June-2026 currency. Compiled CP123 Wave-R. Every claim carries URL + source.

---

## 1. The honest decision rule (quantified)

Source: magicbell, "PWA vs Native App: When to Build" —
https://www.magicbell.com/blog/pwa-vs-native-app-when-to-build-installable-progressive-web-app

- **Scoring rule (verbatim):** "If you checked 3 or more, go native. If 0-2, keep evaluating."
  The checklist items: Bluetooth/NFC, GPU performance, widgets/Siri integration, large-scale
  offline data, platform-specific UI.
- **Cost delta:** PWA is **"40-60% less than dual native."** (Corroborated by webscraft, which
  puts it stronger: "PWA is 3-10x cheaper… adding PWA to an existing site costs $0–$5k. Native
  for both platforms starts at $30k and can hit $150k+." —
  https://webscraft.org/blog/pwa-chi-nativniy-dodatok-u-2026 )
- **Strong opinion (verbatim):** "Be honest about these limits. Native apps remain the better
  choice in these cases" — the author's point is that **developers chronically *overestimate*
  what a PWA can do on iOS.**
- mobiloud / webscraft framing: **"For ~70% of projects, a PWA is faster, cheaper, and more than
  enough"** — content, services, e-commerce, SaaS. (webscraft
  https://webscraft.org/blog/pwa-chi-nativniy-dodatok-u-2026 ; mobiloud
  https://www.mobiloud.com/blog/progressive-web-apps-ios ). *Flagged: the 70% figure is a
  blog estimate, not a measured statistic — could-not-confirm against a primary survey.*

---

## 2. PWA is enough when… (green-light criteria)

Synthesized from magicbell + webscraft + mobiloud:

- Product is **content / service / e-commerce / SaaS** — informational, not hardware-bound.
- **Notifications are informational, not revenue-critical** (reminders, news, updates) — because
  iOS push reach is throttled (see §4).
- Audience is **loyal and willing to add-to-home-screen** (the iOS install tax is real, §3).
- Budget is constrained — the 40-60% (or 3-10x) saving is decisive.
- You want **one codebase + instant deploys** (no store review for content changes).

---

## 3. Native is MANDATORY when… (red-light criteria, verbatim)

Source: magicbell PWA-vs-native (above):

- **Hardware:** "Bluetooth for fitness trackers? NFC for payments? AR camera features?" — web
  alternatives "lack browser support" on iOS.
- "**Background location tracking** requires native."
- "**3D games, video editing, real-time collaboration with low latency.**"
- "**Widgets, live activities, Siri shortcuts, system-level notifications.**"
- "**App store rankings, featuring, or in-app purchases through platform payment systems.**"

> If the product needs any of: Bluetooth, NFC, ARKit, true background processing, IAP/store
> discovery, widgets/Live Activities, or low-latency 3D — **PWA cannot do it on iOS.** This is a
> technical wall, not a preference.

---

## 4. The exact iOS/Safari PWA limitations that bite in 2026 (the wall, with numbers)

Source: magicbell, "PWA iOS Limitations and Safari Support [2026]" —
https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide (verbatim):

### Push notifications — the re-engagement killer
- **"The PWA must be installed to the home screen first."** An open Safari tab (or any non-Safari
  browser) has **no access to `PushManager`**. (Corroborated: webscraft "PWA Push on iOS 2026"
  https://webscraft.org/blog/pwa-pushspovischennya-na-ios-u-2026 ; the Push API is "exclusively
  available for Home Screen web apps.")
- **iOS 16.4+ only** (Apple added it "eight years later," March 2023). Over 95% of iPhones run
  iOS 16+ as of early 2026 (StatCounter via webscraft) — version isn't the blocker; the
  install-to-home-screen step is.
- **"Not available in EU countries (iOS 17.4+)"** — DMA browser-engine changes broke PWA push in
  the EU. A real regional gap.
- **No rich media, no silent push** for PWAs on iOS.

> The killer for commerce: the multi-step install-then-permit flow means your push audience is
> "a fraction of what a native app delivers" — a direct hit to abandoned-cart / flash-sale /
> restock re-engagement revenue. (webscraft / mobiloud)

### Storage — your offline data is not safe
- **"7-day cache expiry. If a user doesn't open your PWA for a week, all cached data is gone."**
- **"50MB storage cap. Chrome allows hundreds of MB. Safari caps it at 50MB."**
- **"Aggressive cleanup. iOS deletes cached data when the device runs low on space."**

### Background processing — none
- **"None of these work on iOS: Background Sync API, Periodic Background Sync, Background
  Fetch."** Apps "can't sync data when closed, upload files in the background, update content on
  a schedule."

### Hardware/sensors — unsupported
- **"Web Bluetooth, Web NFC, Web USB, Web Serial, Generic Sensor API, Ambient Light Sensor,
  Proximity Sensor"** — all unsupported on iOS.

### Install + files
- **"No automatic install prompts on iOS"** and no `beforeinstallprompt` event — install is
  **manual** (Share → Add to Home Screen). No File System Access API ("No read/write to files").

---

## 5. Implication for an AI/agent mobile app (pebble-relevant taste)

- A pure **chat/agent surface with cloud inference** is the *exact* profile where a PWA can
  suffice — it's content/service, no hardware, inference is server-side.
- BUT three things push an *agent* app toward native specifically:
  1. **Push for proactive agent nudges** — if the agent should ping the user proactively, iOS
     PWA push (home-screen-only, no silent push, EU-blocked) cripples that loop.
  2. **Background work** — an agent that does anything while closed (sync, scheduled tasks) is
     impossible on iOS PWA (no Background Sync/Fetch).
  3. **On-device model / sensors / files** — any local inference, camera/mic beyond basic
     getUserMedia, NFC, BLE, or file access forces native.
- The **7-day eviction + 50MB cap** also means a PWA agent cannot reliably hold a local memory
  cache — it can vanish after a week of non-use. For an app whose value is persistent memory,
  that's a real argument for native + real storage (MMKV/SQLite).

> Decision heuristic for pebble: if the agent is **reactive, cloud-backed, and has no
> proactive-push or background or on-device requirement** → PWA is legitimately enough and 40-60%
> cheaper. The moment **proactive notifications, background execution, durable local memory, or
> any sensor** matter → native (Expo/React Native), full stop.

---

## Sources (this file)

- magicbell, "PWA vs Native App: When to Build" —
  https://www.magicbell.com/blog/pwa-vs-native-app-when-to-build-installable-progressive-web-app
- magicbell, "PWA iOS Limitations and Safari Support [2026]" —
  https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide
- webscraft, "PWA Push Notifications on iOS in 2026: What Really Works" —
  https://webscraft.org/blog/pwa-pushspovischennya-na-ios-u-2026?lang=en
- webscraft, "PWA vs Native App in 2026" —
  https://webscraft.org/blog/pwa-chi-nativniy-dodatok-u-2026?lang=en
- mobiloud, "Do Progressive Web Apps Work on iOS? (2026)" —
  https://www.mobiloud.com/blog/progressive-web-apps-ios
