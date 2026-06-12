// eval/grader-l2.mjs — the binary ($0, no-LLM) grader for the L2 golden tasks.
// Hamel pattern: a golden task pins the canonical answer pebble ships (its documented stance); the grader
// asserts that answer (case-insensitively) CONTAINS every root-cause keyword + every fix keyword AND does
// NOT *endorse* any named obvious-but-wrong path. Binary per-criterion — no Likert, no model, deterministic
// (so pass^k holds trivially: the same answer grades identically every run).
// Source: PLAN §6 (L2 = the 7 binary CI-blocking golden tasks), HARNESS-OVERRIDES §9, brain/BATTLE-TESTED-SCENARIOS.md.

// Negation tokens that, appearing shortly BEFORE an obvious-but-wrong phrase, turn it from an ENDORSEMENT
// (bad) into a WARNING (good — "do NOT roll back the JS"). The brain's scenarios always warn this way, so
// the anti-criterion must be negation-aware, not a naive substring check (a substring check fails a correct
// answer that explicitly names the wrong path to caution against it).
const NEGATIONS = ["not ", "n't ", "never ", "avoid ", "don't ", "do not ", "rather than ", "instead of "];
const NEG_WINDOW = 48; // chars of lookbehind in which a negation flips an occurrence to a warning

/** True if EVERY occurrence of `phrase` in `text` is negated (a warning), i.e. the wrong path is never endorsed. */
function isAlwaysNegated(text, phrase) {
  let from = 0;
  for (;;) {
    const idx = text.indexOf(phrase, from);
    if (idx === -1) return true; // no (more) occurrences → nothing endorsed
    const window = text.slice(Math.max(0, idx - NEG_WINDOW), idx);
    const negated = NEGATIONS.some((n) => window.includes(n));
    if (!negated) return false; // a bare (un-negated) occurrence = an endorsement of the wrong path
    from = idx + phrase.length;
  }
}

/**
 * Grade one L2 golden task against its own pinned `pebble_answer`.
 * @param {object} task A golden task JSON ({ id, pebble_answer, root_cause_keywords, fix_keywords, avoid_keywords }).
 * @returns {{ id:string, pass:boolean, criteria:{rootCause:boolean, fix:boolean, avoidsWrong:boolean}, missing:string[], leaked:string[] }}
 */
export function gradeL2(task) {
  const answer = String(task.pebble_answer ?? "").toLowerCase();
  const rootKeys = (task.root_cause_keywords ?? []).map((k) => String(k).toLowerCase());
  const fixKeys = (task.fix_keywords ?? []).map((k) => String(k).toLowerCase());
  const avoidKeys = (task.avoid_keywords ?? []).map((k) => String(k).toLowerCase());

  const missing = [];
  // L2 is binary but forgiving on breadth: the answer must name the root cause AND the fix. We require
  // EVERY listed keyword so a partial/wrong answer fails — the keywords are the minimal correct-answer skeleton.
  for (const k of rootKeys) if (!answer.includes(k)) missing.push(`root:${k}`);
  for (const k of fixKeys) if (!answer.includes(k)) missing.push(`fix:${k}`);

  // The anti-criterion: the canonical answer must not ENDORSE the named obvious-but-wrong path. An occurrence
  // is only a violation if it is NOT negated (the brain warns "do NOT <wrong path>" — that must still pass).
  const leaked = [];
  for (const k of avoidKeys) if (!isAlwaysNegated(answer, k)) leaked.push(k);

  const rootCause = rootKeys.every((k) => answer.includes(k));
  const fix = fixKeys.every((k) => answer.includes(k));
  const avoidsWrong = leaked.length === 0;
  const pass = rootCause && fix && avoidsWrong && answer.length > 0;

  return { id: task.id, pass, criteria: { rootCause, fix, avoidsWrong }, missing, leaked };
}
