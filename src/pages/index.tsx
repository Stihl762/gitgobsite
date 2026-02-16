import React, { useRef } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import HeroSection from "../components/HeroSection";
import SignupForm from "../components/SignupForm";
import TiersSection from "../components/TiersSection"; // blurred display
import TrustSection from "../components/TrustSection";

export default function HomePage() {
  const plansRef = useRef<HTMLElement | null>(null);
  const signupRef = useRef<HTMLDivElement | null>(null);

  // PATCH NOTES (sparknotes)
  // - Split scroll targets:
  //   - Plans / See Plans -> tiers section
  //   - Start Protection / Join the First Flame -> signup form
  // - Added stable anchors for cross-page navigation:
  //   - "/#tiers" (already present)
  //   - "/#start" (added to signup wrapper)

  // Smooth scroll helpers
  const scrollToPlans = () => {
    if (!plansRef.current) return;
    plansRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToSignup = () => {
    if (!signupRef.current) return;
    signupRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="min-h-screen bg-[#171710] text-[#E3DAC9]">
      {/* HEADER
          - Plans button -> tiers section (smooth scroll)
          - Start Protection -> signup form (smooth scroll)
      */}
      <Header onClickPlans={scrollToPlans} onClickStart={scrollToSignup} />

      {/* HERO
          - See Plans -> tiers section (smooth scroll)
          - Start Protection -> signup form (smooth scroll)
      */}
      <HeroSection onStartProtection={scrollToSignup} onSeePlans={scrollToPlans} />

      {/* BLURRED TIERS (coming soon)
          Anchor: "/#tiers"
      */}
      <section
        ref={(el) => {
          plansRef.current = el;
        }}
        className="relative mt-20 mb-10 px-6"
        id="tiers"
      >
        <div className="opacity-20 blur-sm pointer-events-none select-none">
          <TiersSection
            selectedTier="hunter"
            billingYearly={false}
            onToggleBilling={() => {}}
            onSelectTier={() => {}}
          />
        </div>

        {/* Coming Soon Overlay */}
        <div
          className="
            absolute inset-0 flex flex-col items-center justify-center 
            text-center space-y-4
          "
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-[#FFBF00] drop-shadow-[0_0_10px_rgba(255,191,0,0.4)]">
            Adventurer • Hunter • Tactician
          </h2>

          <p className="text-sm sm:text-base text-[#E3DAC9]/80 max-w-md">
            The full Goblin tiers unlock soon.
            <br />
            For now, only the chosen may enter the fire.
          </p>

          {/* Join the First Flame -> signup form (smooth scroll) */}
          <button
            className="
              mt-4 px-6 py-3 rounded-full bg-[#FFBF00] text-[#171710] font-semibold
              hover:bg-[#E3DAC9] transition-all duration-200 shadow-[0_0_12px_rgba(255,191,0,0.25)]
            "
            onClick={scrollToSignup}
          >
            Join the First Flame
          </button>
        </div>
      </section>

      {/* SIGNUP FORM (First Flame Only)
          Anchor: "/#start"
          - This lets /privacy and /terms header buttons jump here.
      */}
      <div ref={signupRef} id="start">
        <SignupForm />
      </div>

      {/* TRUST / SOCIAL PROOF */}
      <TrustSection />

      <Footer />
    </main>
  );
}
