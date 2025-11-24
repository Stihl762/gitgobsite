"use client";
import { motion } from "framer-motion";

interface ExposureQuestionProps {
  exposureLevel: "low" | "medium" | "high" | null;
  onSelect: (level: "low" | "medium" | "high") => void;
}

export default function ExposureQuestion({
  exposureLevel,
  onSelect,
}: ExposureQuestionProps) {
  return (
    <section
      className="
        relative w-full py-16 px-6 sm:px-10
        bg-[#171710]
        bg-[url('/guildgrain.png')]
        bg-cover bg-blend-multiply
        border-t border-[#1F3B1D]/60
        text-center
      "
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        viewport={{ once: true }}
        className="relative z-10 max-w-2xl mx-auto"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-[#E3DAC9] mb-4">
          How exposed do you feel online?
        </h2>
        <p className="text-sm sm:text-base text-[#E3DAC9]/75 mb-8">
          Tell our goblins how bad it looks out there — we&apos;ll tailor the hunt
          to your threat level.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          {[
            { level: "low", label: "😐 A Little" },
            { level: "medium", label: "😟 Too Much" },
            { level: "high", label: "😨 Completely Exposed" },
          ].map(({ level, label }) => (
            <button
              key={level}
              onClick={() => onSelect(level as "low" | "medium" | "high")}
              className={`
                px-5 py-3 rounded-full text-sm sm:text-base font-semibold transition-all duration-200
                border
                ${
                  exposureLevel === level
                    ? "border-[#FFBF00] bg-[#1F3B1D] text-[#FFBF00]"
                    : "border-[#1F3B1D] text-[#E3DAC9] hover:border-[#FFBF00]/60 hover:text-[#FFBF00]"
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="mt-10 text-xs sm:text-sm text-[#E3DAC9]/50 italic">
          “Honesty fuels our hunt. The more exposed you feel, the harder we strike.”
        </p>
      </motion.div>
    </section>
  );
}
