"use client";

import { motion } from "framer-motion";

const testimonials = [
  {
    quote: "Pom Pomm transformed our brand partnerships with real performance metrics.",
    author: "— Growth Lead, D2C Brand",
  },
  {
    quote: "Finally a platform that rewards creators based on measurable impact.",
    author: "— Top YouTube Creator",
  },
];

export default function Testimonials() {
  return (
    <section className="bg-background py-28 px-6 text-foreground overflow-hidden">
      <div className="max-w-5xl mx-auto text-center">
        <motion.h2
          className="text-4xl font-semibold mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          Trusted by Top Creators
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-8">
          {testimonials.map((item, i) => (
            <motion.div
              key={i}
              className="p-8 bg-white/5 rounded-2xl border border-white/10"
              initial={{ opacity: 0, x: i === 0 ? -40 : 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              whileHover={{ scale: 1.02, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.07)" }}
            >
              <motion.p
                className="text-foreground/90"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 + 0.25 }}
              >
                &ldquo;{item.quote}&rdquo;
              </motion.p>
              <motion.div
                className="mt-6 text-sm text-muted-foreground"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 + 0.35 }}
              >
                {item.author}
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
