"use client";
import { useState, FormEvent } from "react";
import { TierId } from "../pages"; // adjust import if needed

interface SignupFormProps {
  selectedTier: TierId;
  billingYearly: boolean;
}

export default function SignupForm({ selectedTier, billingYearly }: SignupFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tierInfo: Record<
    TierId,
    { name: string; summary: string; monthly: string; yearly: string }
  > = {
    adventurer: {
      name: "Adventurer",
      summary: "Foundational coverage for cautious explorers of the data wilds.",
      monthly: "$15/mo",
      yearly: "$150/yr",
    },
    hunter: {
      name: "Hunter",
      summary: "Balanced, aggressive, and most chosen by the goblin guild.",
      monthly: "$35/mo",
      yearly: "$350/yr",
    },
    tactician: {
      name: "Tactician",
      summary: "Elite, precision defense for strategists and high-risk defenders.",
      monthly: "$75/mo",
      yearly: "$750/yr",
    },
  };

  const tier = tierInfo[selectedTier];
  const displayPrice = billingYearly ? tier.yearly : tier.monthly;

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
      // ⚙️ Placeholder: this is where Stripe or backend API will go.
      // Example: redirect to Stripe Payment Link
      // window.location.href = "https://buy.stripe.com/exampleLink";

      console.log("Submitting:", { name, email, selectedTier, billingYearly });
      alert("Form submitted! (Next step: connect to Stripe or Cloudflare checkout.)");
    } catch (err) {
      console.error(err);
      setError("Our goblins tripped on a wire — try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className="
        relative w-full py-20 px-6 sm:px-10
        bg-[#171710] bg-[url('/guildgrain.png')]
        bg-cover bg-blend-multiply
        border-t border-[#1F3B1D]/60
      "
    >
      <div className="max-w-md mx-auto text-center">
        {/* Title */}
        <h2 className="text-3xl sm:text-4xl font-bold text-[#E3DAC9] mb-3">
          Secure Your Protection
        </h2>
        <p className="text-sm sm:text-base text-[#E3DAC9]/75 mb-8">
          You’ve chosen the <span className="text-[#FFBF00] font-semibold">{tier.name}</span> tier —{" "}
          {tier.summary}
        </p>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#171710]/70 border border-[#1F3B1D] rounded-2xl p-6 text-left space-y-4"
        >
          <div className="text-[10px] sm:text-xs text-[#E3DAC9]/60 mb-2">
            Plan: <span className="text-[#FFBF00]">{tier.name}</span> • {displayPrice} •{" "}
            {billingYearly ? "Annual billing" : "Monthly billing"}
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
          “Your goblins march within the hour. You chose wisely, {tier.name}.”
        </p>
      </div>
    </section>
  );
}
