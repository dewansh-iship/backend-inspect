// src/pages/Upload.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ---- Config ---- */
const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:5001";
const PIPELINE = ["Upload", "Pre-processing", "Vision", "Reasoning", "Report Build"];

export default function Upload() {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);

  // progress & phase per file
  const [progressMap, setProgressMap] = useState({});
  const [phaseMap, setPhaseMap] = useState({});
  const timers = useRef({});

  // console metrics
  const [tokensUsed, setTokensUsed] = useState(0);
  const [eta, setEta] = useState(20);
  const [logs, setLogs] = useState([]);
  const logTimer = useRef(null);
  const etaTimer = useRef(null);
  const tokenTimer = useRef(null);
  const logsEndRef = useRef(null);

  const navigate = useNavigate();

  /* ------------ helpers ------------ */
  const addLog = (line) =>
    setLogs((p) => (p.length > 120 ? [...p.slice(-120), line] : [...p, line]));

  const startConsole = (n) => {
    setEta(Math.max(12, 6 * n));
    setTokensUsed(0);
    tokenTimer.current = setInterval(
      () => setTokensUsed((t) => t + Math.floor(Math.random() * 220 + 60)),
      600
    );
    logTimer.current = setInterval(() => {
      const msgs = [
        "queued frame batch",
        "upload chunk ack",
        "safety rail check",
        "detecting corrosion mask",
        "OCR labels @ gauges",
        "segmenting hazard zone",
        "compiling recommendations",
        "dispatching payload → engine",
      ];
      addLog(
        `[${new Date().toLocaleTimeString()}] ${
          msgs[Math.floor(Math.random() * msgs.length)]
        } …`
      );
    }, 450);
    etaTimer.current = setInterval(() => setEta((t) => (t > 0 ? t - 1 : 0)), 1000);
  };
  const stopConsole = () => {
    clearInterval(logTimer.current);
    clearInterval(etaTimer.current);
    clearInterval(tokenTimer.current);
  };
  const cleanup = () => {
    Object.values(timers.current).forEach(clearInterval);
    stopConsole();
  };
  useEffect(() => cleanup, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const localPreviews = useMemo(
    () => Object.fromEntries(files.map((f) => [f.name, URL.createObjectURL(f)])),
    [files]
  );

  // persist base64 previews for Summary page and allow appending without losing previous
  const handleIncomingFiles = async (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    // store previews (append to existing)
    const pairs = await Promise.all(
      incoming.map(
        (file) =>
          new Promise((res) => {
            const r = new FileReader();
            r.onload = () => res([file.name, r.result]);
            r.readAsDataURL(file);
          })
      )
    );
    let prevMap = {};
    try {
      prevMap = JSON.parse(sessionStorage.getItem("previewMap") || "{}");
    } catch {}
    sessionStorage.setItem(
      "previewMap",
      JSON.stringify({ ...prevMap, ...Object.fromEntries(pairs) })
    );

    // append + dedupe by filename
    setFiles((prev) => {
      const map = new Map(prev.map((f) => [f.name, f]));
      for (const f of incoming) if (!map.has(f.name)) map.set(f.name, f);
      return Array.from(map.values());
    });
    setError("");
  };

  const onDrop = (e) => {
    e.preventDefault();
    handleIncomingFiles(e.dataTransfer.files);
  };

  const removeFile = (name) => setFiles((arr) => arr.filter((f) => f.name !== name));

  const startProgress = (name) => {
    setPhaseMap((pm) => ({ ...pm, [name]: 0 }));
    setProgressMap((m) => ({ ...m, [name]: 1 }));
    timers.current[name] = setInterval(() => {
      setProgressMap((prev) => {
        const cur = prev[name] ?? 0;
        const inc = cur < 40 ? 8 : cur < 70 ? 4 : 1.5;
        const next = Math.min(97, cur + inc * (0.5 + Math.random()));
        return { ...prev, [name]: next };
      });
      setPhaseMap((prev) => {
        const p = prev[name] ?? 0;
        const approx = (progressMap[name] ?? 0) + 5;
        let np = p;
        if (approx > 15) np = Math.max(np, 1);
        if (approx > 45) np = Math.max(np, 2);
        if (approx > 70) np = Math.max(np, 3);
        return { ...prev, [name]: np };
      });
    }, 420);
  };

  const finishProgress = (name) => {
    clearInterval(timers.current[name]);
    setProgressMap((m) => ({ ...m, [name]: 100 }));
    setPhaseMap((pm) => ({ ...pm, [name]: PIPELINE.length - 1 }));
  };

  const upload = async () => {
    if (!files.length || isUploading) return;
    setIsUploading(true);
    setShowDrawer(true);
    setError("");

    files.forEach((f) => startProgress(f.name));
    startConsole(files.length);
    addLog(`session start • ${files.length} file(s)`);

    try {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));

      const res = await fetch(`${BACKEND}/upload`, { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());

      files.forEach((f) => finishProgress(f.name));
      addLog("server: completed • building report map");

      setTimeout(() => {
        cleanup();
        setIsUploading(false);
        setShowDrawer(false);
        navigate("/summary");
      }, 900);
    } catch (e) {
      cleanup();
      setIsUploading(false);
      addLog(`error: ${e.message}`);
      setError(e.message || "Upload failed");
    }
  };

  const doneCount = files.filter((f) => (progressMap[f.name] ?? 0) >= 100).length;

  /* ------------ UI ------------ */
  return (
    <main
      className="min-h-[88vh] bg-white"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {/* Hero / header */}
      <section className="max-w-7xl mx-auto px-6 pt-10 md:pt-14">
        <div className="glass-neo rounded-3xl p-7 md:p-9 border border-slate-200/80">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                Start a new inspection
              </h1>
              <p className="mt-1 text-slate-600">
                Upload your vessel photos for autonomous inspection by the iShip Engine.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Pill>JPEG</Pill>
              <Pill>PNG</Pill>
              <Pill>Bulk upload</Pill>
            </div>
          </div>
        </div>
      </section>

      {/* Drop-zone */}
      <section className="max-w-7xl mx-auto px-6 pt-6 pb-6">
        <label
          htmlFor="file-upload"
          className="block glass-neo sheen rounded-3xl p-10 text-center cursor-pointer border border-slate-200/80 hover:shadow-lg transition"
        >
          <input
            id="file-upload"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleIncomingFiles(e.target.files)}
          />
          <div className="max-w-xl mx-auto">
            <div className="text-5xl">📤</div>
            <div className="mt-3 text-lg font-semibold text-slate-800">
              Drag & drop images here
            </div>
            <div className="text-sm text-slate-600">or click to browse from your device</div>
            <div className="mt-4 flex flex-wrap gap-2 justify-center text-xs text-slate-600">
              <span className="px-2 py-1 rounded-full bg-white/70 border border-slate-200">
                Multiple files supported
              </span>
              <span className="px-2 py-1 rounded-full bg-white/70 border border-slate-200">
                Keep adding more anytime
              </span>
            </div>
          </div>
        </label>
      </section>

      {/* Preview grid & action */}
      {files.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {files.map((f) => (
              <figure
                key={f.name}
                className="relative rounded-2xl overflow-hidden border border-slate-200 bg-white mirror"
                title={f.name}
              >
                <img
                  src={localPreviews[f.name]}
                  alt={f.name}
                  className="object-cover w-full h-36"
                />
                <button
                  onClick={() => removeFile(f.name)}
                  className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-slate-900 text-white hover:bg-slate-700 shadow"
                  title="Remove"
                  disabled={isUploading}
                >
                  ✕
                </button>
                <figcaption className="p-2 text-xs text-slate-700 truncate">
                  {f.name}
                </figcaption>
              </figure>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={upload}
              disabled={isUploading}
              className="px-6 py-3 rounded-2xl bg-sky-600 text-white font-semibold shadow-lg hover:bg-sky-500 disabled:opacity-60"
            >
              {isUploading ? "Analyzing…" : "Upload & Analyze"}
            </button>
            <span className="text-slate-500 text-sm">{files.length} file(s) selected</span>
          </div>

          {error && (
            <pre className="mt-4 text-rose-600 whitespace-pre-wrap">{error}</pre>
          )}
        </section>
      )}

      {/* Right-side drawer */}
      {showDrawer && (
        <aside className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white/80 backdrop-blur sticky top-0">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="font-bold text-slate-800">iShip Engine Pipeline</h2>
            </div>
            <button
              className="h-8 w-8 grid place-items-center rounded-full bg-slate-900 text-white hover:bg-slate-700 shadow"
              onClick={() => !isUploading && setShowDrawer(false)}
              title="Close"
              disabled={isUploading}
            >
              ✕
            </button>
          </div>

          {/* Stats */}
          <div className="px-4 pt-3 grid grid-cols-3 gap-3 items-stretch">
            <EtaStat seconds={eta} className="col-span-2" />
            <div className="flex flex-col gap-3">
              <BadgeStat label="Tokens" value={Intl.NumberFormat().format(Math.round(tokensUsed))} />
              <BadgeStat label="Queue" value={`${doneCount}/${files.length}`} />
            </div>
          </div>

          {/* Steps */}
          <div className="px-4 pt-2">
            <div className="flex flex-wrap gap-2">
              {PIPELINE.map((step, i) => (
                <span
                  key={i}
                  className="px-2 py-1 text-[11px] rounded-md border border-slate-200 bg-slate-50 text-slate-700"
                >
                  {i + 1}. {step}
                </span>
              ))}
            </div>
          </div>

          {/* Per-file status */}
          <div className="p-4 border-t border-slate-200 space-y-3 overflow-y-auto">
            {files.map((f) => {
              const p = Math.round(progressMap[f.name] ?? (isUploading ? 5 : 0));
              const phIdx = phaseMap[f.name] ?? 0;
              const phase = PIPELINE[phIdx] || PIPELINE[0];
              const done = p >= 100;
              return (
                <div key={f.name} className="bg-white border border-slate-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <img
                      src={localPreviews[f.name]}
                      alt={f.name}
                      className="h-10 w-10 rounded-md object-cover border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs truncate text-slate-800">{f.name}</div>
                      <div className="text-[11px] text-slate-600">
                        {done ? "Completed" : `Stage: ${phase}`}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        done
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-sky-50 text-sky-700 border border-sky-200"
                      }`}
                    >
                      {done ? "done" : "running"}
                    </span>
                  </div>

                  {/* tiny stage chips */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {PIPELINE.map((s, idx) => {
                      const active = idx === phIdx && !done;
                      return (
                        <span
                          key={s}
                          className={
                            "px-1.5 py-0.5 text-[10px] rounded border " +
                            (done
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : active
                              ? "bg-sky-50 text-sky-700 border-sky-200"
                              : "bg-white text-slate-500 border-slate-200")
                          }
                        >
                          {idx + 1}
                        </span>
                      );
                    })}
                  </div>

                  {/* progress bar */}
                  <div className="w-full h-2 rounded bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 transition-all"
                      style={{ width: `${p}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Logs */}
          <div className="p-4 border-t border-slate-200">
            <div className="text-xs text-slate-600 mb-1">Live logs</div>
            <div className="h-40 overflow-y-auto font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-2">
              {logs.map((l, i) => (
                <div key={i} className="text-slate-800">
                  {l}
                </div>
              ))}
              {isUploading && <div className="text-sky-700 animate-pulse">▌ streaming …</div>}
              <div ref={logsEndRef} />
            </div>
          </div>

          <div className="px-4 py-3 text-[11px] text-slate-600 border-t border-slate-200">
            iShip Engine is processing your photos. You’ll be redirected to the report when ready.
          </div>
        </aside>
      )}
    </main>
  );
}

/* ------- small UI atoms ------- */
function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/80 border border-slate-200 text-slate-700 text-xs px-2 py-1 shadow-sm">
      {children}
    </span>
  );
}

