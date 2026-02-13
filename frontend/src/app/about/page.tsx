import type { Metadata } from "next";
import { BrandsTestimony } from "@/components/BrandsTestimony";
import { TopEarners } from "@/components/TopEarners";

export const metadata: Metadata = {
  title: "Brands | Pom Pomm",
  description: "Brands growing with Pom Pomm. Testimonials and top performer leaderboards.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      {/* Brands testimony — brands that benefited from our application */}
      <section>
        <BrandsTestimony />
      </section>

      {/* Leaderboard: weekly, monthly, top performers */}
      <section className="border-t border-white/10 container mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <h2 className="text-2xl font-bold tracking-tight mb-2">Top performers</h2>
        <p className="text-muted text-sm mb-8">
          Weekly, monthly and all-time leaderboard. Creators ranked by earnings.
        </p>
        <TopEarners />
      </section>
    </main>
  );
}
