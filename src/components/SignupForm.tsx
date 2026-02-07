"use client";
import { useState, FormEvent } from "react";

type PlanKey = "firstflame_individual" | "firstflame_pair";

const PLANS: Record<
  PlanKey,
  {
    name: string;
    priceLabel: string;
    priceCents: number; // UI only; server remains source of truth
    seats: number;
    subtitle: string;
  }
> = {
  firstflame_individual: {
    name: "First Flame: Individual",
    priceLabel: "$49/mo",
    priceCents: 4900,
    seats: 1,
    subtitle: "For one person",
  },
  firstflame_pair: {
    name: "First Flame: Household Pair",
    priceLabel: "$79/mo",
    priceCents: 7900,
    seats: 2,
    subtitle: "For two people (same household)",
  },
};

export default function SignupForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planKey, setPlanKey] = useState<PlanKey>("firstflame_pair");

  const plan = PLANS[planKey];

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name")?.toString().trim();
    const email = formData.get("email")?.toString().trim();

    if (!name || !email) {
      setError("Please enter both your name and email so our goblins can find you.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, planKey }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setError("Our goblins tripped on a wire — try again.");
    } catch (err) {
      console.error(err);
      setError("Something went wrong — try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className="
        relative w-full py-20 px-6 sm:px-10
        bg-[#171710] bg-[url('/guildgrain.png')] bg-cover bg-blend-multiply
        border-t border-[#1F3B1D]/60
      "
      id="firstflame-signup"
    >
      <div className="max-w-md mx-auto text-center">
        {/* Title */}
        <h2 className="text-3xl sm:text-4xl font-bold text-[#E3DAC9] mb-3">
          Join the First Flame
        </h2>

        <p className="text-sm sm:text-base text-[#E3DAC9]/75 mb-8">
          Early access protection for the first 100 who enter the fire.
          The march begins immediately.
        </p>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#171710]/70 border border-[#1F3B1D] rounded-2xl p-6 text-left space-y-4"
        >
          {/* Plan chooser */}
          <div className="space-y-2">
            <div className="text-[10px] sm:text-xs text-[#E3DAC9]/60">
              Choose your plan (monthly auto-renew)
            </div>

            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(PLANS) as PlanKey[]).map((key) => {
                const p = PLANS[key];
                const active = key === planKey;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPlanKey(key)}
                    className={[
                      "w-full text-left rounded-xl px-4 py-3 border transition-all duration-200",
                      active
                        ? "border-[#FFBF00] bg-[#0f120d]/70 shadow-[0_0_12px_rgba(255,191,0,0.18)]"
                        : "border-[#1F3B1D] bg-[#0f120d]/40 hover:border-[#E3DAC9]/40",
                    ].join(" ")}
                    aria-pressed={active}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm sm:text-base font-semibold text-[#E3DAC9]">
                          {p.name}
                        </div>
                        <div className="text-[11px] sm:text-xs text-[#E3DAC9]/65">
                          {p.subtitle} • Covers {p.seats}
                        </div>
                      </div>

                      <div className="text-sm sm:text-base font-bold text-[#FFBF00] whitespace-nowrap">
                        {p.priceLabel}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected plan summary line */}
            <div className="text-[10px] sm:text-xs text-[#E3DAC9]/60 pt-1">
              Selected: <span className="text-[#FFBF00]">{plan.name}</span> •{" "}
              {plan.priceLabel} • Monthly auto-renew
            </div>
          </div>

          <input
            type="text"
            name="name"
            placeholder="Full name"
            className="
              w-full px-3 py-2 rounded-lg bg-[#0f120d]
              border border-[#1F3B1D] text-xs sm:text-sm text-[#E3DAC9]
              focus:outline-none focus:border-[#FFBF00]
            "
          />

          <input
            type="email"
            name="email"
            placeholder="Email for your vault & updates"
            className="
              w-full px-3 py-2 rounded-lg bg-[#0f120d]
              border border-[#1F3B1D] text-xs sm:text-sm text-[#E3DAC9]
              focus:outline-none focus:border-[#FFBF00]
            "
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="
              w-full mt-2 py-2.5 rounded-full
              bg-[#FFBF00] text-[#171710] text-sm sm:text-base font-semibold
              hover:bg-[#E3DAC9] disabled:opacity-60 disabled:cursor-not-allowed
              transition-all duration-200 shadow-[0_0_12px_rgba(255,191,0,0.25)]
            "
          >
            {isSubmitting ? "Summoning Goblins..." : "Continue to Secure Checkout"}
          </button>

          {error && (
            <p className="text-xs sm:text-sm text-red-400 mt-2">{error}</p>
          )}

          {/* Trust badges */}
          <div className="mt-5 flex flex-wrap justify-center gap-4 text-[10px] sm:text-xs text-[#E3DAC9]/60">
            <span>🔒 Encrypted & Secure</span>
            <span>🏠 California LLC</span>
            <span>🕵️ Zero Data Sold</span>
            <span>⚡ Cloudflare Protected</span>
          </div>
        </form>

        {/* Emotional reassurance */}
        <p className="mt-8 text-xs sm:text-sm text-[#E3DAC9]/60 italic">
          “The fire accepts you. The march begins soon.”
        </p>
      </div>
    </section>
  );
}
