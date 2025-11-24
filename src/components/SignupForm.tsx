"use client";
import { useState, FormEvent } from "react";

export default function SignupForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const PLAN_NAME = "First Flame";
  const PLAN_PRICE = "$55/mo";

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
        body: JSON.stringify({ name, email }),
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
          <div className="text-[10px] sm:text-xs text-[#E3DAC9]/60 mb-2">
            Plan: <span className="text-[#FFBF00]">{PLAN_NAME}</span> • {PLAN_PRICE} • Monthly auto-renew
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
