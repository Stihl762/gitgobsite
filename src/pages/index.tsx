import React, { useRef } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import HeroSection from "../components/HeroSection";
import SignupForm from "../components/SignupForm";
import TiersSection from "../components/TiersSection"; // now used only for blurred display
import TrustSection from "../components/TrustSection";

export default function HomePage() {
  const formRef = useRef<HTMLDivElement | null>(null);

  // Smooth scroll to signup form
  const scrollToSignup = () => {
    if (!formRef.current) return;
    formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="min-h-screen bg-[#171710] text-[#E3DAC9]">

      {/* HEADER */}
      <Header
        onClickPlans={scrollToSignup}
        onClickStart={scrollToSignup}
      />

      {/* HERO — updated to jump straight into First Flame */}
      <HeroSection
        onStartProtection={scrollToSignup}
        onSeePlans={scrollToSignup}
      />

      {/* BLURRED TIERS (coming soon) */}
      <section className="relative mt-20 mb-10 px-6" id="tiers">
        <div className="opacity-20 blur-sm pointer-events-none select-none">
          <TiersSection
            selectedTier="hunter"
            billingYearly={false}
            onToggleBilling={() => {}}
            onSelectTier={() => {}}
          />
        </div>

        {/* Coming Soon Overlay */}
        <div className="
          absolute inset-0 flex flex-col items-center justify-center 
          text-center space-y-4
        ">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#FFBF00] drop-shadow-[0_0_10px_rgba(255,191,0,0.4)]">
            Adventurer • Hunter • Tactician
          </h2>

          <p className="text-sm sm:text-base text-[#E3DAC9]/80 max-w-md">
            The full Goblin tiers unlock soon.  
            For now, only the chosen may enter the fire.
          </p>

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

      {/* SIGNUP FORM (First Flame Only) */}
      <div ref={formRef}>
        <SignupForm />
      </div>

      {/* TRUST / SOCIAL PROOF */}
      <TrustSection />

      <Footer />
    </main>
  );
}
