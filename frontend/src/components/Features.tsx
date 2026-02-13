"use client";

import { motion } from "framer-motion";

const items = [
  {
    title: "Measurable ROI",
    desc: "Track conversions, revenue and campaign performance in real time.",
  },
  {
    title: "Creator Infrastructure",
    desc: "Tools designed for scalable creator partnerships.",
  },
  {
    title: "Automated Payouts",
    desc: "Smart contract-based transparent performance payouts.",
  },
];

export default function Features() {
  return (
    <section id="features" className="bg-[#0B0B0C] py-32 px-6 text-white">
      <div className="max-w-6xl mx-auto text-center">
        <motion.h2
          className="text-4xl font-semibold mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          Built for Performance
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-8">
          {items.map((item, i) => (
            <motion.div
              key={i}
              className="p-8 bg-white/5 border border-white/10 rounded-2xl"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              whileHover={{ y: -6, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.08)" }}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 + 0.2, type: "spring", stiffness: 200 }}
                className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-6 mx-auto"
              >
                <span className="text-amber-400 font-bold text-lg">{i + 1}</span>
              </motion.div>
              <h3 className="text-xl font-medium mb-4">{item.title}</h3>
              <p className="text-stone-400 text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
