import React from "react";

export default function Header() {
  return (
    <header className="w-full py-6 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src="/assets/netgoblin-logo.png" alt="NetGoblin" className="h-10 w-auto" />
        <span className="text-xl font-semibold text-amber-400">NetGoblin</span>
      </div>
      <nav className="text-sm text-ivory/80 space-x-6">
        <a href="/about">About</a>
        <a href="/services">Services</a>
        <a href="/contact">Contact</a>
      </nav>
    </header>
  );
}
