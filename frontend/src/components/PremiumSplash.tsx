"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const SPLASH_DURATION_MS = 3200;
const HORN_VOLUME = 0.25;

export default function PremiumSplash() {
  const [show, setShow] = useState(true);
  const hornPlayed = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
    }, SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  // Optional: play horn once after first user interaction (avoids autoplay block)
  const playHornOnce = () => {
    if (hornPlayed.current) return;
    hornPlayed.current = true;
    try {
      const audio = new Audio("/horn.mp3");
      audio.volume = HORN_VOLUME;
      audio.play().catch(() => {});
    } catch {
      // no horn file or unsupported
    }
  };

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{
            paddingLeft: "env(safe-area-inset-left)",
            paddingRight: "env(safe-area-inset-right)",
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] },
          }}
          onClick={playHornOnce}
          onKeyDown={(e) => e.key === "Enter" && playHornOnce()}
          role="presentation"
        >
          {/* Cinematic dark gradient */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(165deg, #0c0a09 0%, #1c1917 35%, #0f0d0b 60%, #0a0908 100%)",
            }}
          />

          {/* Soft radial glow behind logo */}
          <motion.div
            className="absolute rounded-full blur-[100px]"
            style={{
              width: 480,
              height: 480,
              background: "radial-gradient(circle, rgba(251, 191, 36, 0.18) 0%, rgba(245, 158, 11, 0.06) 45%, transparent 70%)",
            }}
            animate={{
              scale: [1, 1.12, 1],
              opacity: [0.9, 1, 0.9],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Subtle lightning flicker – very soft */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 90% 80% at 50% 40%, rgba(255, 220, 150, 0.03) 0%, transparent 60%)",
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Floating particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(18)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-amber-400/30"
                style={{
                  width: 3 + Math.random() * 3,
                  height: 3 + Math.random() * 3,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                initial={{
                  y: 0,
                  opacity: 0,
                  scale: 0.6,
                }}
                animate={{
                  y: -220 - Math.random() * 180,
                  opacity: [0, 0.5, 0],
                  scale: [0.6, 1, 0.8],
                }}
                transition={{
                  duration: 3.5 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2.5,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>

          {/* Logo + copy */}
          <motion.div
            className="relative flex flex-col items-center"
            initial={{ scale: 0.82, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
            }}
            transition={{
              duration: 1,
              ease: [0.22, 0.61, 0.36, 1],
            }}
          >
            <motion.div
              className="relative"
              animate={{
                scale: [1, 1.04, 1],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                filter: "drop-shadow(0 0 48px rgba(251, 191, 36, 0.35))",
              }}
            >
              <Image
                src="/pompomm-logo.png"
                alt="Pom Pomm"
                width={280}
                height={280}
                priority
                className="w-48 h-48 sm:w-64 sm:h-64 md:w-72 md:h-72 object-contain select-none pointer-events-none"
              />
            </motion.div>

            <motion.p
              className="mt-6 text-stone-400 tracking-[0.2em] uppercase text-xs sm:text-sm font-medium"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              Creator Performance Platform
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
