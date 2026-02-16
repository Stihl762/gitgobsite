// src/components/RetroExposureTerminal.tsx
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

type Phase = "init" | "stream" | "protect" | "protected";

const AMBER = "#FFB000"; // per your screenshot
const BG = "#282828";    // retro gray per your screenshot

const TOTAL_MS = 20_000;

// Exact stage durations: sum = 20,000ms
const DUR = {
  init: 3_200,
  stream: 6_800,
  protect: 6_000,
  protected: 4_000,
} as const;

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function makeFillerLine() {
  const left = ["SYS", "NET", "AUTH", "SCAN", "IDX", "ROUTE", "SIG", "HASH", "QUEUE", "TLS", "PROC"][
    Math.floor(Math.random() * 11)
  ];
  const mid = ["handshake", "channel", "cursor", "index", "packet", "ledger", "request", "dispatch", "verify", "audit"][
    Math.floor(Math.random() * 10)
  ];
  const hex = Array.from({ length: 8 }, () => "0123456789ABCDEF"[Math.floor(Math.random() * 16)]).join("");
  const status = ["OK", "PASS", "READY", "SYNC", "HOLD", "RUN"][Math.floor(Math.random() * 6)];

  // “Important-looking” but generic. Does not imply data handling/storage.
  return `[${left}] ${mid.toUpperCase()}::${hex}  status=${status}`;
}

function asciiBar(pct: number, width = 14) {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round((clamped / 100) * width);
  return `[${"█".repeat(filled)}${" ".repeat(Math.max(0, width - filled))}]`;
}

