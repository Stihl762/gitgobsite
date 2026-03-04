import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function AboutPage() {
  return (
    <main>
      <Header />

      <section className="px-6 py-16 max-w-3xl mx-auto">
        <h1 className="text-3xl font-semibold text-header mb-6">About NetGoblin</h1>

        <div className="space-y-6 text-ivory/90 leading-relaxed">
          <p>The first warning came as noise.</p>

          <p>
            Relentless calls. Sold numbers. Names passed between unseen hands like coin in a back alley market.
            Families reduced to listings. Profiles. Inventory.
          </p>

          <p>That was the moment the Goblin chose to act.</p>

          <p>
            He studied the tunnels beneath the surface — broker registries, removal statutes, the fine print most never
            read. What he discovered was simple: everyday families had rights, but no guide to wield them. So he began
            the work. Names were reclaimed. Records were stripped. The calls thinned.
          </p>

          <p>This was not his first campaign.</p>

          <p>
            Before the shadows, he had fought in open battle — serving in uniform, standing in fire and smoke, pulling
            the wounded back from the brink, teaching the next generation how to answer chaos with discipline. Years of
            physical service carved their mark.
          </p>

          <p>NetGoblin is the next form of that service.</p>

          <div className="pl-4 border-l border-ivory/20 space-y-1">
            <p>A fortress raised in the dark.</p>
            <p>A guild bound by loyalty.</p>
            <p>A growing network of reclaimed names, no longer currency.</p>
          </div>

          <p>
            When you join, you do not purchase a tool. You step behind walls.
          </p>

          <p>
            From within the shadows, the Goblin Commander and his underground family work quietly — dismantling exposure,
            reclaiming control, and reminding the merchants of stolen names that some fortresses are no longer open for
            trade.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
