import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="
      w-full 
      bg-[#685D51]
      bg-[url('/guildgrain.png')]
      bg-cover bg-blend-multiply
      border-t border-[#1f3b1d]/60 
      py-10 px-6 text-center relative
    ">
      {/* subtle highlight at top of footer */}
      <div className="
        absolute inset-x-0 top-0 h-1 
        bg-gradient-to-b from-[#8a7d6c]/35 to-transparent
      "></div>

      <div className="text-[#E3DAC9]/70 text-sm mb-2">
        © {new Date().getFullYear()} NetGoblin LLC — Personal Data Defense
      </div>

      <div className="text-[#E3DAC9]/40 text-xs italic mb-4">
        Quiet. Focused. Relentless.
      </div>

      <div className="flex justify-center space-x-6 text-xs font-medium mb-4">
        <Link 
          href="/privacy" 
          className="text-[#E3DAC9]/60 hover:text-[#FFBF00] transition"
        >
          Privacy Policy
        </Link>

        <Link 
          href="/terms" 
          className="text-[#E3DAC9]/60 hover:text-[#FFBF00] transition"
        >
          Terms of Service
        </Link>
      </div>

      <div className="text-[#E3DAC9]/40 text-[11px] tracking-wide italic">
        They follow your trail. We erase it.
      </div>
    </footer>
  );
}
