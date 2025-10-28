import React from "react";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="px-6 py-20 text-center">
      <h1 className="text-4xl md:text-5xl font-bold text-amber-400 mb-4">
        [HEADLINE PLACEHOLDER: “We hunt what hides in your data.”]
      </h1>
      <p className="text-lg max-w-2xl mx-auto text-ivory/90">
        [BODY TEXT PLACEHOLDER: A short, confident paragraph introducing NetGoblin’s
        personal, local data protection. This will be replaced by Will & Nova.]
      </p>
      <div className="mt-8">
        <Link
          href="/contact"
          className="inline-block rounded-md border border-amber px-6 py-3 text-sm font-medium text-ivory hover:bg-amber/10"
        >
          Begin Protection
        </Link>
      </div>
    </section>
  );
}
