import React from "react";

export default function Footer() {
  return (
    <footer className="w-full py-10 px-6 text-center text-xs text-ivory/60">
      © {new Date().getFullYear()} NetGoblin LLC. All rights reserved.
    </footer>
  );
}
