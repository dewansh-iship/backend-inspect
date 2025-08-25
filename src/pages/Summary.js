// src/pages/Summary.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

/** CONFIG */
const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:5001";

/** Small helpers */
const cleanMD = (s) =>
  String(s ?? "")
    .replace(/\r/g, "")
    .replace(/\*\*/g, "")            // **bold**
    .replace(/^#+\s*/gm, "")           // headings
    .replace(/^- /gm, "• ")            // list bullets
    .replace(/`/g, "")                 // backticks
    .trim();
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** Derive a “risk score” (0–100) from the text content */
function scoreFromText(text = "") {
  const t = text.toLowerCase();
  let s = 40;
  const add = (w, v) => (t.includes(w) ? (s += v) : s);
  add("critical", 35);
  add("major", 25);
  add("severe", 25);
  add("leak", 15);
  add("corrosion", 12);
  add("rust", 10);
  add("broken", 18);
  add("missing", 15);
  add("unsafe", 18);
  add("recommendation", -4);
  add("ok", -10);
  return clamp(Math.round(s), 0, 100);
}

/** Map score → severity */
function severityFromScore(score) {
  if (score >= 85) return "Critical";
  if (score >= 67) return "High";
  if (score >= 34) return "Moderate";
  return "Good";
}

/** Return up to N clean bullets from arbitrary text */
function bulletsFromText(text = "", max = 6) {
  const lines = String(text).split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const bullets = lines
    .filter((ln) => ln.startsWith("•"))
    .map((ln) => ln.replace(/^•\s*/, ""));
  const base = bullets.length ? bullets : lines;
  return base.slice(0, max);
}

/** Tiny UI atoms */
const Chip = ({ tone = "slate", children }) => {
  const toneMap = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    sky: "bg-sky-50 text-sky-700 border-sky-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs ${toneMap[tone]}`}>
      {children}
    </span>
  );
};

const StatCard = ({ label, value, tone = "emerald" }) => {
  const toneMap = {
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-800",
    sky: "bg-sky-50 text-sky-700",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`inline-flex items-baseline gap-2 rounded-xl px-3 py-2 ${toneMap[tone]}`}>
        <span className="text-2xl font-extrabold leading-none">{value}</span>
      </div>
      <div className="mt-2 text-[13px] text-slate-600">{label}</div>
    </div>
  );
};

const Badge = ({ children, tone = "slate" }) => {
  const t = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    yellow: "bg-amber-100 text-amber-800",
    red: "bg-rose-100 text-rose-700",
    blue: "bg-sky-100 text-sky-700",
  };
  return <span className={`px-2 py-0.5 rounded-md text-[11px] ${t[tone]}`}>{children}</span>;
};

