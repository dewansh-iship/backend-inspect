// src/pages/Landing.js
import React from "react";
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <main className="relative overflow-hidden">
      {/* Background */}
      <Bg />

      {/* HERO */}
      <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-14 md:pt-24 md:pb-20">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* Copy */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full glass-chip px-3 py-1 text-xs text-slate-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Autonomous inspection • built for maritime
            </span>

            <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
              Inspect smarter. Catch issues early. Ship safer.
            </h1>

            <p className="mt-4 text-lg text-slate-600">
              Drag &amp; drop photos from your crew. Our inspection engine
              detects unsafe conditions, prioritizes hazards, and outputs
              clean, share‑ready reports—fast.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/upload"
                className="btn-primary group"
                aria-label="Start a new inspection"
              >
                <span>Start Inspection</span>
                <svg
                  className="h-4 w-4 ml-1 -mr-1 transition-transform group-hover:translate-x-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M5 12h14M13 5l7 7-7 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>

              <a
                href="#how"
                className="btn-ghost"
                aria-label="Learn how it works"
              >
                How it works
              </a>
            </div>

            
          </div>

          {/* Preview Glass Card with Mirror effect */}
          <div className="relative">
            <div className="glass-neo sheen p-4 md:p-5 rounded-3xl border border-slate-200/80 shadow-2xl">
              <div className="grid grid-cols-5 gap-4">
                {/* Left: image with reflection */}
                <div className="col-span-2">
                  <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md mirror">
                    <img
                      src="https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=1600&auto=format&fit=crop"
                      alt="Vessel deck"
                      className="aspect-[4/3] object-cover"
                    />
                  </div>
                </div>

                {/* Right: faux report */}
                <div className="col-span-3 flex flex-col">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800">
                      Inspection Report
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[11px] rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Ready
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    <Line w="86%" />
                    <Line w="64%" />
                    <Line w="72%" />
                    <Line w="58%" />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Tag intent="red">Hazard</Tag>
                    <Tag intent="amber">Defect</Tag>
                    <Tag intent="green">Recommendation</Tag>
                  </div>

                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      Minimal, readable report preview
                    </div>
                    <span className="text-xs font-mono text-slate-700">
                      Risk&nbsp;Score: <b>62/100</b>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating glow */}
            <div className="absolute -z-10 inset-x-10 -bottom-6 h-24 blur-2xl bg-sky-200/60 rounded-full" />
          </div>
        </div>
      </section>

      {/* FEATURES ROW (glass tiles) */}
      <section id="how" className="relative max-w-7xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-5">
          <Feature
            title="1) Upload"
            desc="Drag & drop multiple images from your crew. We support all common formats."
            icon="📤"
          />
          <Feature
            title="2) Detect"
            desc="Vision + reasoning flag defects, hazards, and label context automatically."
            icon="🔎"
          />
          <Feature
            title="3) Report"
            desc="Share‑ready summary and per‑photo details with improvements."
            icon="📄"
          />
        </div>
      </section>
    </main>
  );
}

/* ---------- Small building blocks ---------- */

function Bg() {
  return (
    <>
      {/* softer radial wash */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_60%_at_0%_0%,#dff2ff_0%,transparent_60%),radial-gradient(70%_50%_at_100%_10%,#ffe3ea_0%,transparent_55%)] opacity-80" />
      {/* subtle dotted grid */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent,transparent_29px,#eaeef3_30px),linear-gradient(90deg,transparent,transparent_29px,#eaeef3_30px)] bg-[length:30px_30px] opacity-[0.2]" />
    </>
  );
}

function Li({ children }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-sky-400" />
      <span>{children}</span>
    </li>
  );
}

function Tag({ children, intent = "gray" }) {
  const map = {
    red: "bg-rose-50 text-rose-700 border-rose-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    gray: "bg-slate-50 text-slate-700 border-slate-200",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full border ${map[intent]}`}>
      {children}
    </span>
  );
}

function Line({ w = "70%" }) {
  return (
    <span
      className="block h-2 rounded bg-gradient-to-r from-slate-200 to-slate-300"
      style={{ width: w }}
    />
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div className="glass-neo rounded-2xl p-6 border border-slate-200/80">
      <div className="text-2xl">{icon}</div>
      <h3 className="mt-3 font-semibold text-slate-800">{title}</h3>
      <p className="mt-2 text-slate-600">{desc}</p>
    </div>
  );
}