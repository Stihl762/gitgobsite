"use client";
import { motion } from "framer-motion";
import { TierId } from "../pages"; // if you use /app router, update import path accordingly

interface TiersSectionProps {
  selectedTier: TierId;
  billingYearly: boolean;
  onToggleBilling: () => void;
  onSelectTier: (tier: TierId) => void;
}

export default function TiersSection({
  selectedTier,
  billingYearly,
  onToggleBilling,
  onSelectTier,
}: TiersSectionProps) {
  const tiers = [
    {
      id: "adventurer",
      name: "Adventurer",
      title: "For those taking their first stand.",
      monthly: "$15/mo",
      yearly: "$150/yr",
      bullets: [
        "Essential data broker removals",
        "Quarterly rescans",
        "Basic goblin support",
      ],
      aura: "bg-[#171710]",
      border: "border-[#1F3B1D]",
    },
    {
      id: "hunter",
      name: "Hunter",
      title: "The balanced defense most heroes choose.",
      monthly: "$35/mo",
      yearly: "$350/yr",
      bullets: [
        "Expanded data broker coverage",
        "Bi-monthly rescans",
        "Exposure alerts & priority support",
        "Personal goblin liaison",
      ],
      recommended: true,
      aura: "bg-[#1F3B1D]/60",
      border: "border-[#FFBF00]",
    },
    {
      id: "tactician",
      name: "Tactician",
      title: "For masters of concealment and control.",
      monthly: "$75/mo",
      yearly: "$750/yr",
      bullets: [
        "Maximum broker & OSINT coverage",
        "Monthly doxxing defense",
        "Direct contact with goblin command",
      ],
      aura: "bg-[#171710]",
      border: "border-[#1F3B1D]",
    },
  ];

  const getPrice = (t: any) => (billingYearly ? t.yearly : t.monthly);

  return (
    <section
      className="
        relative w-full py-20 px-6 sm:px-10 
        bg-[#171710] bg-[url('/guildgrain.png')]
        bg-cover bg-blend-multiply
        border-t border-[#1F3B1D]/60
        text-center
      "
    >
      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        viewport={{ once: true }}
        className="relative z-10 max-w-4xl mx-auto"
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-[#E3DAC9] mb-4">
          Choose Your Hunt
        </h2>
        <p className="text-sm sm:text-base text-[#E3DAC9]/75 mb-8 max-w-xl mx-auto">
          Every hunter’s journey begins somewhere. Choose your level of defense and
          join the goblin ranks protecting their names from the brokers’ fire.
        </p>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 text-xs sm:text-sm mb-10">
          <span
            className={`${
              !billingYearly ? "text-[#FFBF00]" : "text-[#E3DAC9]/60"
            }`}
          >
            Monthly
          </span>
          <button
            onClick={onToggleBilling}
            className="w-12 h-6 bg-[#1F3B1D] rounded-full flex items-center px-1"
          >
            <div
              className={`w-4 h-4 rounded-full bg-[#FFBF00] transition-transform ${
                billingYearly ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
          <span
            className={`${
              billingYearly ? "text-[#FFBF00]" : "text-[#E3DAC9]/60"
            }`}
          >
            Annual (save)
          </span>
        </div>
      </motion.div>

      {/* Tier Cards */}
      <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
        {tiers.map((tier) => {
          const isSelected = tier.id === selectedTier;
          const isHunter = tier.id === "hunter";
          return (
            <motion.div
              key={tier.id}
              whileHover={{ scale: 1.03 }}
              className={`
                relative rounded-2xl border p-6 flex flex-col items-center text-left
                cursor-pointer transition-all duration-300
                ${tier.aura} ${tier.border}
                ${
                  isSelected
                    ? "ring-2 ring-[#FFBF00]/80 shadow-[0_0_25px_rgba(255,191,0,0.25)]"
                    : "hover:ring-1 hover:ring-[#FFBF00]/40"
                }
                ${isHunter ? "md:scale-105" : ""}
              `}
              onClick={() => onSelectTier(tier.id as TierId)}
            >
              {/* Badge for recommended */}
              {tier.recommended && (
                <div className="absolute -top-3 left-5 px-2 py-0.5 rounded-full bg-[#FFBF00] text-[#171710] text-[10px] font-semibold">
                  🏹 Most Chosen
                </div>
              )}

              {/* Header */}
              <h3 className="text-xl font-bold text-[#E3DAC9] mb-2">
                {tier.name}
              </h3>
              <p className="text-sm text-[#E3DAC9]/75 mb-3 italic">
                {tier.title}
              </p>

              {/* Feature bullets */}
              <ul className="text-xs sm:text-sm text-[#E3DAC9]/75 space-y-1 mb-4">
                {tier.bullets.map((b: string) => (
                  <li key={b}>• {b}</li>
                ))}
              </ul>

              {/* Price */}
              <div className="text-lg sm:text-xl font-semibold text-[#FFBF00] mb-5">
                {getPrice(tier)}
              </div>

              {/* CTA */}
              <button
                className={`
                  w-full py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all
                  ${
                    isSelected
                      ? "bg-[#FFBF00] text-[#171710]"
                      : "border border-[#FFBF00]/40 text-[#FFBF00] hover:bg-[#1F3B1D]"
                  }
                `}
              >
                Protect Me
              </button>

              {/* Hunter glow effect */}
              {isHunter && (
                <div className="absolute inset-0 rounded-2xl pointer-events-none bg-gradient-to-b from-[#FFBF00]/10 to-transparent" />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Subtle reassurance below tiers */}
      <div className="mt-12 text-xs sm:text-sm text-[#E3DAC9]/60 max-w-md mx-auto leading-relaxed">
        🧩 Most goblins begin their journey as Hunters — balanced, powerful, and
        protected. Your path can always ascend when the next threat rises.
      </div>
    </section>
  );
}
