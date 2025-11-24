import React, { useRef, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import HeroSection from "../components/HeroSection";
import ExposureQuestion from "../components/ExposureQuestion";
import TiersSection from "../components/TiersSection";
import SignupForm from "../components/SignupForm";
import TrustSection from "../components/TrustSection";

// Central tier type so everything stays consistent
export type TierId = "adventurer" | "hunter" | "tactician";

export default function HomePage() {
  const exposureRef = useRef<HTMLDivElement | null>(null);
  const tiersRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  const [selectedTier, setSelectedTier] = useState<TierId>("hunter");
  const [billingYearly, setBillingYearly] = useState(false);
  const [exposureLevel, setExposureLevel] = useState<"low" | "medium" | "high" | null>(null);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // When user answers "How exposed do you feel?"
  const handleExposureSelect = (level: "low" | "medium" | "high") => {
    setExposureLevel(level);

    if (level === "low") setSelectedTier("adventurer");
    if (level === "medium") setSelectedTier("hunter");
    if (level === "high") setSelectedTier("tactician");

    scrollTo(tiersRef);
  };

  // When user clicks a tier card
  const handleTierSelect = (tier: TierId) => {
    setSelectedTier(tier);
    scrollTo(formRef);
  };

  return (
    <main className="min-h-screen bg-[#171710] text-[#E3DAC9]">
      {/* Header stays at top; we’ll enhance it to use scroll callbacks */}
      <Header
        // These props will be wired in Header.tsx (optional-safe)
        onClickPlans={() => scrollTo(tiersRef)}
        onClickStart={() => scrollTo(exposureRef)}
      />

      {/* HERO: hook + primary CTAs leading into funnel */}
      <HeroSection
        // We’ll update HeroSection to accept these (optional-safe)
        onStartProtection={() => scrollTo(exposureRef)}
        onSeePlans={() => scrollTo(tiersRef)}
      />

      {/* MICRO-COMMITMENT: "How exposed do you feel?" */}
      <div ref={exposureRef}>
        <ExposureQuestion
          exposureLevel={exposureLevel}
          onSelect={handleExposureSelect}
        />
      </div>

      {/* TIERS: Adventurer / Hunter (recommended) / Tactician */}
      <div ref={tiersRef}>
        <TiersSection
          selectedTier={selectedTier}
          billingYearly={billingYearly}
          onToggleBilling={() => setBillingYearly((v) => !v)}
          onSelectTier={handleTierSelect}
        />
      </div>

      {/* SIGNUP: Inline form tuned to selected tier */}
      <div ref={formRef}>
        <SignupForm
          selectedTier={selectedTier}
          billingYearly={billingYearly}
        />
      </div>

      {/* TRUST: urgency band, testimonials, FAQ */}
      <TrustSection />

      <Footer />
    </main>
  );
}
