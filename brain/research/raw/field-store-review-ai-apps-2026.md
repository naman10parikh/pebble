# Field Intelligence — App-Store Review Reality for AI/Agent Apps (2026)

> Scope: what actually gets AI/agent mobile apps rejected or pulled in 2026, with named cases,
> exact guideline numbers, and appeal/reinstatement outcomes. Primary sources preferred.
> Compiled CP123 Wave-R. Every claim carries URL + date + author/source.

---

## 1. The 2026-06-09 Guideline Update (the freshest signal)

Apple updated the App Store Review Guidelines on **2026-06-09**. The changes tighten the
screws on low-effort apps but — importantly — do **not** yet add a dedicated "AI app"
guideline.

Verbatim changes (source: MacRumors, 2026-06-09, "Apple Updates App Store Guidelines With
Stricter Rules for Low-Quality Apps" — https://www.macrumors.com/2026/06/09/app-store-guidelines-low-quality-apps/
; corroborated by appnatively analysis https://appnatively.com/blog/apple-is-rejecting-ai-generated-apps):

- **Guideline 4.3(b) — Low-Quality Apps in Saturated Categories.** New language:
  > "Don't submit apps that are indistinguishable from what's already widely available."
  Apple explicitly names dating, flashlight, sound effects, wallpaper, simple timers, and
  fortune telling as needing a "meaningfully different or improved experience." Apps in
  saturated categories that lack updates, improvements, or user engagement **"may be removed."**
  ("fart, burp, Kama Sutra, and drinking games" are characterized as "mediocre, low-quality,
  or low-effort.")

- **Guideline 1.2 — User-Generated Content.** New language:
  > "It is your responsibility to remove content that violates this guideline, your terms of
  > service, or your community standards."
  Developers must "demonstrate improvements that bring your app into compliance" or face
  removal; "Egregious or repeated behavior" warrants "immediate removal" from both the App
  Store and Developer Program. **This matters for agent apps**: a chat/agent surface that
  produces or relays content is UGC for review purposes.

- **Guideline 4.5.3 — Live Activities Abuse.** New restriction: no using Live Activities for
  spam, phishing, or unsolicited messaging.

> NOTE on "AI agent apps": the MacRumors-derived analysis says Apple "is developing plans to
> support AI agent apps but indicates no formal guideline changes regarding AI submissions as
> of this announcement date" (2026-06-09). So as of June 2026 there is **no AI-specific
> guideline** — AI apps are policed under the *generic* rules (2.5.2, 4.2, 4.3, 1.2). This is
> the single most important framing for pebble: you do not get rejected for "being AI," you get
> rejected for *how the AI app behaves* against existing rules.

---

## 2. The Vibe-Coding Crackdown — the canonical 2026 AI-app enforcement story

This is the best-documented real enforcement wave against AI app-building apps in 2026. It is
the template for how Apple treats "the app changes its own functionality via AI."

### Timeline (source: MacRumors 2026-03-30 https://www.macrumors.com/2026/03/30/apple-pulls-vibe-coding-app/ ; AppleInsider 2026-03-18 https://appleinsider.com/articles/26/03/18/bad-vibes-apple-blocks-updates-for-some-ai-coding-apps-in-the-app-store ; Neowin https://www.neowin.net/news/report-apple-goes-after-vibe-coding-apps-by-silently-blocking-new-updates/ )

- **Nov 2025**: "Anything" (AI app-building app, co-founder **Dhruv Amin**) launches without issue.
- **Dec 2025**: Apple silently begins **blocking updates** to Anything.
- **2026-03-18**: AppleInsider/MacRumors report Apple is silently blocking updates to multiple
  "vibe coding" apps — **Replit** and **Vibecode** named.
- **2026-03-26**: "Anything" is **pulled entirely** from the App Store.
- **2026-04-03**: "Anything" **returns** to the App Store (per MacRumors update notation).

### The exact rule cited — Guideline 2.5.2 (verbatim)

> "Apps should be self-contained in their bundles, and may not read or write data outside the
> designated container area, nor may they download, install, or execute code which introduces
> or changes features or functionality of the app."
> — App Store Review Guideline 2.5.2, as quoted by MacRumors (2026-03-30)

Dhruv Amin (Anything co-founder) was told his app **violated Guideline 2.5.2**. His attempted
fix: he "submitted an update that would allow vibe-coded apps to be previewed in a web browser
instead of in the app" — i.e., move the dynamically-generated code execution OUT of the native
bundle and into a browser context. **Apple blocked that update too before pulling the app.**
(Source: MacRumors 2026-03-30.)

### The load-bearing lesson for any agent app

The violation is NOT "you used AI." The violation is: **the app downloads/executes code that
changes the app's features at runtime.** Any agent app that:
- ships a JS bundle and then pulls *new executable behavior* from a server,
- lets users generate apps/tools that then RUN inside your native container,
- hot-loads native-feeling features after install,

…is squarely in 2.5.2 territory. The compliant pattern Amin reached for (run generated code in
a *web view / browser*, not the native runtime) is the same pattern that keeps OTA updates legal
(see field-ota-update-boundaries-2026.md). The boundary is: **content/data can change; executable
code and features cannot, unless it runs in WebKit.**

> DISAGREEMENT / open interpretation: Reporting (RSWebSols, theoutpost.ai) frames Apple's motive
> as **revenue protection** — vibe-coding tools let people make apps that "bypass the App Store
> Review process." Apple frames it as 2.5.2 compliance. Both framings appear in credible outlets;
> the *rule applied* is 2.5.2 regardless of motive. (RSWebSols https://www.rswebsols.com/news/apple-takes-action-against-vibe-coding-apps-replit-and-vibecode-prevented-from-updating-in-app-store/ ; theoutpost.ai https://theoutpost.ai/news-story/apple-removes-vibe-coding-app-anything-from-app-store-escalating-ai-enforcement-crackdown-25018/ )

---

## 3. Guideline 4.3 "Spam / Design" — the mass-produced-AI-app killer

4.3 is the rule that hits *AI-generated* apps (apps churned out by AI), as distinct from
*AI-powered* apps. Source: appnatively (https://appnatively.com/blog/apple-is-rejecting-ai-generated-apps),
Apple Developer Forums threads, theapplaunchpad 2026 guide
(https://theapplaunchpad.com/blog/ios-app-store-review-guidelines/).

- 4.3 bars apps "indistinguishable from what's already widely available" / "duplicate apps
  already in the App Store." AI makes mass-production trivial; Apple explicitly dislikes this.
- appnatively claims **"around 15% of apps are now rejected due to stricter enforcement"** (2026).
  *Flagged: could-not-independently-confirm the 15% figure — single secondary source, no Apple
  primary.*
- Developer-forum reality (Apple Developer Forums threads 771794, 771167, 112848): 4.3(a)
  rejections are **repeated even after substantial improvements**, especially for VPN and
  saturated categories. Developers report multiple rounds of 4.3 rejection with little
  actionable feedback. (https://developer.apple.com/forums/thread/771794 ,
  https://developer.apple.com/forums/thread/771167 )

### Appeal mechanics (what actually works)

Source: appnatively, OneMobile (https://onemobile.ai/common-app-store-rejections-and-how-to-avoid-them/),
pushmyapp.ai rejection index (https://pushmyapp.ai/blog/app-store-rejection-reasons).

- Appeal via "Contact Us" / "Resolution Center" in App Store Connect. **Appeal once per
  rejection** — do not spam.
- If technical changes don't work, **escalate to the App Review Board** with a written case for
  the app's *uniqueness / added value*. 4.3 is a judgment call, so the winning move is a
  documented differentiation argument, not another code change.
- Pattern from forums: arguing "we're different because [specific, demonstrable feature]" beats
  re-submitting cosmetic changes.

---

## 4. The dynamic-code / data-as-regulated-category angle

- appnatively: "Since late 2025, Apple has treated AI as a regulated data category, with failure
  to comply leading to instant rejection." This maps to **Guideline 5.1.1 (data collection &
  privacy)** and the privacy-nutrition-label / privacy-manifest requirements — an AI app that
  sends user prompts to a server must declare data collection accurately or eat an instant
  rejection. *Flagged: "regulated data category" is appnatively's phrasing, not a verbatim Apple
  guideline title — could-not-confirm exact wording in Apple's text.*
- Guidelines cited by appnatively for AI failures: **4.2, 4.2.6, and the 2.5.2 dynamic-code
  rule.** 4.2.6 specifically targets apps "generated by a commercialized template or app
  generation service" — directly relevant to anything that *outputs* apps.

---

## 5. Practical rejection-risk checklist for an AI/agent mobile app (2026)

Distilled from the above + OneMobile / pushmyapp.ai / theapplaunchpad 2026 guide:

1. **2.5.2** — Do NOT execute server-delivered code that changes features. If the agent
   "builds" or "runs" things, run them in a WebView/browser, never the native runtime.
2. **4.3** — Be visibly differentiated. A thin LLM wrapper in a crowded category gets spammed
   out. Have a concrete, demonstrable unique feature for the App Review Board argument.
3. **4.2 / 4.2.6** — Don't look template-generated. Minimum functionality + native value.
4. **1.2 (UGC)** — If the agent surfaces user/AI content, ship moderation + reporting + the
   ability to block users; Apple now holds you responsible for removal.
5. **5.1.1 / privacy manifest** — Declare every data flow (prompts → server) accurately.
6. **Appeals** — One appeal per rejection; escalate to App Review Board with a differentiation
   memo, not cosmetic tweaks.

---

## Sources (this file)

- MacRumors, "Apple Updates App Store Guidelines With Stricter Rules for Low-Quality Apps,"
  2026-06-09 — https://www.macrumors.com/2026/06/09/app-store-guidelines-low-quality-apps/
- MacRumors, "Apple Pulls Vibe Coding App 'Anything' From App Store, Escalating Enforcement,"
  2026-03-30 — https://www.macrumors.com/2026/03/30/apple-pulls-vibe-coding-app/
- MacRumors, "Apple Quietly Blocks Updates for Popular 'Vibe Coding' Apps," 2026-03-18 —
  https://www.macrumors.com/2026/03/18/apple-blocks-updates-for-vibe-coding-apps/
- AppleInsider, "Bad vibes: Apple blocks updates for some AI coding apps," 2026-03-18 —
  https://appleinsider.com/articles/26/03/18/bad-vibes-apple-blocks-updates-for-some-ai-coding-apps-in-the-app-store
- Neowin, "Report: Apple goes after 'vibe coding' apps by silently blocking new updates" —
  https://www.neowin.net/news/report-apple-goes-after-vibe-coding-apps-by-silently-blocking-new-updates/
- RSWebSols, "Apple Takes Action Against Vibe Coding Apps (Replit and Vibecode)" —
  https://www.rswebsols.com/news/apple-takes-action-against-vibe-coding-apps-replit-and-vibecode-prevented-from-updating-in-app-store/
- theoutpost.ai, "Apple Removes Vibe Coding App 'Anything'…" —
  https://theoutpost.ai/news-story/apple-removes-vibe-coding-app-anything-from-app-store-escalating-ai-enforcement-crackdown-25018/
- appnatively, "Apple Is Rejecting AI-Generated Apps" (2026) —
  https://appnatively.com/blog/apple-is-rejecting-ai-generated-apps
- Apple Developer Forums, Guideline 4.3(a) threads 771794 / 771167 / 112848 —
  https://developer.apple.com/forums/thread/771794 , https://developer.apple.com/forums/thread/771167
- OneMobile, "14 Common Apple App Store Rejections" —
  https://onemobile.ai/common-app-store-rejections-and-how-to-avoid-them/
- pushmyapp.ai, "App Store Rejection Reasons Index (2026)" —
  https://pushmyapp.ai/blog/app-store-rejection-reasons
- theapplaunchpad, "iOS App Store Review Guidelines 2026" —
  https://theapplaunchpad.com/blog/ios-app-store-review-guidelines/
