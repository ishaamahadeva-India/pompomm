"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import pomPommLogo from "@/assets/splash-logo.png";

const MIN_SHOW_MS = 900;
const MAX_SHOW_MS = 2400;

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    const start = Date.now();

    const hide = () => {
      if (!mounted) return;
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, MIN_SHOW_MS - elapsed);
      setTimeout(() => {
        if (!mounted) return;
        setFadeOut(true);
        setTimeout(() => {
          if (mounted) setVisible(false);
        }, 350);
      }, remaining);
    };

    if (document.readyState === "complete") {
      hide();
    } else {
      window.addEventListener("load", hide);
    }
    const maxTimer = setTimeout(hide, MAX_SHOW_MS);

    return () => {
      mounted = false;
      window.removeEventListener("load", hide);
      clearTimeout(maxTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-300 ease-out"
      style={{
        // Single merged background: warm dark base + soft radial glow behind logo (no box, no border)
        background: `
          radial-gradient(ellipse 80% 70% at 50% 38%, rgba(251, 191, 36, 0.12) 0%, rgba(245, 158, 11, 0.04) 35%, transparent 70%),
          radial-gradient(ellipse 100% 100% at 50% 50%, #1a1614 0%, #141210 45%, #0c0a09 100%)
        `,
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? "none" : "auto",
      }}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center justify-center gap-8 px-6">
        {/* Logo merged into background – no container, no border, sits in the radial glow */}
        <div className="relative flex items-center justify-center w-[140px] h-[140px] sm:w-[160px] sm:h-[160px]">
          <Image
            src={pomPommLogo}
            alt="Pom Pomm"
            width={160}
            height={160}
            className="h-full w-full object-contain object-center select-none border-0 outline-none [outline:none]"
            style={{
              filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.2))",
            }}
            priority
          />
        </div>

        {/* Brand name */}
        <div className="text-center space-y-2">
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{
              background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 40%, #ea580c 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Pom Pomm
          </h1>
          <p className="text-sm sm:text-base text-stone-500">Creator Performance Platform</p>
        </div>

        {/* Loading indicator */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <div className="h-0.5 w-24 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 animate-loading-bar"
              style={{ width: "30%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
