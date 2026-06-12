// app.js — pebble cockpit SPA (G2). Vanilla JS, zero framework, zero build step.
// Four views over the server's read-mostly API: brain browser · run log · eval scores · ask-the-employee.
// Each view is a render(container) fn; a tiny hash router swaps them. The server is the single source of
// truth — this file only fetches + paints. Source: PLAN §10 · MASTER-TODOS G1/G2.

const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const kid of kids) n.append(kid?.nodeType ? kid : document.createTextNode(String(kid)));
  return n;
};

async function api(path) {
  const res = await fetch(path);
  const body = await res.json().catch(() => ({ error: `bad JSON from ${path}` }));
  if (!res.ok) throw new Error(body.error || `${res.status} on ${path}`);
  return body;
}

const STAGE = () => $("#app-view");

function viewHead(title, sub) {
  return el("div", { class: "view-head" }, el("h1", {}, title), el("p", {}, sub));
}

// Render markdown via marked if the CDN loaded; else a safe <pre> fallback (keeps the view alive offline).
function renderMarkdown(md) {
  if (window.marked && typeof window.marked.parse === "function") {
    const wrap = el("div", {});
    wrap.innerHTML = window.marked.parse(md);
    return wrap;
  }
  return el("pre", { class: "mono", style: "white-space:pre-wrap" }, md);
}

// ─────────────────────────────────────────────────────────── VIEW 1 — BRAIN BROWSER
async function renderBrain(container) {
  container.replaceChildren(
    viewHead("Brain", "pebble's dated mobile expertise — query it before you guess."),
  );
  const card = el("div", { class: "card" });
  container.append(card);

  // Search box → pebble brain (BM25). The result is the ranked, mechanically-cited hits.
  const input = el("input", { type: "text", class: "q", id: "brain-q", placeholder: 'Search the brain — e.g. "OTA native module", "fingerprint runtimeVersion"' });
  const searchBtn = el("button", { class: "btn", id: "brain-search-btn", onclick: doSearch }, "Search");
  const searchOut = el("div", { id: "brain-search-out" });
  card.append(el("div", { class: "row" }, input, searchBtn), searchOut);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });

  async function doSearch() {
    const q = input.value.trim();
    if (!q) return;
    searchOut.replaceChildren(el("div", { class: "spin" }, `searching brain for "${q}"…`));
    try {
      const r = await api(`/api/brain/search?q=${encodeURIComponent(q)}`);
      searchOut.replaceChildren(el("div", { class: "result-block", id: "brain-search-result" }, r.output || "(no hits)"));
    } catch (e) {
      searchOut.replaceChildren(el("div", { class: "empty" }, `search failed: ${e.message}`));
    }
  }

  // The notes table-of-contents + doc pane.
  const layout = el("div", { class: "brain-layout" });
  const toc = el("div", { class: "brain-toc", id: "brain-toc" });
  const doc = el("div", { class: "brain-doc", id: "brain-doc" }, el("div", { class: "spin" }, "loading brain…"));
  layout.append(toc, doc);
  container.append(el("div", { class: "card" }, layout));

  try {
    const { notes } = await api("/api/brain/list");
    notes.forEach((note, i) => {
      const b = el("button", { class: i === 0 ? "active" : "", "data-note": note.name, onclick: () => loadNote(note.name, b) },
        note.name.replace(/\.md$/, ""), el("span", { class: "bytes" }, `${Math.round(note.bytes / 1024)}k`));
      toc.append(b);
    });
    if (notes[0]) loadNote(notes[0].name, toc.firstChild);
  } catch (e) {
    doc.replaceChildren(el("div", { class: "empty" }, `failed to list brain: ${e.message}`));
  }

  async function loadNote(name, btn) {
    [...toc.children].forEach((c) => c.classList.remove("active"));
    if (btn) btn.classList.add("active");
    doc.replaceChildren(el("div", { class: "spin" }, `loading ${name}…`));
    try {
      const r = await api(`/api/brain/note?name=${encodeURIComponent(name)}`);
      doc.replaceChildren(renderMarkdown(r.markdown));
      doc.scrollTop = 0;
    } catch (e) {
      doc.replaceChildren(el("div", { class: "empty" }, `failed to load ${name}: ${e.message}`));
    }
  }
}

