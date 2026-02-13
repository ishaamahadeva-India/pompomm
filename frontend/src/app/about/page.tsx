import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us | Pom Pomm",
  description: "About Pom Pomm — Creator performance platform for performance-based marketing.",
};

export default function AboutPage() {
  return (
    <main className="min-h-[60vh] container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">About Us</h1>
      <div className="prose prose-invert prose-sm max-w-none text-muted space-y-4">
        <p>
          <strong>Pom Pomm</strong> is a creator performance platform that connects brands with creators for performance-based marketing campaigns. We enable creators to earn rewards based on verified engagement and help brands reach authentic audiences.
        </p>
        <p>
          Our platform supports direct ad campaigns and sponsored knowledge campaigns, with transparent leaderboards, distribution tracking, and secure payments. We are committed to fair practices and creator empowerment.
        </p>
        <p>
          For any queries, please see our <Link href="/contact" className="text-primary hover:underline">Contact</Link> page or refer to our <Link href="/terms" className="text-primary hover:underline">Terms & Conditions</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  );
}
