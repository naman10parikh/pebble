---
name: store-review-preflight
description: >-
  Pre-flight an app (especially an AI/agent app) against App Store rejection BEFORE you submit — the 2.5.2 self-modifying-code wall, the 4.3 thin-wrapper/differentiation rule, the 5.1.2(i) consent modal, conservative age rating, and the 1.2 UGC-removal duty. Use for "will Apple reject this?", before any `eas submit`, or any AI-app store review.
trigger: >-
  "will Apple reject this?", "is this store-safe?", "App Store review", "AI app rejection", before any `eas submit` / `pebble submit`, `pebble review-check`
model: opus (a rejection is a multi-day appeal cycle and the rules are behavioral not mechanical — the judgment of "is this differentiated / does this execute features" must not be a cheap-tier guess)
output: a review-readiness verdict (`clear` | `blocking risks`) + each risk mapped to its guideline + the fix, in the format at the bottom
---

# store-review-preflight

> You don't get rejected for *being* AI — you get rejected for *behavior* against generic rules, and the 2026
> teeth tightened ("may be removed", UGC-removal duty). This skill is the rejection pre-flight pebble runs
> before any submit. Stance source: `brain/OPINIONS.md` STANCE 16, `brain/BATTLE-TESTED-SCENARIOS.md`
> SCENARIO 7/8, `brain/KNOWN-PITFALLS.md` §0.11, `brain/EXPERTISE-MAP.md` JTBD-6.

## When to use
Before any `eas submit` / `pebble submit`, or whenever someone asks whether an app (especially an AI/agent
app) will survive review. Run this AFTER `eas-headless-pipeline` builds but BEFORE it submits.

## The stance it encodes (OPINIONS S16, verbatim intent)
**For an AI app on the store: ship a fixed, reviewed native shell; be visibly differentiated; disclose every
data flow.** As of **2026-06-09 there is no AI-specific guideline** — the generic rules are the teeth. The
vibe-coding pulls (Replit, Vibecode, "Anything") prove 2.5.2 enforcement is live.

## Steps

### Step 1 — 2.5.2: scan for self-modifying / dynamic-feature code (model: opus, BLOCKING)
The hardest wall. The app may **NOT** "download, install, or execute code which introduces or changes
features." An app that executes server-delivered code that **changes features** gets pulled (SCENARIO 7 —
the wrong read is "because it uses AI"; the real cause is *executing code that changes features*). Ship a
**fixed, reviewed native shell**; if generated/dynamic code *must* run, run it in **WebKit / a WebView**,
never the native runtime. This is the same wall as the OTA boundary (`ota-safety` S7) — OTA stays legal
*precisely because* it can't add native features. **Any self-modifying native behavior is BLOCKING.**

### Step 2 — 4.3: prove differentiation (not a thin wrapper) (model: opus, BLOCKING)
Thin wrappers get **4.3-spammed** (KNOWN-PITFALLS §0.11). Have a **concrete, demonstrable unique feature
ready**. If rejected under 4.3, the winning move is a **differentiation memo to the App Review Board** (one
appeal per rejection) naming exactly what's unique — not a resubmit. **A generic "chat with AI" wrapper with
no differentiator is BLOCKING** until a unique feature is named.

### Step 3 — 5.1.2(i): consent modal before any data leaves (model: opus, BLOCKING)
Show a **consent modal naming the provider + the data types BEFORE** any user data leaves the device for a
third-party AI service. Missing/after-the-fact consent is **BLOCKING**. Keep the privacy nutrition labels
accurate to the actual data flows.

### Step 4 — age rating + UGC duty (model: haiku, advisory→blocking if UGC) (model: haiku)
Pick a **conservative age rating** that accounts for **AI-unpredictable content** (an agent can surface
things you didn't author). If the agent surfaces **user-generated content**, **1.2 puts removal/moderation
on you** — ship moderation + reporting, or it's blocking. A too-low age rating for an unpredictable agent is
a rejection risk.

### Step 5 — verify nothing crosses the OTA/native wall post-ship (model: opus)
Confirm the submitted binary's update strategy stays JS-only (no plan to OTA native capability later — that
re-triggers 2.5.2). Cross-check with `ota-safety`. Note honestly: there is **no AI-specific guideline as of
2026-06-09**, so these generic rules ARE the review surface — don't invent an "AI rule" that doesn't exist,
and don't assume an AI app is fine just because it's "useful" (§0.11 — that's insufficient).

## Output format
```
VERDICT: clear | blocking risks (N)
2.5.2 (self-modifying): <pass | BLOCKING: executes server-delivered features → fixed shell / WebView only>
4.3 (differentiation): <pass — unique feature: <name> | BLOCKING: thin wrapper, no differentiator>
5.1.2(i) (consent): <pass — modal names provider+data pre-flow | BLOCKING: missing/late consent>
AGE RATING: <conservative, accounts for AI-unpredictable content: yes/no>
1.2 (UGC duty): <N/A | moderation+reporting shipped | BLOCKING: surfaces UGC, no moderation>
NOTE: no AI-specific guideline as of 2026-06-09 — generic rules are the teeth.
```

## Anti-patterns
- Concluding an app was pulled "because it uses AI" — the real cause is behavior (2.5.2 self-modification, 4.3 thinness).
- Shipping a thin "chat with AI" wrapper with no demonstrable unique feature (4.3 spam target).
- Sending user data to a third-party AI without a pre-flow consent modal naming the provider + data types.
- Running generated/dynamic code in the native runtime instead of a WebView (2.5.2 violation).
- Picking a low age rating for an agent that can surface unpredictable content; ignoring the UGC-removal duty.
- Inventing an "AI guideline" — as of 2026-06-09 there isn't one; the generic rules apply.

## Cross-refs
`pebble review-check` automates this · `pebble submit` runs it as a pre-flight · `ota-safety` (2.5.2 is the
same native wall) · OPINIONS S16 · SCENARIO 7/8 · KNOWN-PITFALLS §0.11.
