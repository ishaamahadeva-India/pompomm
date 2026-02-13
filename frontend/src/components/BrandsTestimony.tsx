"use client";

import { motion } from "framer-motion";

const TESTIMONIALS = [
  {
    quote: "Pom Pomm gave us real reach and verified engagement. Our last campaign saw 3x the engagement we expected from traditional ads.",
    brand: "Lifestyle brand partner",
    metric: "3x engagement",
  },
  {
    quote: "Transparent leaderboards and performance-based payouts mean we only pay for results. Creator quality on Pom Pomm is consistently high.",
    brand: "D2C brand",
    metric: "Performance-based",
  },
  {
    quote: "We scaled our product launch using Pom Pomm’s creator network. Clear analytics and fraud checks gave us confidence in every rupee spent.",
    brand: "Tech startup",
    metric: "Scaled launch",
  },
];

export function BrandsTestimony() {
  return (
    <section className="relative py-16 sm:py-24 overflow-hidden">
      <div className="absolute inset-0 primary-gradient opacity-[0.06] pointer-events-none" />
      <div className="container mx-auto px-4 max-w-5xl relative">
        <motion.h2
          className="text-center text-2xl sm:text-3xl font-bold tracking-tight mb-2"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          Brands growing with Pom Pomm
        </motion.h2>
        <motion.p
          className="text-center text-muted mb-12 max-w-xl mx-auto"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Performance-driven campaigns with verified reach and transparent payouts.
        </motion.p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              className="glass-card p-6 rounded-2xl border border-white/10 flex flex-col"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <p className="text-foreground/95 text-sm leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-medium text-muted uppercase tracking-wider">{t.brand}</span>
                <span className="text-xs text-primary font-medium">{t.metric}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
