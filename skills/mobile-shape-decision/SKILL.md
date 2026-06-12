---
name: mobile-shape-decision
description: Decide PWA vs native (and the native shape) for a product — especially an AI/agent app. Use when someone asks "PWA or native?", "should this be an app?", "do we need to ship to the store?", or any agent-app shape call. Encodes pebble's OPINIONS S15 "3+ → native" rule and the iOS PWA capability walls.
trigger: "PWA or native?", "should this be a native app?", "should this be an app at all?", "is a PWA enough?", agent-app / mobile-shape decisions, before `pebble init`
model: opus (judgment call — the wrong shape is a multi-week sunk cost; never route this to a cheap tier)
output: a SHAPE verdict (`native` | `pwa`) + the matched signals + the specific walls that decided it + the cost note, in the format at the bottom
---

# mobile-shape-decision

> The single highest-leverage decision pebble makes: **native vs PWA**. Getting it wrong is a multi-week
> rebuild, so this is an `opus`-tier judgment, never a vibe. The rule is **deterministic** (the same brief
> always yields the same verdict) and it is encoded in `pebble decide` — this skill is the human-readable
> reasoning the CLI automates. Stance source: `brain/OPINIONS.md` STANCE 15, `brain/BATTLE-TESTED-SCENARIOS.md`
> SCENARIO 14, `brain/KNOWN-PITFALLS.md` §0.9.

## When to use
Anyone — a coding agent, the cockpit, or a human — asking whether a product should be native, a PWA, or
whether it needs to be an app at all. **Run this BEFORE `pebble init`** — scaffolding the wrong shape is the
expensive mistake this skill exists to prevent.

## The stance it encodes (OPINIONS S15, verbatim intent)
**Default an *agent* app to native the moment it needs proactive push / background execution / durable local
memory / sensors. Otherwise a PWA is legitimately enough — and 40-60% cheaper.** Engineers *chronically
overestimate* iOS PWA capability (magicbell); don't let "Apple opened iOS to PWAs" talk you into a PWA for a
proactive/background/sensor use case.

## Steps

### Step 1 — Enumerate the product's hard requirements (model: haiku)
Cheap extraction. From the brief, list which of these the product genuinely needs (not "might be nice"):
- **Proactive push** — server-initiated nudges when the app is closed (an agent that "reaches out").
- **Background execution** — work while not foregrounded (Background Fetch / Sync, location, audio).
- **Durable local memory** — data that must survive >7 days and exceed ~50 MB on-device.
- **Sensors / hardware** — BLE, NFC, camera-as-CV, GPU compute.
- **Platform UI surfaces** — widgets, Siri/Shortcuts, Live Activities, share-sheet targets.

### Step 2 — Apply the "3+ → native" rule + the agent-app corollary (model: opus)
This is the judgment core — do NOT delegate to a cheap tier.
- Count distinct categories matched across {BLE/NFC, GPU, widgets/Siri, large offline data, platform UI}.
  **3 or more → native.** (The rule is a tripwire, not a vote — a single *disqualifying* wall below also
  forces native.)
- **Agent-app corollary:** if the product's *value proposition* is **persistent memory** or **proactive
  nudges**, that alone forces native — those are exactly the two things a PWA cannot do durably.
- A reactive, cloud-backed agent (server-side inference, no hardware, no proactive push) is the *exact*
  profile a PWA covers — and it's 40-60% cheaper. Say so plainly when it's true.

### Step 3 — Name the specific iOS PWA walls that decide it (model: haiku)
Don't argue in the abstract — cite the concrete wall. The disqualifying iOS PWA limits (KNOWN-PITFALLS §0.9):
- **Push is home-screen-install-only, no silent/rich push, EU-blocked** (iOS 17.4+). An agent that nudges
  through push therefore can't be a PWA on iOS.
- **No Background Sync / Background Fetch** — no work while closed.
- **7-day cache eviction + ~50 MB cap** — a PWA *cannot hold durable local memory*. Disqualifying for any
  agent whose value is on-device memory.

### Step 4 — State the cost honestly + the override path (model: opus)
- If the verdict is **native**, note the tradeoff: native is the right call *because* of the named wall, but
  it costs more and adds store review. Don't pretend it's free.
- If the verdict is **pwa**, note the **40-60% cheaper** figure — but flag it as **directional, not a hard
  number**; the "~70% of apps could be a PWA" figure is an unconfirmed estimate (`brain/GAPS-AND-DISPUTES.md`)
  — never quote 70% as fact.
- Defaults are rebuttable: if the caller has a documented reason to override (e.g. a reactive agent that will
  *never* need push), state it and proceed.

## Output format
```
SHAPE: native | pwa
SIGNALS MATCHED: <list the categories / value-prop triggers that fired> (count: N)
DECIDED BY: <the specific wall or the 3+ rule or the agent-app corollary>
COST NOTE: <native: "+store review, higher build cost, justified by <wall>" | pwa: "~40-60% cheaper, directional">
OVERRIDE: <none | the stated rebuttal reason>
```

## Anti-patterns
- Recommending a PWA for a proactive/background/durable-memory agent because "iOS supports PWAs now." It does
  — with walls that disqualify exactly that use case.
- Quoting the 70%-PWA-is-enough figure as if it were measured (it's a GAPS estimate).
- Skipping the cost note — a verdict without the tradeoff is incomplete.

## Cross-refs
`pebble decide "<brief>"` automates this · OPINIONS S15 · SCENARIO 14 · KNOWN-PITFALLS §0.9 · GAPS-AND-DISPUTES (cost figures).
