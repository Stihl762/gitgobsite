import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="w-full bg-[#171710] border-b border-[#1f3b1d]/60 py-4 px-6 flex items-center justify-between">
      {/* Logo + Brand */}
      <Link href="/" className="flex items-center space-x-3">
        <Image
          src="/favicon.ico"
          alt="NetGoblin Eye"
          width={28}
          height={28}
          className="rounded-sm"
        />
        <span className="text-[#FFBF00] font-bold text-xl tracking-wide">
          NetGoblin
        </span>
      </Link>

      {/* Desktop Nav */}
      <nav className="hidden md:flex space-x-8 text-[#FFFFF0] text-sm font-medium">
        <Link href="/about" className="hover:text-[#FFBF00] transition">About</Link>
        <Link href="/services" className="hover:text-[#FFBF00] transition">Services</Link>
        <Link href="/contact" className="hover:text-[#FFBF00] transition">Contact</Link>
      </nav>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="md:hidden text-[#FFBF00] focus:outline-none"
      >
        {menuOpen ? "✕" : "☰"}
      </button>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="absolute top-16 right-6 bg-[#171710] border border-[#1f3b1d] rounded-lg shadow-lg p-4 flex flex-col space-y-3 md:hidden">
          <Link href="/about" className="hover:text-[#FFBF00] transition">About</Link>
          <Link href="/services" className="hover:text-[#FFBF00] transition">Services</Link>
          <Link href="/contact" className="hover:text-[#FFBF00] transition">Contact</Link>
        </div>
      )}
    </header>
  );
}
