"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { BrandsTestimony } from "@/components/BrandsTestimony";

export default function PremiumHero() {
  return (
    <>
    <section className="relative min-h-screen flex items-center justify-center bg-[#0a0a0a] overflow-hidden px-6">
      {/* Soft Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0d0d0d] to-black" />

      {/* Subtle Glow Orb */}
      <motion.div
        className="absolute w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      />

      {/* Content */}
      <div className="relative max-w-5xl text-center">
        {/* Headline */}
        <motion.h1
          className="text-white text-4xl sm:text-6xl md:text-7xl font-semibold leading-tight tracking-tight"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 0.61, 0.36, 1] }}
        >
          Performance-Driven
          <br />
          Creator Growth
        </motion.h1>

        {/* Subheading */}
        <motion.p
          className="mt-6 text-stone-400 text-lg sm:text-xl max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          Pom Pomm connects brands and creators through measurable,
          performance-based marketing systems.
        </motion.p>

        {/* CTA */}
        <motion.div
          className="mt-10 flex justify-center gap-4 flex-wrap"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
        >
          <Link href="/login">
            <button className="px-6 py-3 bg-white text-black rounded-full font-medium hover:scale-105 transition">
              Get Started
            </button>
          </Link>
          <Link href="/about">
            <button className="px-6 py-3 border border-white/20 text-white rounded-full hover:bg-white/10 transition">
              Learn More
            </button>
          </Link>
        </motion.div>
      </div>

      {/* Floating UI Mock – add public/dashboard-preview.png and use <Image src="/dashboard-preview.png" … /> to show it */}
      <motion.div
        className="absolute bottom-0 translate-y-1/3 opacity-70 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 0.7, y: 0 }}
        transition={{ delay: 1, duration: 1 }}
      >
        <div className="relative w-[min(900px,100vw-2rem)] h-[min(500px,50vw)] rounded-2xl shadow-2xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
          <span className="text-stone-500 text-sm px-4 text-center">
            Add <code className="text-stone-400">public/dashboard-preview.png</code> (e.g. app screenshot) to show here
          </span>
        </div>
      </motion.div>
    </section>
    <BrandsTestimony />
    </>
  );
}
