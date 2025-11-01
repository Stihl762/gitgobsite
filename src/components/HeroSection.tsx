import React from "react";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="min-h-[75vh] bg-[#171710] flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">
      
      {/* Ambient aura effect */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(circle_at_center,_#FFBF00_0%,_transparent_60%)] blur-3xl"></div>

      {/* Subtle grain / film feel */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.07] bg-[url('/noise.png')]"></div>

      {/* Heading */}
      <h1 className="text-5xl md:text-6xl font-extrabold text-[#E3DAC9] leading-tight relative z-10">
        Quiet. Focused.<br/>
        <span className="text-[#FFBF00] glow">Relentless.</span>
      </h1>

      {/* Subtext */}
      <p className="text-lg md:text-xl text-[#E3DAC9]/80 max-w-2xl mt-6 leading-relaxed relative z-10">
        Personal data defense for modern humans.<br/>
        We stalk what stalks you.
      </p>

      {/* Button */}
      <Link
        href="/join"
        className="
          mt-10 bg-[#1f3b1d] hover:bg-[#2c5728]
          border border-[#FFBF00] hover:border-[#E3DAC9]
          text-[#E3DAC9] px-10 py-4 rounded-xl text-lg font-medium
          transition shadow-[0_0_12px_rgba(255,191,0,0.12)]
          relative z-10
        "
      >
        Request Beta Access
      </Link>

      {/* Micro text */}
      <p className="text-xs text-[#E3DAC9]/40 mt-5 relative z-10">
        No ads. No tracking. No noise.
      </p>

      {/* Text glow animation */}
      <style jsx>{`
        .glow {
          text-shadow: 
            0 0 4px #ffbf00,
            0 0 10px rgba(255, 191, 0, 0.55),
            0 0 18px rgba(255, 191, 0, 0.25);
          animation: pulse 6s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            text-shadow: 
              0 0 4px #ffbf00,
              0 0 8px rgba(255, 191, 0, 0.5),
              0 0 14px rgba(255, 191, 0, 0.25);
          }
          50% {
            opacity: 0.85;
            text-shadow: 
              0 0 2px #ffbf00,
              0 0 6px rgba(255, 191, 0, 0.35),
              0 0 10px rgba(255, 191, 0, 0.18);
          }
        }
      `}</style>
    </section>
  );
}
