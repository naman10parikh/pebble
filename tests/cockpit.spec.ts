// tests/cockpit.spec.ts — pebble cockpit end-to-end (G2 + G3).
//
// Drives the live cockpit with Playwright and asserts the four views render, binary-checkably:
//   1. Brain browser   — a brain note renders (the doc pane has real markdown content).
//   2. Run log         — the run table has >=1 row (real Observability lines).
//   3. Eval scores     — the L1/L2 pyramid + golden corpus render.
//   4. Ask the employee— a round-trip answer's DOM contains a MECHANICAL `brain/<note>.md` citation
//                        (regex brain/[\w-]+\.md) — the G2 "cited answer" bar, not eyeballed.
// Also saves one screenshot per view to content/screenshots/ (the G3 evidence).
//
// Dependency-free: uses the GLOBALLY-installed `playwright` library (not @playwright/test, which isn't a
// project dep — Karpathy: no deps beyond PLAN §7). Resolved via PLAYWRIGHT_PKG (default = the global path).
// Run: node tests/cockpit.spec.ts   (Node 25 strips the TS types natively; the cockpit boots as a child).
//
// Source: PLAN §10 verify · MASTER-TODOS G2/G3 · HARNESS-OVERRIDES §Cockpit.

import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..");
const PORT = Number(process.env.PEBBLE_COCKPIT_PORT || 7799); // 7799 in test (avoid clashing a dev cockpit on 7788)
const BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = join(REPO, "content", "screenshots");
const PW_PKG = process.env.PLAYWRIGHT_PKG || "/usr/local/lib/node_modules/playwright/index.mjs";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
  if (!cond) failures += 1;
}

async function waitForServer(timeoutMs = 15000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/api/status`);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((res) => setTimeout(res, 200));
  }
  throw new Error(`cockpit did not come up on ${BASE} within ${timeoutMs}ms`);
}

async function main(): Promise<void> {
  mkdirSync(SHOTS, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);

  // Boot the cockpit as a child on the test port.
  const server: ChildProcess = spawn("node", [join(REPO, "src", "cockpit", "server.mjs")], {
    cwd: REPO,
    env: { ...process.env, PEBBLE_COCKPIT_PORT: String(PORT) },
    stdio: "ignore",
  });

  const { chromium } = await import(PW_PKG);
  let browser;
  try {
    await waitForServer();
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

    // ── VIEW 1 — Brain browser
    await page.goto(`${BASE}/#brain`, { waitUntil: "networkidle" });
    await page.waitForSelector("#brain-doc", { timeout: 8000 });
    // The doc pane should hold real rendered brain content (>200 chars of text), not a spinner.
    await page.waitForFunction(() => {
      const d = document.querySelector("#brain-doc");
      return d && d.textContent && d.textContent.replace(/\s+/g, " ").length > 200 && !/^loading/i.test(d.textContent.trim());
    }, { timeout: 8000 });
    const brainLen = await page.$eval("#brain-doc", (d) => (d.textContent || "").length);
    check("brain browser renders a note (doc pane has content)", brainLen > 200, `${brainLen} chars`);
    const tocCount = await page.$$eval("#brain-toc button", (bs) => bs.length);
    check("brain browser lists the brain notes", tocCount >= 6, `${tocCount} notes`);
    await page.screenshot({ path: join(SHOTS, `pebble-cockpit-${stamp}-1-brain.png`), fullPage: true });

    // Brain search → BM25 result block. (The BM25 over 6 brain files takes ~6s — wait generously.)
    await page.fill("#brain-q", "OTA native module");
    await page.click("#brain-search-btn");
    await page.waitForSelector("#brain-search-result", { timeout: 20000 });
    const searchTxt = await page.$eval("#brain-search-result", (e) => e.textContent || "");
    check("brain search returns BM25 hits", /brain\/[\w-]+\.md/.test(searchTxt), "result cites a brain file");

    // ── VIEW 2 — Run log
    await page.goto(`${BASE}/#runs`, { waitUntil: "networkidle" });
    await page.waitForSelector("#runs-table tbody tr", { timeout: 8000 });
    const runRows = await page.$$eval("#runs-table tbody tr", (rs) => rs.length);
    check("run log has >=1 row", runRows >= 1, `${runRows} rows`);
    await page.screenshot({ path: join(SHOTS, `pebble-cockpit-${stamp}-2-runlog.png`), fullPage: true });

    // ── VIEW 3 — Eval scores
    await page.goto(`${BASE}/#evals`, { waitUntil: "networkidle" });
    await page.waitForSelector("#golden-table tbody tr", { timeout: 20000 });
    const goldenRows = await page.$$eval("#golden-table tbody tr", (rs) => rs.length);
    check("eval scores render the golden corpus", goldenRows >= 10, `${goldenRows} tasks`);
    const summaryTxt = await page.$eval("#eval-summary", (e) => e.textContent || "");
    check("eval scores show the L1 + L2 pyramid", /L1 structural/.test(summaryTxt) && /L2 binary/.test(summaryTxt));
    await page.screenshot({ path: join(SHOTS, `pebble-cockpit-${stamp}-3-evals.png`), fullPage: true });

    // ── VIEW 4 — Ask the employee (the cited-answer round-trip — THE G2 bar)
    await page.goto(`${BASE}/#ask`, { waitUntil: "networkidle" });
    await page.waitForSelector("#ask-q", { timeout: 8000 });
    await page.fill("#ask-q", "is this OTA safe to ship?");
    await page.click("#ask-btn");
    // ask shells `pebble brain` → BM25 over the whole brain corpus, re-indexed cold per call.
    // Measured cold latency is 22–31s (the index is rebuilt every invocation), so the round-trip
    // budget must clear the worst case — 45s, not 20s, or the (correct) cited answer times out.
    await page.waitForSelector("#ask-answer", { timeout: 45000 });
    // Mechanical citation check: the rendered answer DOM contains a brain/<note>.md reference.
    await page.waitForFunction(() => {
      const a = document.querySelector("#ask-answer");
      return a && /brain\/[\w-]+\.md/.test(a.textContent || "");
    }, { timeout: 45000 });
    const answerTxt = await page.$eval("#ask-answer", (e) => e.textContent || "");
    const citeMatch = answerTxt.match(/brain\/[\w-]+\.md/);
    check("ask-the-employee returns a MECHANICALLY-CITED answer", Boolean(citeMatch), citeMatch ? citeMatch[0] : "no brain/*.md ref");
    const citeChips = await page.$$eval("#ask-citations .cite", (cs) => cs.length).catch(() => 0);
    check("ask-the-employee surfaces a citation strip", citeChips >= 1, `${citeChips} citations`);
    await page.screenshot({ path: join(SHOTS, `pebble-cockpit-${stamp}-4-ask.png`), fullPage: true });

    console.log(`\n  screenshots → ${SHOTS}/pebble-cockpit-${stamp}-*.png`);
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
  }

  console.log(`\ncockpit e2e: ${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("cockpit.spec error:", err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});
