"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const SPLASH_DURATION_MS = 3500;
const HORN_VOLUME = 0.25;

export default function PremiumSplash() {
  const [show, setShow] = useState(true);
  const hornPlayed = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  const playHornOnce = () => {
    if (hornPlayed.current) return;
    hornPlayed.current = true;
    try {
      const audio = new Audio("/horn.mp3");
      audio.volume = HORN_VOLUME;
      audio.play().catch(() => {});
    } catch {
      // no horn or unsupported
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
            scale: 1.06,
            transition: {
              duration: 0.7,
              ease: [0.4, 0, 0.2, 1],
              opacity: { duration: 0.5, delay: 0.15 },
            },
          }}
          onClick={playHornOnce}
          onKeyDown={(e) => e.key === "Enter" && playHornOnce()}
          role="presentation"
        >
          {/* Base: dark luxury gradient */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(165deg, #050504 0%, #0c0a09 25%, #141210 45%, #0a0807 70%, #050504 100%)",
            }}
          />

          {/* Subtle animated grain texture */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                backgroundSize: "200px 200px",
              }}
              animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>

          {/* Slow light sweep across screen */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(105deg, transparent 0%, transparent 35%, rgba(251, 191, 36, 0.04) 48%, rgba(245, 158, 11, 0.06) 50%, transparent 52%, transparent 100%)",
                backgroundSize: "60% 100%",
              }}
              animate={{
                backgroundPosition: ["-60% 0", "160% 0"],
              }}
              transition={{
                duration: 3.5,
                ease: "linear",
              }}
            />
          </motion.div>

          {/* Radial warm glow */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 520,
              height: 520,
              background:
                "radial-gradient(circle, rgba(251, 191, 36, 0.12) 0%, rgba(245, 158, 11, 0.04) 40%, transparent 70%)",
              filter: "blur(60px)",
            }}
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.85, 1, 0.85],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Elegant floating particles – fewer, softer */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: 2 + (i % 3),
                  height: 2 + (i % 3),
                  left: `${10 + (i * 7) % 80}%`,
                  top: `${15 + (i * 11) % 70}%`,
                  background: "rgba(251, 191, 36, 0.2)",
                  boxShadow: "0 0 6px rgba(251, 191, 36, 0.15)",
                }}
                initial={{ y: 0, opacity: 0, scale: 0.5 }}
                animate={{
                  y: -180 - (i % 5) * 40,
                  opacity: [0, 0.4, 0],
                  scale: [0.5, 1, 0.6],
                }}
                transition={{
                  duration: 4 + (i % 2),
                  repeat: Infinity,
                  delay: (i * 0.2) % 2.5,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>

          {/* Center: glassmorphism plate + logo + shimmer + blur reveal */}
          <motion.div
            className="relative flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* Glassmorphism plate behind logo */}
            <motion.div
              className="absolute rounded-3xl border border-white/[0.08]"
              style={{
                width: 320,
                height: 320,
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.04) 100%)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                boxShadow:
                  "0 0 0 1px rgba(255,255,255,0.05) inset, 0 24px 48px -12px rgba(0,0,0,0.5), 0 0 80px -20px rgba(251, 191, 36, 0.08)",
              }}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                rotateX: 0,
                rotateY: 0,
              }}
              transition={{
                duration: 1,
                ease: [0.22, 0.61, 0.36, 1],
              }}
            />

            {/* Logo container with 3D parallax feel + blur-to-focus */}
            <motion.div
              className="relative flex flex-col items-center"
              style={{ perspective: "1200px" }}
              initial={{
                scale: 0.88,
                opacity: 0,
                filter: "blur(20px)",
                rotateX: 8,
                rotateY: 0,
              }}
              animate={{
                scale: 1,
                opacity: 1,
                filter: "blur(0px)",
                rotateX: 0,
                rotateY: 0,
              }}
              transition={{
                duration: 1.1,
                ease: [0.22, 0.61, 0.36, 1],
                filter: { duration: 1, ease: "easeOut" },
              }}
            >
              {/* Logo with gold drop-shadow */}
              <motion.div
                className="relative overflow-hidden rounded-2xl"
                animate={{
                  scale: [1, 1.02, 1],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  filter: "drop-shadow(0 0 40px rgba(251, 191, 36, 0.3)) drop-shadow(0 0 80px rgba(251, 191, 36, 0.1))",
                }}
              >
                <Image
                  src="/pompomm-logo.png"
                  alt="Pom Pomm"
                  width={280}
                  height={280}
                  priority
                  className="relative z-0 w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 object-contain select-none pointer-events-none"
                />
                {/* Gold shimmer sweep over logo */}
                <motion.div
                  className="absolute inset-0 z-10 pointer-events-none rounded-2xl overflow-hidden"
                  style={{ mixBlendMode: "overlay" }}
                >
                  <motion.div
                    className="absolute inset-y-0 w-[80%]"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent 0%, rgba(251,191,36,0.4) 35%, rgba(245,158,11,0.3) 50%, transparent 100%)",
                      left: "-80%",
                    }}
                    initial={{ x: 0 }}
                    animate={{ x: "200%" }}
                    transition={{
                      duration: 2.2,
                      delay: 0.5,
                      ease: [0.4, 0, 0.2, 1],
                    }}
                  />
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Tagline: fade + letter-spacing (tracking) animation */}
            <motion.p
              className="mt-6 text-stone-500 tracking-[0.35em] uppercase text-[10px] sm:text-xs font-medium"
              initial={{
                opacity: 0,
                letterSpacing: "0.1em",
              }}
              animate={{
                opacity: 1,
                letterSpacing: "0.35em",
              }}
              transition={{
                delay: 0.9,
                duration: 0.7,
                ease: [0.22, 0.61, 0.36, 1],
              }}
            >
              Creator Performance Platform
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
