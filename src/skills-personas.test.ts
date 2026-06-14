// skills-personas.test.ts — the COMPONENT layer of the Testing contract (PLAN §9 "Component" row), absent
// before Wave T. Asserts the durable-knowledge artifacts are structurally REAL, not stubs:
//
//   • each of the 5 PLAN-§4 skills/<name>/SKILL.md parses — frontmatter carries name/trigger/model/output,
//     the body has steps, AND it cites a brain/*.md stance (the skill encodes a named OPINIONS/PITFALLS view).
//   • both pebble-specific sub-agents (store-reviewer, build-doctor) name their scope AND reference brain
//     files that ACTUALLY EXIST on disk — a mechanical drift check (a renamed/deleted brain file = a real bug).
//
// This is the component layer because these files are pebble's invokable knowledge surface; if a skill loses
// its trigger or a persona points at a brain file that no longer exists, the harness silently degrades — this
// test fails loudly instead. $0, no spawn, no network.
//
// Source: PLAN §9 (Component row), PLAN §4 (the 5 skills + 2 personas), HARNESS-OVERRIDES §3/§6.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// dist-test/skills-personas.test.js → repo root is one level up (rootDir is src/).
const REPO_ROOT = join(HERE, "..");
const SKILLS_DIR = join(REPO_ROOT, "skills");
const AGENTS_DIR = join(REPO_ROOT, ".claude", "agents");
const BRAIN_DIR = join(REPO_ROOT, "brain");

// The 5 pebble-authored mobile skills (PLAN §4 — the inherited .claude/skills/ generic set does NOT count).
const REQUIRED_SKILLS = [
  "mobile-shape-decision",
  "expo-new-arch-scaffold",
  "eas-headless-pipeline",
  "ota-safety",
  "store-review-preflight",
];

// The 2 pebble-specific sub-agent personas (PLAN §4 — beyond the inherited generic 8).
const PEBBLE_PERSONAS = ["store-reviewer", "build-doctor"];

/** The set of brain note basenames that actually exist (e.g. "OPINIONS.md"), for the drift check. */
function brainFilesOnDisk(): Set<string> {
  return new Set(readdirSync(BRAIN_DIR).filter((f) => f.endsWith(".md")));
}

// ── Skills ────────────────────────────────────────────────────────────────────────────────────────

test("COMPONENT: all 5 PLAN-§4 skills exist under repo skills/ (not the inherited .claude/skills/)", () => {
  for (const name of REQUIRED_SKILLS) {
    const p = join(SKILLS_DIR, name, "SKILL.md");
    assert.ok(existsSync(p), `missing pebble-authored skill: skills/${name}/SKILL.md`);
  }
});

test("COMPONENT: each SKILL.md parses — frontmatter (name/trigger/model/output) + body steps", () => {
  for (const name of REQUIRED_SKILLS) {
    const src = readFileSync(join(SKILLS_DIR, name, "SKILL.md"), "utf8");
    // Frontmatter block present.
    assert.match(src, /^---\s*[\s\S]*?\n---/, `${name}: must open with a --- YAML frontmatter block`);
    const fm = src.slice(0, src.indexOf("\n---", 4));
    // Line-anchored (^…:): the KEY must start a line — so a substring like `removed-trigger:` can't pass.
    assert.match(fm, /^name:\s*\S/m, `${name}: frontmatter has a name`);
    assert.match(fm, /^trigger:\s*\S/m, `${name}: frontmatter has a trigger (the WHEN-to-use)`);
    assert.match(fm, /^model:\s*\S/m, `${name}: frontmatter declares a model tier`);
    assert.match(fm, /^output:\s*\S/m, `${name}: frontmatter declares an output format`);
    // The body must have real steps (a header beyond the title — not an empty stub).
    const body = src.slice(src.indexOf("\n---", 4) + 4);
    assert.ok(body.replace(/\s+/g, " ").length > 200, `${name}: body must have real content, not a stub`);
    assert.match(body, /^#{1,3}\s+\S/m, `${name}: body has at least one section heading (steps/usage)`);
  }
});

test("COMPONENT: each skill encodes a brain stance — cites a brain/*.md that EXISTS", () => {
  const onDisk = brainFilesOnDisk();
  for (const name of REQUIRED_SKILLS) {
    const src = readFileSync(join(SKILLS_DIR, name, "SKILL.md"), "utf8");
    const refs = [...src.matchAll(/brain\/([A-Za-z0-9._-]+\.md)/g)].map((m) => m[1]!);
    assert.ok(refs.length > 0, `${name}: must cite at least one brain/*.md stance (encodes OPINIONS/PITFALLS)`);
    for (const ref of refs) {
      assert.ok(onDisk.has(ref), `${name}: references brain/${ref} which does not exist on disk (drift)`);
    }
  }
});

// ── Sub-agent personas ──────────────────────────────────────────────────────────────────────────

test("COMPONENT: the 2 pebble personas exist FLAT in .claude/agents/ (no agents/agents/ nesting)", () => {
  assert.ok(!existsSync(join(AGENTS_DIR, "agents")), "no nested .claude/agents/agents/ dir");
  for (const persona of PEBBLE_PERSONAS) {
    assert.ok(existsSync(join(AGENTS_DIR, `${persona}.md`)), `missing persona: .claude/agents/${persona}.md`);
  }
});

test("COMPONENT: each persona declares name/description/model + names its scope", () => {
  for (const persona of PEBBLE_PERSONAS) {
    const src = readFileSync(join(AGENTS_DIR, `${persona}.md`), "utf8");
    assert.match(src, /^---\s*[\s\S]*?\n---/, `${persona}: must open with a --- frontmatter block`);
    const fm = src.slice(0, src.indexOf("\n---", 4));
    // Line-anchored keys (^…:) so a substring can't satisfy the field-presence check.
    assert.match(fm, new RegExp(`^name:\\s*${persona}`, "m"), `${persona}: frontmatter name matches the filename`);
    assert.match(fm, /^description:\s*\S/m, `${persona}: has a description`);
    assert.match(fm, /^model:\s*\S/m, `${persona}: declares a model (D12: opus)`);
    // The body must define a scope (what it OWNS / does NOT own) — the boundary that makes it a real persona.
    assert.match(src, /scope/i, `${persona}: body names its scope`);
    assert.match(src, /\bOWN\b/, `${persona}: body states what it OWNS`);
  }
});

test("COMPONENT: each persona reads brain files that EXIST (the 'read these first' refs aren't dangling)", () => {
  const onDisk = brainFilesOnDisk();
  for (const persona of PEBBLE_PERSONAS) {
    const src = readFileSync(join(AGENTS_DIR, `${persona}.md`), "utf8");
    const refs = [...src.matchAll(/brain\/([A-Za-z0-9._-]+\.md)/g)].map((m) => m[1]!);
    assert.ok(refs.length >= 2, `${persona}: must name ≥2 brain files as its source of truth`);
    for (const ref of refs) {
      assert.ok(onDisk.has(ref), `${persona}: references brain/${ref} which does not exist on disk (drift)`);
    }
  }
});

test("COMPONENT: the inherited generic personas are NOT counted as pebble's mobile personas", () => {
  // A sanity guard for the override: store-reviewer/build-doctor must be DISTINCT from the generic 8.
  for (const generic of ["code-reviewer", "test-writer", "security-reviewer"]) {
    assert.ok(!PEBBLE_PERSONAS.includes(generic), `${generic} is inherited-generic, not a pebble mobile persona`);
  }
});
