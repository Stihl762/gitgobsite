import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function ContactPage() {
  return (
    <main>
      <Header />
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <h1 className="text-3xl font-semibold text-header mb-4">Contact</h1>
        <p className="text-ivory/90">Email us at <a href="mailto:support@netgoblin.org" className="underline">support@netgoblin.org</a></p>
      </section>
      <Footer />
    </main>
  );
}
