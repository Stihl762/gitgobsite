"use client";
import { motion } from "framer-motion";

export default function TrustSection() {
  const testimonials = [
    {
      quote:
        "I found over 30 brokers selling my info. Watching them vanish from search results was unreal.",
      author: "— A. Reyes, Beta Tester",
    },
    {
      quote:
        "They actually talk to you like a human, not a robot. I feel protected and in control again.",
      author: "— M. Han, Early Access Member",
    },
    {
      quote:
        "I signed up from my phone in under a minute. Smooth, simple, powerful. Worth every cent.",
      author: "— K. Patel, Hunter Tier",
    },
  ];

  const faqs = [
    {
      q: "What happens after signup?",
      a: "You’ll receive a secure intake link within minutes via email. After submitting your intake, our goblins immediately begin broker removal requests on your behalf.",
    },
    {
      q: "How does removal work?",
      a: "We confront data brokers directly with verified opt-outs and legal demands, tracking each one as we work constantly to protect and remove your personal data from brokers.",
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. No tricks or contracts. You stay as long as you need our protection, then your goblins stand down. Reach out to our support email will questions or requests.",
    },
  ];

  return (
    <section
      className="
        relative w-full py-20 px-6 sm:px-10
        bg-[#171710] bg-[url('/guildgrain.png')]
        bg-cover bg-blend-multiply
        border-t border-[#1F3B1D]/60
      "
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        viewport={{ once: true }}
        className="max-w-5xl mx-auto text-center"
      >
        <div className="inline-block mb-8 px-5 py-2 rounded-full bg-[#1F3B1D]/80 border border-[#FFBF00]/50 text-sm sm:text-base text-[#FFBF00] shadow-[0_0_15px_rgba(255,191,0,0.2)]">
          ⚠️ Limited Beta Pricing — Lock your rate before full launch.
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-12">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.03 }}
              className="
                bg-[#171710]/60 border border-[#1F3B1D]
                rounded-2xl p-5 text-left text-[#E3DAC9]/80
                transition-all duration-300 hover:border-[#FFBF00]/40
                shadow-[0_0_8px_rgba(0,0,0,0.25)]
              "
            >
              <p className="text-sm leading-relaxed">“{t.quote}”</p>
              <p className="mt-3 text-xs text-[#E3DAC9]/50">{t.author}</p>
            </motion.div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto text-left">
          <h3 className="text-xl sm:text-2xl font-semibold text-[#E3DAC9] mb-6 text-center">
            Common Questions
          </h3>

          {faqs.map((f, i) => (
            <details
              key={i}
              className="
                mb-4 rounded-xl bg-[#1F3B1D]/40 border border-[#1F3B1D] 
                hover:border-[#FFBF00]/40 transition-all
                text-[#E3DAC9]/80
              "
            >
              <summary className="cursor-pointer py-3 px-5 text-sm sm:text-base font-semibold text-[#FFBF00]">
                {f.q}
              </summary>
              <p className="py-3 px-5 text-xs sm:text-sm leading-relaxed text-[#E3DAC9]/70 border-t border-[#1F3B1D]">
                {f.a}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-16 max-w-2xl mx-auto text-[#E3DAC9]/60 text-sm sm:text-base italic">
          “The shadows are watching, but so are we. Join the guild that guards your
          name and sleeps with one eye open.”
        </div>
      </motion.div>
    </section>
  );
}
