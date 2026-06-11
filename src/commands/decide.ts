// commands/decide.ts — `pebble decide "<brief>"`: the shape call (RN/PWA/bare/Flutter).
// Encodes OPINIONS S15 + SCENARIO 14 + JTBD-1: the "3+ → native" rule + the agent-app corollary +
// the iOS PWA walls. Pure + deterministic so it unit-tests and the eval L2 can grade it.
// Source: brain/BATTLE-TESTED-SCENARIOS.md SCENARIO 14, brain/OPINIONS.md S15.

export type Shape = "native" | "pwa" | "bare" | "flutter";

export interface ShapeDecision {
  readonly shape: Shape;
  readonly rationale: string;
  readonly signals: readonly string[];
  readonly iosPwaWalls?: readonly string[];
}

// The five "3+ → native" signal buckets (SCENARIO 14) + the agent-app hard triggers (S15).
const NATIVE_SIGNAL_PATTERNS: ReadonlyArray<{ name: string; re: RegExp; agentHard: boolean }> = [
  { name: "BLE/NFC", re: /\b(ble|bluetooth|nfc)\b/i, agentHard: false },
  { name: "sensors", re: /\b(sensor|accelerometer|gyroscope|camera|lidar|barometer)\b/i, agentHard: true },
  { name: "GPU/perf", re: /\b(gpu|3d|game|graphics|high[- ]?performance|60\s?fps)\b/i, agentHard: false },
  { name: "widgets/Siri/platform-UI", re: /\b(widget|siri|live activit|app clip|apple watch|wearos)\b/i, agentHard: false },
  { name: "large offline data", re: /\b(offline|large.*(data|storage)|durable.*(memory|storage)|local database|sqlite|mmkv)\b/i, agentHard: true },
  { name: "proactive push", re: /\b(proactive|silent push|background push|re-?engage|notif|push)\b/i, agentHard: true },
  { name: "background work", re: /\b(background (work|fetch|sync|task|location)|long[- ]?running)\b/i, agentHard: true },
];

const IOS_PWA_WALLS = [
  "iOS push is home-screen-install-only, no silent/rich, EU-blocked (iOS 17.4+)",
  "7-day cache eviction + 50MB cap → no durable local memory",
  "no Background Sync/Fetch",
  "no BLE/NFC",
] as const;

const FLUTTER_RE = /\bflutter\b/i;
const BARE_RE = /\b(bare react native|bare rn|self[- ]?hosted runner|own the toolchain|pin xcode)\b/i;
const AGENT_RE = /\bagent\b/i;

/** Run the decision rule on a free-text brief. */
export function decideShape(brief: string): ShapeDecision {
  const text = brief ?? "";
  const matched = NATIVE_SIGNAL_PATTERNS.filter((p) => p.re.test(text));
  const signals = matched.map((p) => p.name);
  const isAgent = AGENT_RE.test(text);
  const agentHardHit = matched.some((p) => p.agentHard);

  if (FLUTTER_RE.test(text)) {
    return {
      shape: "flutter",
      rationale:
        "Brief explicitly names Flutter. pebble recommends it for raw render performance, but BUILDS in RN/Expo — " +
        "recommending Flutter is in scope, building it is out (names the boundary).",
      signals,
    };
  }
  if (BARE_RE.test(text)) {
    return {
      shape: "bare",
      rationale:
        "Bare RN is the deliberate escape hatch (~5-15%) when you must own the native toolchain (OPINIONS S1/S10). " +
        "Default is still Expo managed + dev builds; drop to bare with eyes open.",
      signals,
    };
  }

  // Agent-app corollary (S15): go native the moment proactive push / background / durable memory / sensors matter.
  if (isAgent && agentHardHit) {
    return {
      shape: "native",
      rationale:
        "Agent app needing proactive push / background work / durable local memory / sensors → NATIVE (Expo managed + dev builds). " +
        "iOS PWA cannot do these — the walls below are disqualifying for a proactive/persistent agent (OPINIONS S15, SCENARIO 14).",
      signals,
      iosPwaWalls: IOS_PWA_WALLS,
    };
  }

  // The "3+ → native" rule (SCENARIO 14).
  if (signals.length >= 3) {
    return {
      shape: "native",
      rationale:
        `3+ native-requiring signals present (${signals.join(", ")}) → NATIVE per the "3+ → native" rule (SCENARIO 14). ` +
        "Build in Expo managed + dev builds.",
      signals,
      iosPwaWalls: IOS_PWA_WALLS,
    };
  }

  if (signals.length >= 1) {
    return {
      shape: "native",
      rationale:
        `A native-requiring signal is present (${signals.join(", ")}). Below the 3-signal bar but the named capability ` +
        "(esp. push/background/durable-memory/sensors) is an iOS PWA wall → lean NATIVE; confirm the capability is truly needed.",
      signals,
      iosPwaWalls: IOS_PWA_WALLS,
    };
  }

  // Reactive, cloud-backed, no hardware/background/proactive need → a PWA is legitimately enough (40-60% cheaper).
  return {
    shape: "pwa",
    rationale:
      "No native-requiring signals: a reactive, cloud-backed app with no proactive push / background / durable memory / sensors. " +
      "A PWA is legitimately enough and 40-60% cheaper (OPINIONS S15). Reach for native the moment a wall below applies.",
    signals,
    iosPwaWalls: IOS_PWA_WALLS,
  };
}

/** CLI entry: print the shape + rationale. */
export function runDecide(brief: string): number {
  if (!brief || brief.trim() === "") {
    console.error('pebble decide: provide a brief, e.g. pebble decide "an app that needs BLE + push"');
    return 1;
  }
  const d = decideShape(brief);
  console.log(`shape: ${d.shape}`);
  console.log(`rationale: ${d.rationale}`);
  if (d.signals.length > 0) console.log(`signals: ${d.signals.join(", ")}`);
  if (d.iosPwaWalls && (d.shape === "native" || d.shape === "pwa")) {
    console.log("iOS PWA walls:");
    for (const w of d.iosPwaWalls) console.log(`  - ${w}`);
  }
  return 0;
}
