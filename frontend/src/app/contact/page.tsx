import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact Us | Pom Pomm",
  description: "Contact Pom Pomm for support and enquiries.",
};

export default function ContactPage() {
  return (
    <main className="min-h-[60vh] container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Contact Us</h1>
      <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-6">
        <p className="text-muted">
          For support, partnership enquiries, or feedback, please reach out:
        </p>
        <ul className="space-y-2 text-muted">
          <li>
            <strong className="text-foreground">Email:</strong>{" "}
            <a href="mailto:support@pompomm.in" className="text-primary hover:underline">
              support@pompomm.in
            </a>
          </li>
          <li>
            <strong className="text-foreground">Website:</strong>{" "}
            <a href="https://pompomm.in" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              pompomm.in
            </a>
          </li>
          <li>
            <strong className="text-foreground">Address:</strong> [Your registered business address — update for payment gateway compliance]
          </li>
        </ul>
        <p className="text-sm text-muted">
          We aim to respond within 24–48 hours on business days. For payment or refund-related issues, please refer to our <Link href="/refund" className="text-primary hover:underline">Refund Policy</Link>.
        </p>
      </div>
    </main>
  );
}