// ─────────────────────────────────────────────────────────── VIEW 2 — RUN LOG
async function renderRuns(container) {
  container.replaceChildren(
    viewHead("Run log", "Every wrapped pebble invocation — Observability over logs/runs.jsonl."),
  );
  try {
    const { runs, aggregate } = await api("/api/runs");
    // Aggregate roll-up.
    const aggCard = el("div", { class: "card" });
    aggCard.append(el("h2", { style: "font-family:var(--font-display);font-weight:400;font-size:18px;margin-bottom:12px" }, "By command"));
    if (aggregate.length === 0) {
      aggCard.append(el("div", { class: "empty" }, "no runs logged yet — run a wrapped command (e.g. pebble doctor)."));
    } else {
      const t = el("table");
      t.append(el("thead", {}, rowEl("th", ["CMD", "COUNT", "TOTAL ms", "AVG ms", "OK", "ERR", "BLK", "MODELS"], [0])));
      const tb = el("tbody");
      for (const a of aggregate) {
        tb.append(rowEl("td", [a.cmd, a.count, a.totalMs, a.avgMs, a.ok, a.error, a.blocked, a.models.join(",") || "—"], [1, 2, 3, 4, 5, 6]));
      }
      t.append(tb);
      aggCard.append(t);
    }
    container.append(aggCard);

    // Chronological tail (most recent first).
    const tailCard = el("div", { class: "card" });
    tailCard.append(el("h2", { style: "font-family:var(--font-display);font-weight:400;font-size:18px;margin-bottom:12px" }, `Recent runs (${runs.length})`));
    const t2 = el("table", { id: "runs-table" });
    t2.append(el("thead", {}, rowEl("th", ["WHEN", "CMD", "DURATION", "STATUS", "MODEL"], [])));
    const tb2 = el("tbody");
    for (const r of [...runs].reverse()) {
      const status = r.status === "ok" ? "ok" : r.status === "blocked" ? "block" : "err";
      const when = (r.ts || "").replace("T", " ").replace(/\.\d+Z$|Z$/, "");
      const tr = el("tr");
      tr.append(
        el("td", { class: "mono small" }, when),
        el("td", { class: "mono" }, r.cmd || "?"),
        el("td", { class: "num" }, `${r.durationMs ?? 0}ms`),
        el("td", {}, el("span", { class: `chip ${status}` }, r.status || "?")),
        el("td", { class: "mono small muted" }, r.model || "—"),
      );
      tb2.append(tr);
    }
    t2.append(tb2);
    tailCard.append(runs.length ? t2 : el("div", { class: "empty" }, "no run lines yet."));
    container.append(tailCard);
  } catch (e) {
    container.append(el("div", { class: "card" }, el("div", { class: "empty" }, `failed to load runs: ${e.message}`)));
  }
}

function rowEl(cell, vals, numIdx) {
  const tr = el("tr");
  vals.forEach((v, i) => tr.append(el(cell, { class: numIdx.includes(i) ? "num" : "" }, String(v))));
  return tr;
}

// ─────────────────────────────────────────────────────────── VIEW 3 — EVAL SCORES
async function renderEvals(container) {
  container.replaceChildren(
    viewHead("Eval scores", "The Hamel pyramid over brain/BATTLE-TESTED-SCENARIOS — L1 structural · L2 binary · L3 trajectory."),
  );
  const card = el("div", { class: "card", id: "eval-summary" }, el("div", { class: "spin" }, "running L1 + L2 ($0)…"));
  container.append(card);
  try {
    const d = await api("/api/eval");
    const summary = el("div", { class: "row", style: "gap:16px;flex-wrap:wrap" });
    summary.append(
      levelChip("L1 structural", d.l1),
      levelChip("L2 binary", d.l2),
      el("span", { class: "chip idle", title: "token-gated (D8)" }, "L3 trajectory · nightly (token-gated)"),
    );
    card.replaceChildren(
      el("h2", { style: "font-family:var(--font-display);font-weight:400;font-size:18px;margin-bottom:12px" }, "Pyramid"),
      summary,
    );

    // L2 per-task results (the binary CI-blockers).
    if (d.l2tasks && d.l2tasks.length) {
      const t = el("table", { style: "margin-top:16px" });
      t.append(el("thead", {}, rowEl("th", ["TASK", "RESULT", "CRITERIA"], [])));
      const tb = el("tbody");
      for (const row of d.l2tasks) {
        const tr = el("tr");
        tr.append(
          el("td", { class: "mono" }, row.id),
          el("td", {}, el("span", { class: `chip ${row.pass ? "ok" : "err"}` }, row.pass ? "PASS" : "FAIL")),
          el("td", { class: "small muted" }, row.criteria),
        );
        tb.append(tr);
      }
      t.append(tb);
      card.append(el("h2", { style: "font-family:var(--font-display);font-weight:400;font-size:16px;margin:16px 0 8px" }, "L2 CI-blocking golden tasks"), t);
    }

    // The full golden corpus (G1–G14) with level + CI-block tag.
    const gc = el("div", { class: "card" });
    gc.append(el("h2", { style: "font-family:var(--font-display);font-weight:400;font-size:18px;margin-bottom:12px" }, `Golden corpus (${d.golden.length})`));
    const gt = el("table", { id: "golden-table" });
    gt.append(el("thead", {}, rowEl("th", ["#", "TITLE", "SCENARIO", "JTBD", "LEVEL", "CI"], [])));
    const gtb = el("tbody");
    for (const g of d.golden) {
      const tr = el("tr");
      tr.append(
        el("td", { class: "mono" }, g.id),
        el("td", { class: "small" }, g.title),
        el("td", { class: "mono small muted" }, g.scenario),
        el("td", { class: "num" }, g.jtbd),
        el("td", {}, el("span", { class: `chip ${g.hamel_level === "L2" ? "warn" : "idle"}` }, g.hamel_level)),
        el("td", {}, g.ci_block ? el("span", { class: "chip block" }, "blocks") : el("span", { class: "chip idle" }, "nightly")),
      );
      gtb.append(tr);
    }
    gt.append(gtb);
    gc.append(gt);
    container.append(gc);
  } catch (e) {
    card.replaceChildren(el("div", { class: "empty" }, `failed to run evals: ${e.message}`));
  }
}