export default function RetroExposureTerminal() {
  const [phase, setPhase] = useState<Phase>("init");
  const [lines, setLines] = useState<string[]>([]);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [bars, setBars] = useState<{ a: number; b: number; c: number }>({ a: 0, b: 0, c: 0 });
  const [showPopup, setShowPopup] = useState(false);
  const [glow, setGlow] = useState(false);

  const rafRef = useRef<number | null>(null);
  const cycleStartRef = useRef<number>(0);

  // Scroll refs to mimic a real terminal (always follow newest output)
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);

  const script = useMemo(() => {
    const initEvents = [
      { at: 0, text: "Initializing NetGoblin engine…" },
      { at: 1100, text: "Dialing secure uplink…" },
      { at: 2150, text: "Handshake established." },
      { at: 2850, text: "Channel locked. Proceeding…" },
    ];

    const streamStart = DUR.init;
    const freeze1 = streamStart + 1_900;
    const freeze2 = streamStart + 3_900;
    const freeze3 = streamStart + 5_900;

    const freezes = [
      { at: freeze1, text: ">> Phone number located" },
      { at: freeze2, text: ">> Address located" },
      { at: freeze3, text: ">> Data broker profiles detected" },
    ];

    const protectStart = DUR.init + DUR.stream;
    const barWindow = 2_000;

    const barSteps = (base: number) => [
      { at: base + 0, v: 0 },
      { at: base + 380, v: 20 },
      { at: base + 760, v: 45 },
      { at: base + 1140, v: 70 },
      { at: base + 1520, v: 90 },
      { at: base + 1880, v: 100 },
    ];

    const barAStart = protectStart;
    const barBStart = protectStart + barWindow;
    const barCStart = protectStart + barWindow * 2;

    const protectedStart = DUR.init + DUR.stream + DUR.protect;

    return {
      initEvents,
      stream: {
        freezes,
        // ✅ Doubled highlight hold time (was 650ms)
        freezeHoldMs: 1300,
      },
      protect: { start: protectStart, barAStart, barBStart, barCStart, barSteps },
      protected: { start: protectedStart, popupInMs: 350, glowStartMs: 1000 },
    };
  }, []);

  function resetCycle() {
    setPhase("init");
    setLines([]);
    setHighlight(null);
    setBars({ a: 0, b: 0, c: 0 });
    setShowPopup(false);
    setGlow(false);
    cycleStartRef.current = nowMs();
  }

  // ✅ Auto-scroll to bottom whenever terminal output changes
  useEffect(() => {
    // Smooth-ish follow for realism; uses anchor when possible.
    if (bottomAnchorRef.current) {
      bottomAnchorRef.current.scrollIntoView({ behavior: "auto", block: "end" });
      return;
    }
    // Fallback
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
    }
  }, [lines, highlight, phase, bars, showPopup]);

  useEffect(() => {
    resetCycle();

    const tick = () => {
      const elapsed = Math.floor(nowMs() - cycleStartRef.current);

      // Hard loop at EXACTLY 20 seconds
      if (elapsed >= TOTAL_MS) {
        resetCycle();
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      // Phase
      if (elapsed < DUR.init) setPhase("init");
      else if (elapsed < DUR.init + DUR.stream) setPhase("stream");
      else if (elapsed < DUR.init + DUR.stream + DUR.protect) setPhase("protect");
      else setPhase("protected");

      // Stage 1 lines
      if (elapsed < DUR.init) {
        script.initEvents.forEach((e) => {
          if (elapsed >= e.at) {
            setLines((prev) => (prev.includes(e.text) ? prev : [...prev, e.text]));
          }
        });
      }

      // Stage 2: stream + freeze/highlight
      if (elapsed >= DUR.init && elapsed < DUR.init + DUR.stream) {
        const activeFreeze = script.stream.freezes.find(
          (f) => elapsed >= f.at && elapsed < f.at + script.stream.freezeHoldMs
        );

        if (activeFreeze) {
          setHighlight(activeFreeze.text);
        } else {
          setHighlight(null);
          // ~11 lines/sec
          if (elapsed % 90 === 0) {
            const l = makeFillerLine();
            setLines((prev) => [...prev, l].slice(-40)); // keep more history since we now scroll
          }
        }
      }

      // Stage 3: bars
      if (elapsed >= script.protect.start && elapsed < script.protect.start + DUR.protect) {
        const applySteps = (base: number, key: "a" | "b" | "c") => {
          const steps = script.protect.barSteps(base);
          const last = steps.filter((s) => elapsed >= s.at).slice(-1)[0]?.v;
          if (typeof last === "number") {
            setBars((prev) => (prev[key] === last ? prev : { ...prev, [key]: last }));
          }
        };
        applySteps(script.protect.barAStart, "a");
        applySteps(script.protect.barBStart, "b");
        applySteps(script.protect.barCStart, "c");
      }

      // Stage 4: popup + glow
      if (elapsed >= script.protected.start) {
        const into = elapsed - script.protected.start;
        if (into >= script.protected.popupInMs) setShowPopup(true);
        if (into >= script.protected.glowStartMs) setGlow(true);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [script]);

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        background: `linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)), ${BG}`,
        borderColor: glow ? AMBER : "rgba(255,255,255,0.12)",
        boxShadow: glow ? `0 0 0 1px ${AMBER}, 0 0 18px rgba(255,176,0,0.30)` : undefined,
      }}
    >
      {/* CRT scanlines */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, rgba(0,0,0,0.28), rgba(0,0,0,0.28) 1px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 6px)",
        }}
      />

      {/* Terminal content */}
      <div className="relative h-full px-4 py-3 font-mono">
        {/* Top mini-header */}
        <div
          className="flex items-center justify-between text-[10px] sm:text-xs tracking-widest mb-2"
          style={{ color: "rgba(255,255,255,0.70)" }}
        >
          <span>NETGOBLIN // EXPOSURE SCAN</span>
          <span style={{ color: "rgba(255,255,255,0.55)" }}>Simulation mode</span>
        </div>

        {/* ✅ Scrollable viewport so it “scrolls down” like a real terminal */}
        <div
          ref={scrollViewportRef}
          className="relative h-[calc(100%-22px)] overflow-y-auto pr-2"
          style={{
            // subtle scrollbar styling, safe to ignore if unsupported
            scrollbarColor: `${AMBER} rgba(255,255,255,0.10)`,
          }}
        >
          <div className="text-[11px] sm:text-sm leading-[1.35]" style={{ color: AMBER }}>
            {lines.map((l, idx) => (
              <div key={idx} className="whitespace-pre-wrap">
                {l}
              </div>
            ))}

            {highlight && (
              <div
                className="mt-2 font-semibold"
                style={{
                  color: "#FFD37A",
                  textShadow: "0 0 10px rgba(255,176,0,0.22)",
                }}
              >
                {highlight}
              </div>
            )}

            {phase === "protect" && (
              <div className="mt-3 space-y-2">
                <div className="flex gap-3">
                  <span className="w-[210px] sm:w-[260px]" style={{ color: "rgba(255,255,255,0.70)" }}>
                    Dispatching goblin agents
                  </span>
                  <span>{asciiBar(bars.a)}</span>
                </div>
                <div className="flex gap-3">
                  <span className="w-[210px] sm:w-[260px]" style={{ color: "rgba(255,255,255,0.70)" }}>
                    Submitting protection requests
                  </span>
                  <span>{asciiBar(bars.b)}</span>
                </div>
                <div className="flex gap-3">
                  <span className="w-[210px] sm:w-[260px]" style={{ color: "rgba(255,255,255,0.70)" }}>
                    Awaiting confirmation
                  </span>
                  <span>{asciiBar(bars.c)}</span>
                </div>
              </div>
            )}

            {/* Cursor */}
            <div className="mt-2" style={{ color: "rgba(255,255,255,0.55)" }}>
              <span className="inline-block animate-pulse">▌</span>
            </div>

            {/* Anchor for auto-scroll */}
            <div ref={bottomAnchorRef} />
          </div>
        </div>

        {/* Stage 4 popup */}
        {showPopup && (
          <div
            className="absolute left-1/2 top-1/2 w-[88%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border px-4 py-3"
            style={{
              borderColor: AMBER,
              background: "rgba(20,20,20,0.72)",
              boxShadow: "0 0 18px rgba(255,176,0,0.22)",
            }}
          >
            <div className="text-sm font-semibold tracking-wide" style={{ color: "#FFD37A" }}>
              STATUS: PROTECTED
            </div>
            <div className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.75)" }}>
              Continuous monitoring enabled.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
