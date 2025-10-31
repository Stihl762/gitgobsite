import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-[#171710] border-t border-[#1f3b1d]/60 py-10 px-6 text-center">
      <div className="text-[#E3DAC9]/70 text-sm mb-2">
        © {new Date().getFullYear()} NetGoblin LLC — Personal Data Defense
      </div>

      <div className="text-[#E3DAC9]/40 text-xs italic mb-4">
        Quiet. Focused. Relentless.
      </div>

      <div className="flex justify-center space-x-6 text-xs font-medium">
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

      <div className="text-[#E3DAC9]/30 text-[10px] mt-6">
        They follow your trail. We erase it.
      </div>
    </footer>
  );
}
