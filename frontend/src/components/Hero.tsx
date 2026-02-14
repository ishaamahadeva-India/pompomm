"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-background text-center px-6 overflow-hidden">

      {/* Animated glow */}
      <motion.div
        className="absolute w-[700px] h-[700px] bg-amber-500/10 rounded-full blur-[140px]"
        animate={{ opacity: [0.4, 0.7, 0.4], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative max-w-5xl">
        <motion.h1
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-foreground text-5xl sm:text-6xl md:text-8xl font-semibold leading-tight tracking-tight"
        >
          <motion.span
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-block"
          >
            Performance-Driven
          </motion.span>
          <br />
          <motion.span
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="inline-block"
          >
            Creator Growth
          </motion.span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-6 text-muted-foreground text-lg max-w-2xl mx-auto"
        >
          Pom Pomm connects brands and creators through measurable,
          performance-based marketing infrastructure.
        </motion.p>

        <motion.div
          className="mt-10 flex justify-center gap-4 flex-wrap"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <Link href="/login">
            <motion.button
              className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              Get Started
            </motion.button>
          </Link>
          <Link href="/about">
            <motion.button
              className="px-6 py-3 border border-white/20 text-white rounded-full hover:bg-white/10"
              whileHover={{ scale: 1.05, borderColor: "rgba(255,255,255,0.4)" }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              View Demo
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