export default function Summary() {
  const [data, setData] = useState({}); // {filename: markdown}
  const [err, setErr] = useState("");
  const [active, setActive] = useState(null); // {name, text}
  const modalRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${BACKEND}/summary`);
        if (!r.ok) throw new Error(await r.text());
        const json = await r.json();
        setData(json || {});
      } catch (e) {
        setErr(e.message || "Failed to load summary.");
      }
    })();
  }, []);

  /** Previews saved by Upload page (name->dataURL) */
  const previews = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("previewMap") || "{}");
    } catch {
      return {};
    }
  }, []);

  /** Flatten into rows with computed score & severity */
  const rows = useMemo(() => {
    return Object.entries(data).map(([name, raw]) => {
      // unwrap common shapes: string | array | { analysis | summary | text }
      let txt = raw;
      if (Array.isArray(txt)) txt = txt.join("\n");
      if (typeof txt === "object" && txt !== null) {
        txt = txt.analysis ?? txt.summary ?? txt.text ?? JSON.stringify(txt);
      }
      const plain = cleanMD(txt);

      const score = scoreFromText(plain);
      const severity = severityFromScore(score);

      // quick tags
      const tags = [];
      if (/hazard/i.test(plain)) tags.push("Hazard");
      if (/defect|damage|broken|corrosion|rust/i.test(plain)) tags.push("Defect");
      if (/recommend/i.test(plain)) tags.push("Recommendation");

      return { name, text: plain, score, severity, tags };
    });
  }, [data]);

  /** Summary counters */
  const counters = useMemo(() => {
    const photos = rows.length;
    const hazards = rows.filter((r) => r.tags.includes("Hazard")).length;
    const defects = rows.filter((r) => r.tags.includes("Defect")).length;
    const recs = rows.filter((r) => r.tags.includes("Recommendation")).length;
    const avg = photos ? Math.round(rows.reduce((a, b) => a + b.score, 0) / photos) : 0;
    return { photos, hazards, defects, recs, avg };
  }, [rows]);

  /** Heatmap buckets: severity(rows) × score bands(columns) */
  const heat = useMemo(() => {
    const matrix = {
      Critical: [0, 0, 0],
      High: [0, 0, 0],
      Moderate: [0, 0, 0],
      Good: [0, 0, 0],
    };
    rows.forEach((r) => {
      const col = r.score < 34 ? 0 : r.score < 67 ? 1 : 2;
      matrix[r.severity][col] += 1;
    });
    return matrix;
  }, [rows]);

  /** Action register – aggressively collect actionable lines (bullets, verbs, or "Recommendations:" section) */
  const actions = useMemo(() => {
    const acc = [];

    // helper: is this line actionable?
    const actionVerb = /(recommend|action|improv|apply|install|repair|replace|secure|ensure|inspect|repaint|clean|remove|add|label|guard|fasten|seal|tighten|mitigate|cover|reset|service|test)/i;

    rows.forEach((r) => {
      // Work on per‑row text
      const text = r.text || "";

      // 1) If there is an explicit "Recommendations:" section, prefer that chunk
      let recChunk = null;
      const splitByRec = text.split(/recommendations?:/i);
      if (splitByRec.length > 1) {
        // Take everything after the first occurrence
        recChunk = splitByRec.slice(1).join(" ");
      }

      // Collect candidate lines:
      const source = recChunk || text;

      // Break into lines, keep tight
      const lines = source
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean);

      // 2) Bullets that start with •
      const bulletLines = lines
        .filter((l) => /^•\s*/.test(l))
        .map((l) => l.replace(/^•\s*/, ""));

      // 3) Any line with an action verb
      const verbLines = lines
        .filter((l) => actionVerb.test(l))
        .map((l) => l.replace(/^•\s*/, ""));

      // Merge and lightly normalize
      const merged = [...bulletLines, ...verbLines]
        .map((l) =>
          l
            .replace(/^Action:?\s*/i, "") // strip "Action:" prefixes
            .replace(/\s{2,}/g, " ")
            .replace(/^\*\s*/, "")
            .replace(/\.$/, "") // remove trailing dot for nicer table
            .trim()
        )
        .filter((l) => l.length >= 6);

      // Push to accumulator
      merged.forEach((line) => {
        acc.push({
          action: line,
          name: r.name,
          severity: r.severity,
          score: r.score,
        });
      });

      // 4) Fallback: if nothing actionable found for this row, use first few summary-like lines
      if (merged.length === 0) {
        const fallback = lines
          .filter((l) => l.length >= 8)
          .slice(0, 2);
        fallback.forEach((line) => {
          acc.push({
            action: line.replace(/^•\s*/, ""),
            name: r.name,
            severity: r.severity,
            score: r.score,
          });
        });
      }
    });

    // Dedupe near-duplicates (by lowercase prefix)
    const seen = new Set();
    const deduped = acc.filter((a) => {
      const key = (a.action || "").toLowerCase().slice(0, 64);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Keep a reasonable cap so table stays readable
    return deduped.slice(0, 200);
  }, [rows]);

  /** Modal scroll lock */
  useEffect(() => {
    if (active) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => (document.body.style.overflow = "");
  }, [active]);

  /** Active card metadata (tags, severity, score) for the modal */
  const activeMeta = useMemo(() => {
    if (!active) return null;
    return rows.find((r) => r.name === active.name) || null;
  }, [active, rows]);

  return (
    <main className="min-h-screen bg-white">
      <header className="max-w-7xl mx-auto px-6 pt-8 pb-4">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Inspection Report</h1>
        <p className="mt-1 text-sm text-slate-500">
          Generated by <b>iShip Vessel Inspection AI</b> • {new Date().toLocaleString()}
        </p>
      </header>

      <section className="max-w-7xl mx-auto px-6 pb-14 grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6">
        {/* LEFT – toc + counters */}
        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="px-5 py-3 border-b border-slate-200 font-semibold">Contents</div>
            <nav className="p-3">
              {[
                "1) Disclaimer",
                "2) Executive Summary",
                "3) Risk Heatmap",
                "4) Area Ratings",
                "5) Action Register",
                "6) Findings (per photo)",
                "7) Photo Gallery",
              ].map((t, i) => (
                <a
                  key={i}
                  href={`#s-${i + 1}`}
                  className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100"
                >
                  {t}
                </a>
              ))}
            </nav>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
            <div className="font-semibold mb-3">Summary Counters</div>
            <div className="space-y-3">
              <CounterBar label="Hazards" value={counters.hazards} tone="rose" />
              <CounterBar label="Defects" value={counters.defects} tone="amber" />
              <CounterBar label="Recommendations" value={counters.recs} tone="emerald" />
            </div>
          </div>
        </aside>

        {/* RIGHT – report body */}
        <div className="space-y-10">
          {/* 1 Disclaimer */}
          <section id="s-1" className="space-y-3">
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">1) Disclaimer</h2>
            <p className="text-slate-700 leading-relaxed">
              This report reflects the condition visible in the submitted photographs at the time of analysis. It does
              not replace statutory or class inspections. Findings and recommendations are generated by AI and should be
              reviewed by a qualified marine inspector prior to action.
            </p>
          </section>

          {/* 2 Executive Summary */}
          <section id="s-2" className="space-y-5">
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">2) Executive Summary</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Photos analyzed" value={counters.photos} tone="emerald" />
              <StatCard label="Total hazards" value={counters.hazards} tone="rose" />
              <StatCard label="Total defects" value={counters.defects} tone="amber" />
              <StatCard label="Average risk score" value={`${counters.avg}/100`} tone="sky" />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="font-semibold mb-2">Highlights</div>
              <ul className="list-disc pl-5 text-slate-700 space-y-1">
                <li>
                  AI flagged <b>{counters.hazards}</b> hazards and <b>{counters.defects}</b> defects across submitted
                  areas.
                </li>
                <li>
                  <b>{counters.recs}</b> targeted, actionable recommendations were generated for crew & maintenance.
                </li>
                <li>Detailed findings are linked to each photo for rapid triage and follow-up.</li>
              </ul>
            </div>
          </section>

          {/* 3 Heatmap */}
          <section id="s-3" className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">3) Risk Heatmap</h2>
              <Chip tone="slate">Severity × Score bands</Chip>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[560px] w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Severity ↓ / Score →</th>
                    <th className="px-4 py-3 text-left">0–33</th>
                    <th className="px-4 py-3 text-left">34–66</th>
                    <th className="px-4 py-3 text-left">67–100</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {Object.entries(heat).map(([sev, cols]) => (
                    <tr key={sev}>
                      <td className="px-4 py-3 font-medium">{sev}</td>
                      {cols.map((v, i) => (
                        <td key={i} className="px-4 py-3">
                          <HeatCell value={v} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1"><Dot c="bg-rose-500" /> High</span>
              <span className="inline-flex items-center gap-1"><Dot c="bg-amber-500" /> Medium</span>
              <span className="inline-flex items-center gap-1"><Dot c="bg-emerald-500" /> Low</span>
            </div>
          </section>

          {/* 4 Area Ratings (lightweight placeholders – adapt to your album names later) */}
          <section id="s-4" className="space-y-3">
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">4) Area Ratings</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <AreaPill name="Hull / Structure" score="Good" tone="green" />
              <AreaPill name="Deck & Safety" score="Moderate" tone="amber" />
              <AreaPill name="Bridge / Ops" score="Good" tone="green" />
              <AreaPill name="Machinery" score="Moderate" tone="amber" />
            </div>
          </section>

          {/* 5 Action Register */}
          <section id="s-5" className="space-y-3">
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">5) Action Register</h2>
            <p className="text-slate-600 text-sm">
              Consolidated recommendations extracted from all findings. Assign owners and due dates in your CMMS.
            </p>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[800px] w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Action</th>
                    <th className="px-4 py-3 text-left">Linked Photo</th>
                    <th className="px-4 py-3 text-left">Severity</th>
                    <th className="px-4 py-3 text-left">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {actions.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-4 py-6 text-slate-500">
                        No explicit recommendations parsed from the findings.
                      </td>
                    </tr>
                  )}
                  {actions.map((a, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">{a.action}</td>
                      <td className="px-4 py-3">
                        <button
                          className="text-sky-700 hover:underline"
                          onClick={() => setActive({ name: a.name, text: rows.find((r) => r.name === a.name)?.text })}
                        >
                          {a.name}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={a.severity === "Critical" ? "red" : a.severity === "High" ? "yellow" : a.severity === "Moderate" ? "yellow" : "green"}>
                          {a.severity}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{a.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 6 Findings per photo */}
          <section id="s-6" className="space-y-4">
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">6) Findings (per photo)</h2>
            <p className="text-slate-600 text-sm">Click any card to open the full-size photo and detailed text.</p>

            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {rows.map((r) => {
                const lines = r.text.split(/\n+/).filter(Boolean);
                const bullets = lines
                  .filter((ln) => ln.trim().startsWith("•"))
                  .map((ln) => ln.replace(/^•\s*/, ""));
                const summary = bullets.length ? bullets.slice(0, 5) : lines.slice(0, 3);

                return (
                  <button
                    key={r.name}
                    onClick={() => setActive({ name: r.name, text: r.text })}
                    className="text-left rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition overflow-hidden group"
                  >
                    {/* Image */}
                    <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                      {previews[r.name] ? (
                        <img
                          src={previews[r.name]}
                          alt={r.name}
                          className="h-full w-full object-cover group-hover:scale-[1.02] transition"
                        />
                      ) : (
                        <div className="h-full grid place-items-center text-slate-400">Preview not available</div>
                      )}
                    </div>

                    {/* Body */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-800">{r.name}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {Array.from(new Set(r.tags)).map((t) => (
                              <Chip key={t} tone={t === "Hazard" ? "rose" : t === "Defect" ? "amber" : "emerald"}>{t}</Chip>
                            ))}
                            {r.tags.length === 0 && <Chip>Info</Chip>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <Badge tone={r.severity === "Critical" ? "red" : r.severity === "High" ? "yellow" : r.severity === "Moderate" ? "yellow" : "green"}>{r.severity}</Badge>
                          <div className="mt-1 text-[11px] text-slate-500">Risk <span className="font-semibold text-slate-700">{r.score}</span>/100</div>
                        </div>
                      </div>

                      {/* Bullet list / summary */}
                      <ul className="mt-3 list-disc pl-5 text-sm text-slate-700 space-y-1">
                        {summary.map((ln, i) => (
                          <li key={i}>{ln}</li>
                        ))}
                      </ul>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 7 Photo Gallery */}
          <section id="s-7" className="space-y-3">
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">7) Photo Gallery</h2>
            <div className="grid xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {rows.map((r) => (
                <button
                  key={r.name}
                  className="group rounded-xl overflow-hidden border border-slate-200 bg-white text-left"
                  onClick={() => setActive({ name: r.name, text: r.text })}
                >
                  <img
                    src={previews[r.name]}
                    alt={r.name}
                    className="h-40 w-full object-cover group-hover:scale-[1.02] transition"
                  />
                  <div className="p-2 border-t border-slate-200">
                    <div className="truncate text-sm">{r.name}</div>
                    <div className="mt-1">
                      <Badge tone={r.severity === "Critical" ? "red" : r.severity === "High" ? "yellow" : r.severity === "Moderate" ? "yellow" : "green"}>
                        {r.severity}
                      </Badge>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <footer className="pt-8 pb-2 text-sm text-slate-500">
            © {new Date().getFullYear()} <b>iShip Vessel Inspection AI</b>. All rights reserved.
            <div className="mt-1">
              <Link to="/upload" className="text-sky-700 hover:underline">
                Start a new inspection →
              </Link>
            </div>
          </footer>
        </div>
      </section>

      {/* MODAL */}
      {active && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={() => setActive(null)}
        >
          <div
            ref={modalRef}
            className="max-w-5xl w-full rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
              <div className="font-semibold">{active.name}</div>
              <button
                aria-label="Close"
                onClick={() => setActive(null)}
                className="h-8 w-8 grid place-items-center rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-0">
              <div className="p-4 border-r border-slate-200">
                {previews[active.name] ? (
                  <img
                    src={previews[active.name]}
                    alt={active.name}
                    className="w-full rounded-xl border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="h-64 grid place-items-center text-slate-400 border border-dashed border-slate-300 rounded-xl">
                    Preview not available
                  </div>
                )}
              </div>
              <div className="p-5 max-h-[70vh] overflow-y-auto">
                {/* Meta chips */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {activeMeta?.tags?.length
                    ? Array.from(new Set(activeMeta.tags)).map((t) => (
                        <Chip
                          key={t}
                          tone={t === "Hazard" ? "rose" : t === "Defect" ? "amber" : "emerald"}
                        >
                          {t}
                        </Chip>
                      ))
                    : <Chip>Info</Chip>}
                  {activeMeta && (
                    <>
                      <Badge tone={activeMeta.severity === "Critical" ? "red" : activeMeta.severity === "High" ? "yellow" : activeMeta.severity === "Moderate" ? "yellow" : "green"}>
                        {activeMeta.severity}
                      </Badge>
                      <span className="text-[11px] text-slate-500">
                        Risk <span className="font-semibold text-slate-700">{activeMeta.score}</span>/100
                      </span>
                    </>
                  )}
                </div>

                {/* Structured text with bold section headings and styled bullets */}
                <div className="space-y-2 text-slate-800 pr-2">
                  {active.text
                    .split("\n")
                    .filter(Boolean)
                    .map((ln, i) => {
                      const isHeading = /^(Defects|Hazards|Recommendations|Action):/i.test(ln);
                      const isBullet = /^(\u2022|-)\s*/.test(ln);
                      const cleaned = ln.replace(/^(\u2022|-)\s*/, "");

                      if (isHeading) {
                        return (
                          <p key={i} className="font-bold mt-3 mb-1 text-slate-900">
                            {ln}
                          </p>
                        );
                      }

                      if (isBullet) {
                        return (
                          <p
                            key={i}
                            className="leading-relaxed pl-5 relative before:content-['•'] before:absolute before:left-0 before:text-slate-500"
                          >
                            {cleaned}
                          </p>
                        );
                      }

                      return (
                        <p key={i} className="leading-relaxed">
                          {ln}
                        </p>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/** Subcomponents */

function CounterBar({ label, value = 0, tone = "slate" }) {
  const t = {
    rose: "bg-rose-500",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
    slate: "bg-slate-500",
  };
  const bar = Math.min(100, Math.max(6, value * 7)); // visual length
  return (
    <div>
      <div className="flex items-center justify-between text-[13px] mb-1">
        <span className="text-slate-700">{label}:</span>
        <span className="text-slate-500">{value}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${t[tone]}`} style={{ width: `${bar}%` }} />
      </div>
    </div>
  );
}

function HeatCell({ value }) {
  const c =
    value >= 3
      ? "bg-rose-100 text-rose-700"
      : value === 2
      ? "bg-amber-100 text-amber-800"
      : value === 1
      ? "bg-emerald-100 text-emerald-700"
      : "bg-slate-100 text-slate-400";
  return (
    <div className={`inline-flex min-w-[44px] justify-center rounded-md px-2 py-1 ${c}`}>
      {value}
    </div>
  );
}

function Dot({ c = "bg-slate-400" }) {
  return <span className={`h-2.5 w-2.5 rounded-full inline-block ${c}`} />;
}

function AreaPill({ name, score = "Good", tone = "green" }) {
  const map = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
  };
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span className="font-medium">{name}</span>
      <span className={`px-2 py-0.5 rounded-md text-sm border ${map[tone]}`}>{score}</span>
    </div>
  );
}