function levelChip(label, lv) {
  if (!lv) return el("span", { class: "chip idle" }, `${label} · n/a`);
  const cls = lv.green ? "ok" : "err";
  return el("span", { class: `chip ${cls}` }, `${label} · ${lv.pass}/${lv.total} ${lv.green ? "green" : "RED"}`);
}

// ─────────────────────────────────────────────────────────── VIEW 4 — ASK THE EMPLOYEE
async function renderAsk(container) {
  container.replaceChildren(
    viewHead("Ask the employee", "Ask pebble a mobile question — it answers from the brain, with sources."),
  );
  const card = el("div", { class: "card" });
  let mode = "brain";

  const toggle = el("div", { class: "mode-toggle" },
    el("button", { class: "active", "data-mode": "brain", onclick: () => setMode("brain") }, "Ask brain"),
    el("button", { "data-mode": "decide", onclick: () => setMode("decide") }, "Shape decision"));
  const input = el("input", { type: "text", class: "q", id: "ask-q", placeholder: 'e.g. "is this OTA safe?" — or switch to Shape decision and describe the app' });
  const askBtn = el("button", { class: "btn", id: "ask-btn", onclick: doAsk }, "Ask");
  const out = el("div", { id: "ask-out" });
  card.append(toggle, el("div", { class: "row", style: "margin-top:12px" }, input, askBtn), out);
  container.append(card);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") doAsk(); });

  function setMode(m) {
    mode = m;
    [...toggle.children].forEach((b) => b.classList.toggle("active", b.dataset.mode === m));
    input.placeholder = m === "decide"
      ? 'Describe the app — e.g. "an app that needs BLE + background location + push"'
      : 'e.g. "is this OTA safe?", "why is my EAS build failing?"';
  }

  async function doAsk() {
    const q = input.value.trim();
    if (!q) return;
    out.replaceChildren(el("div", { class: "spin" }, "pebble is thinking…"));
    try {
      const r = await api(`/api/ask?q=${encodeURIComponent(q)}&mode=${mode}`);
      const block = el("div", { class: "result-block", id: "ask-answer" }, r.answer || "(no answer)");
      const cites = el("div", { class: "cite-strip", id: "ask-citations" });
      (r.citations || []).forEach((c) => cites.append(el("span", { class: "cite" }, c)));
      const nodes = [block];
      if ((r.citations || []).length) {
        nodes.push(el("div", { class: "small muted", style: "margin-top:12px" }, "sources:"), cites);
      }
      out.replaceChildren(...nodes);
    } catch (e) {
      out.replaceChildren(el("div", { class: "empty" }, `ask failed: ${e.message}`));
    }
  }
}

// ─────────────────────────────────────────────────────────── ROUTER + BOOT
const VIEWS = { brain: renderBrain, runs: renderRuns, evals: renderEvals, ask: renderAsk };

function go(name) {
  const view = VIEWS[name] ? name : "brain";
  [...$("#nav-rail").querySelectorAll("button[data-view]")].forEach((b) =>
    b.classList.toggle("active", b.dataset.view === view));
  if (location.hash !== `#${view}`) location.hash = view;
  VIEWS[view](STAGE());
}

async function boot() {
  // Masthead stats.
  try {
    const s = await api("/api/status");
    $("#stat-brain").textContent = s.brain_notes;
    $("#stat-runs").textContent = s.runs;
    $("#stat-golden").textContent = s.golden;
    if (s.tagline) $("#tagline").textContent = s.tagline;
  } catch { /* masthead is decorative — never block the views */ }

  $("#nav-rail").querySelectorAll("button[data-view]").forEach((b) =>
    b.addEventListener("click", () => go(b.dataset.view)));
  window.addEventListener("hashchange", () => go(location.hash.slice(1)));
  // Keyboard: "/" focuses the active view's search/ask box.
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !/input|textarea/i.test(document.activeElement?.tagName || "")) {
      const box = $("#brain-q") || $("#ask-q");
      if (box) { e.preventDefault(); box.focus(); }
    }
  });
  go(location.hash.slice(1) || "brain");
}

boot();