function EtaStat({ seconds, className = "" }) {
  return (
    <div
      className={`rounded-2xl bg-gradient-to-br from-sky-50 to-white border border-slate-200 p-4 flex items-center justify-between ${className}`}
    >
      <div>
        <div className="text-[11px] uppercase tracking-wide text-slate-500">
          Estimated Time
        </div>
        <div className="mt-1 text-4xl md:text-5xl font-extrabold text-slate-800 tabular-nums">
          {seconds}
          <span className="text-xl align-top ml-1">s</span>
        </div>
        <div className="mt-1 text-xs text-slate-500">for all photos</div>
      </div>
      <div className="relative h-16 w-16">
        <svg viewBox="0 0 36 36" className="h-16 w-16">
          <path
            className="text-slate-200"
            strokeWidth="3.5"
            stroke="currentColor"
            fill="none"
            d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831"
          />
          <path
            className="text-sky-500"
            strokeWidth="3.5"
            strokeLinecap="round"
            stroke="currentColor"
            fill="none"
            style={{
              strokeDasharray: `${Math.max(5, Math.min(100, 100 - (seconds % 100)))} , 100`,
            }}
            d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-xs text-slate-600">
          ETA
        </div>
      </div>
    </div>
  );
}

function BadgeStat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-sm font-semibold text-slate-800 tabular-nums">
        {value}
      </div>
    </div>
  );
}