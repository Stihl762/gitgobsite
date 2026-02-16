"use client";
import Link from "next/link";

export default function Footer() {
  return (
    <footer
      className="
        w-full 
        bg-[#685D51]
        bg-[url('/guildgrain.png')]
        bg-cover bg-blend-multiply
        border-t border-[#1F3B1D]/60 
        py-10 px-6 text-center relative
        text-[#E3DAC9]/80
      "
    >
      {/* PATCH NOTES (sparknotes)
         - Fixed Start Protection link
         - Was: /#signup (no longer exists)
         - Now: /#start (matches index.tsx anchor)
      */}

      {/* Subtle highlight gradient */}
      <div
        className="
          absolute inset-x-0 top-0 h-1 
          bg-gradient-to-b from-[#8a7d6c]/40 to-transparent
        "
      />

      {/* Primary CTA for late scrollers */}
      <div className="mb-8">
        <Link
          href="/#start"
          className="
            inline-block px-6 py-2.5 rounded-full
            bg-[#FFBF00] text-[#171710] text-sm font-semibold
            hover:bg-[#E3DAC9] transition-colors shadow-[0_0_10px_rgba(255,191,0,0.25)]
          "
        >
          Start Protection
        </Link>
      </div>

      {/* Core identity */}
      <div className="text-sm mb-1 font-medium tracking-wide text-[#E3DAC9]">
        © {new Date().getFullYear()} NetGoblin LLC — Personal Data Defense
      </div>
      <div className="text-xs italic text-[#E3DAC9]/60 mb-4">
        Quiet. Focused. Relentless.
      </div>

      {/* Links */}
      <div className="flex justify-center space-x-6 text-xs font-medium mb-4">
        <Link
          href="/privacy"
          className="text-[#E3DAC9]/60 hover:text-[#FFBF00] transition"
        >
          Privacy
        </Link>
        <Link
          href="/terms"
          className="text-[#E3DAC9]/60 hover:text-[#FFBF00] transition"
        >
          Terms
        </Link>
        <Link
          href="/contact"
          className="text-[#E3DAC9]/60 hover:text-[#FFBF00] transition"
        >
          Contact
        </Link>
      </div>

      {/* Legal / Trust line */}
      <div className="text-[11px] text-[#E3DAC9]/45 tracking-wide italic mb-1">
        California-based. Encrypted. Cloudflare-secured.
      </div>

      {/* Tagline */}
      <div className="text-[#E3DAC9]/40 text-[11px] tracking-wide italic">
        They follow your trail. We erase it.
      </div>
    </footer>
  );
}
