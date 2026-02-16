// src/components/HeroSection.tsx
"use client";
import { motion } from "framer-motion";
import RetroExposureTerminal from "./RetroExposureTerminal";

interface HeroSectionProps {
  onStartProtection?: () => void;
  onSeePlans?: () => void;
}

export default function HeroSection({ onStartProtection, onSeePlans }: HeroSectionProps) {
  return (
    <section
      className="
        relative w-full overflow-hidden
        bg-[#171710]
        bg-[url('/guildgrain.png')]
        bg-cover bg-blend-multiply
        flex flex-col items-center justify-center
        text-center
        py-20 px-6 sm:px-10
        border-b border-[#1F3B1D]/60
      "
    >
      {/* Subtle ambient glow / overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1F3B1D]/60 via-transparent to-[#171710] pointer-events-none" />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 max-w-3xl mx-auto"
      >
        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#E3DAC9] leading-tight drop-shadow-[0_0_12px_rgba(255,191,0,0.15)]">
          <span className="block text-[#FFBF00]">Your Name Is for Sale.</span>
          <span className="block">We Hunt Those Who Sell It.</span>
        </h1>

        {/* Subtext */}
        <p className="mt-6 text-sm sm:text-base md:text-lg text-[#E3DAC9]/80 max-w-xl mx-auto leading-relaxed">
          Every day, data brokers trade your private details. NetGoblin’s hunters track,
          confront, and remove those leaks before they reach the wrong hands.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button
            onClick={onStartProtection}
            className="
              px-6 py-3 rounded-full text-sm sm:text-base font-semibold 
              bg-[#FFBF00] text-[#171710] 
              hover:bg-[#E3DAC9] transition-colors shadow-[0_0_12px_rgba(255,191,0,0.25)]
            "
          >
            Start Protection
          </button>
          <button
            onClick={onSeePlans}
            className="
              px-6 py-3 rounded-full text-sm sm:text-base font-semibold 
              border border-[#FFBF00]/60 text-[#FFBF00]
              hover:bg-[#1F3B1D] hover:border-[#FFBF00] transition-colors
            "
          >
            See Plans
          </button>
        </div>

        {/* Retro Terminal Animation (20s loop) */}
        <div
          className="
            mt-12 h-48 sm:h-64 rounded-2xl
            border border-[#1F3B1D]
            overflow-hidden
            text-left
          "
        >
          <RetroExposureTerminal />
        </div>
      </motion.div>
    </section>
  );
}
