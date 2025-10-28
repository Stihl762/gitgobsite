import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function AboutPage() {
  return (
    <main>
      <Header />
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <h1 className="text-3xl font-semibold text-header mb-4">About NetGoblin</h1>
        <p className="text-ivory/90">
          [PLACEHOLDER: Story about the quiet hunter protecting families and individuals.
          Replace with the real brand narrative later.]
        </p>
      </section>
      <Footer />
    </main>
  );
}
