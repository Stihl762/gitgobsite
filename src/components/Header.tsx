import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="
      w-full 
      bg-[#685D51]
      bg-[url('/guildgrain.png')]
      bg-cover bg-blend-multiply
      border-b border-[#1f3b1d]/60 
      py-4 px-6 
      flex items-center justify-between
      relative
    ">
      {/* Subtle highlight from above */}
      <div className="
        absolute inset-x-0 top-0 h-1 
        bg-gradient-to-b from-[#8a7d6c]/40 to-transparent
        pointer-events-none
      "></div>

      {/* Logo + Brand */}
      <Link href="/" className="flex items-center space-x-3 relative z-10">
        <Image
          src="/favicon.ico"
          alt="NetGoblin Eye"
          width={28}
          height={28}
          className="rounded-sm"
        />
        <span className="text-[#FFBF00] font-bold text-xl tracking-wide drop-shadow-[0_0_4px_rgba(255,191,0,0.35)]">
          NetGoblin
        </span>
      </Link>

      {/* Desktop Nav */}
      <nav className="hidden md:flex space-x-8 text-[#E3DAC9] text-sm font-medium relative z-10">
        <Link href="/about" className="hover:text-[#FFBF00] transition">About</Link>
        <Link href="/services" className="hover:text-[#FFBF00] transition">Services</Link>
        <Link href="/contact" className="hover:text-[#FFBF00] transition">Contact</Link>
      </nav>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="md:hidden text-[#FFBF00] focus:outline-none relative z-10"
      >
        {menuOpen ? "✕" : "☰"}
      </button>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="
          absolute top-16 right-6 
          bg-[#685D51] 
          bg-[url('/guildgrain.png')]
          bg-cover bg-blend-multiply
          border border-[#1f3b1d] 
          rounded-lg shadow-xl 
          p-4 flex flex-col space-y-3 md:hidden
        ">
          <Link href="/about" className="text-[#E3DAC9] hover:text-[#FFBF00] transition">About</Link>
          <Link href="/services" className="text-[#E3DAC9] hover:text-[#FFBF00] transition">Services</Link>
          <Link href="/contact" className="text-[#E3DAC9] hover:text-[#FFBF00] transition">Contact</Link>
        </div>
      )}
    </header>
  );
}
