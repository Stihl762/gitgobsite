"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

interface HeaderProps {
  onClickPlans?: () => void;
  onClickStart?: () => void;
}

export default function Header({ onClickPlans, onClickStart }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="
        w-full 
        bg-[#685D51]
        bg-[url('/guildgrain.png')]
        bg-cover bg-blend-multiply
        border-b border-[#1f3b1d]/60 
        py-4 px-6 
        flex items-center justify-between
        relative
        z-50
        sticky top-0 backdrop-blur-md
      "
    >
      {/* Highlight trim */}
      <div
        className="
          absolute inset-x-0 top-0 h-1 
          bg-gradient-to-b from-[#8a7d6c]/40 to-transparent
          pointer-events-none
        "
      ></div>

      {/* Brand */}
      <Link href="/" className="flex items-center space-x-3 relative z-10 select-none">
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

      {/* Desktop Navigation */}
      <nav className="hidden md:flex space-x-8 text-[#E3DAC9] text-sm font-medium relative z-10">
        <button
          onClick={onClickPlans}
          className="hover:text-[#FFBF00] transition-colors"
        >
          Plans
        </button>
        <button
          onClick={onClickStart}
          className="hover:text-[#FFBF00] transition-colors"
        >
          Start Protection
        </button>
        <Link href="/about" className="hover:text-[#FFBF00] transition">
          About
        </Link>
        <Link href="/contact" className="hover:text-[#FFBF00] transition">
          Contact
        </Link>
      </nav>

      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="md:hidden text-[#FFBF00] focus:outline-none relative z-10 text-2xl"
        aria-label="Toggle menu"
      >
        {menuOpen ? "✕" : "☰"}
      </button>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          className="
            absolute top-16 right-6 
            bg-[#685D51] 
            bg-[url('/guildgrain.png')]
            bg-cover bg-blend-multiply
            border border-[#1f3b1d] 
            rounded-lg shadow-xl 
            p-4 flex flex-col space-y-3 md:hidden
            animate-fadeIn
          "
        >
          <button
            onClick={() => {
              setMenuOpen(false);
              onClickPlans?.();
            }}
            className="text-[#E3DAC9] hover:text-[#FFBF00] transition"
          >
            Plans
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              onClickStart?.();
            }}
            className="text-[#E3DAC9] hover:text-[#FFBF00] transition"
          >
            Start Protection
          </button>
          <Link
            href="/about"
            onClick={() => setMenuOpen(false)}
            className="text-[#E3DAC9] hover:text-[#FFBF00] transition"
          >
            About
          </Link>
          <Link
            href="/contact"
            onClick={() => setMenuOpen(false)}
            className="text-[#E3DAC9] hover:text-[#FFBF00] transition"
          >
            Contact
          </Link>
        </div>
      )}
    </header>
  );
}
