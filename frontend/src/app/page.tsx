"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Testimonials from "@/components/Testimonials";

export default function Page() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [showProductView, setShowProductView] = useState(false);

  useEffect(() => {
    if (!token) return;
    // If user clicked "Product" and landed on /#features, show product content instead of redirecting
    if (typeof window !== "undefined" && window.location.hash === "#features") {
      setShowProductView(true);
      return;
    }
    router.replace("/dashboard");
  }, [token, router]);

  // When logged in, only show this page if they explicitly came for Product (#features)
  if (token && !showProductView) {
    return null;
  }

  return (
    <>
      <Hero />
      <Features />
      <Testimonials />
    </>
  );
}
