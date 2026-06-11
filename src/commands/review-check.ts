// commands/review-check.ts — `pebble review-check`: the store-rejection pre-flight.
// Knowledge-graded (deterministic checklist output, no creds): the 2.5.2 self-mod scan, the consent
// modal, the age rating, the UGC moderation duty. Encodes OPINIONS §store-compliance + KNOWN-PITFALLS 0.11.
// Source: PLAN §4 command tree, brain/OPINIONS.md (2.5.2 / 4.3 / UGC), brain/KNOWN-PITFALLS.md §0.11.

export interface ReviewCheckItem {
  readonly id: string;
  readonly guideline: string;
  readonly check: string;
  readonly failLooksLike: string;
}

/** The store pre-flight checklist (pure → testable + reusable by the MCP tool + cockpit). */
export const REVIEW_CHECKLIST: readonly ReviewCheckItem[] = [
  {
    id: "self-mod",
    guideline: "2.5.2",
    check: "App must NOT download/install/execute code that introduces or changes features.",
    failLooksLike: "Server-delivered JS that changes features (Replit/Vibecode/'Anything' pattern) → pulled. Ship a fixed reviewed shell; dynamic code only inside WebKit.",
  },
  {
    id: "thin-wrapper",
    guideline: "4.3",
    check: "App must not be a thin/spam wrapper around a model or website.",
    failLooksLike: "Thin GPT-wrapper positioning → 4.3-spam rejection. Add real native value (offline, sensors, platform UI).",
  },
  {
    id: "consent",
    guideline: "5.1.1",
    check: "Permission prompts have purpose strings; data-collection consent modal present before collection.",
    failLooksLike: "Camera/location/contacts accessed without an Info.plist usage string or a consent modal → rejected.",
  },
  {
    id: "age-rating",
    guideline: "1.x age rating",
    check: "Age rating questionnaire matches actual content (esp. UGC / AI-generated content).",
    failLooksLike: "Under-rated UGC/AI app → metadata rejection or post-release pull.",
  },
  {
    id: "ugc-duty",
    guideline: "1.2 UGC",
    check: "UGC apps ship: filtering, a report mechanism, a block mechanism, and a published moderation contact.",
    failLooksLike: "UGC with no report/block/moderation → 1.2 rejection (2026-06-09 adds UGC-removal duty + 'may be removed' teeth).",
  },
] as const;

/** CLI entry: print the pre-flight. rc 0 (advisory — it's a checklist the agent reasons over, not a live scan). */
export function runReviewCheck(): number {
  console.log("pebble review-check — store-rejection pre-flight (knowledge-graded; reason over each before submit):");
  for (const item of REVIEW_CHECKLIST) {
    console.log(`  [${item.guideline}] ${item.id}`);
    console.log(`    check: ${item.check}`);
    console.log(`    fail:  ${item.failLooksLike}`);
  }
  console.log("  → Resolve every item BEFORE `pebble submit`. The OTA wall: never smuggle a feature-changing update (2.5.2).");
  return 0;
}
