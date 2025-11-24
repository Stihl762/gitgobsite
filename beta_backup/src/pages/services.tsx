import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function ServicesPage() {
  return (
    <main>
      <Header />
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <h1 className="text-3xl font-semibold text-header mb-4">Services</h1>
        <ul className="list-disc pl-6 text-ivory/90 space-y-2">
          <li>[PLACEHOLDER] Copper</li>
          <li>[PLACEHOLDER] Silver</li>
          <li>[PLACEHOLDER] Gold</li>
          <li>[PLACEHOLDER] Secret Beta Tier</li>
        </ul>
      </section>
      <Footer />
    </main>
  );
}
