import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full py-6 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Image
          src="/assets/netgoblin-logo.png"
          alt="NetGoblin"
          width={120}
          height={40}
          className="h-10 w-auto"
          priority
        />
        <span className="text-xl font-semibold text-amber-400">NetGoblin</span>
      </div>

      <nav className="text-sm text-ivory/80 space-x-6">
        <Link href="/about">About</Link>
        <Link href="/services">Services</Link>
        <Link href="/contact">Contact</Link>
      </nav>
    </header>
  );
}
