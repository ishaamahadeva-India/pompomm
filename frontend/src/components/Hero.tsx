"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-[#0B0B0C] text-center px-6 overflow-hidden">

      {/* Glow */}
      <div className="absolute w-[700px] h-[700px] bg-amber-500/10 rounded-full blur-[140px]" />

      <div className="relative max-w-5xl">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          className="text-white text-5xl sm:text-6xl md:text-8xl font-semibold leading-tight tracking-tight"
        >
          Performance-Driven
          <br />
          Creator Growth
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-stone-400 text-lg max-w-2xl mx-auto"
        >
          Pom Pomm connects brands and creators through measurable,
          performance-based marketing infrastructure.
        </motion.p>

        <div className="mt-10 flex justify-center gap-4">
          <Link href="/login">
            <button className="px-6 py-3 bg-white text-black rounded-full font-medium hover:scale-105 transition">
              Get Started
            </button>
          </Link>
          <Link href="/about">
            <button className="px-6 py-3 border border-white/20 text-white rounded-full hover:bg-white/10 transition">
              View Demo
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
