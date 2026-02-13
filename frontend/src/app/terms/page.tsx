import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions | Pom Pomm",
  description: "Terms and Conditions for use of Pom Pomm platform.",
};

export default function TermsPage() {
  return (
    <main className="min-h-[60vh] container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Terms & Conditions</h1>
      <div className="prose prose-invert prose-sm max-w-none text-muted space-y-6">
        <p className="text-sm text-muted/90">Last updated: {new Date().toLocaleDateString("en-IN")}</p>

        <section>
          <h2 className="text-lg font-semibold text-foreground mt-6 mb-2">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Pom Pomm platform (“Service”), you agree to be bound by these Terms and Conditions. If you do not agree, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mt-6 mb-2">2. Eligibility</h2>
          <p>
            You must be at least 18 years of age and resident in India (or a jurisdiction where the Service is permitted) to use the Service. By using the Service, you represent that you meet these requirements.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mt-6 mb-2">3. Account and Conduct</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account and for all activity under it. You must provide accurate information and not use the Service for any illegal or unauthorised purpose. We reserve the right to suspend or terminate accounts that violate these terms or for fraud or abuse.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mt-6 mb-2">4. Creator Rewards and Payments</h2>
          <p>
            Rewards and payouts are subject to our verification and anti-fraud policies. Eligibility for payment may require completed KYC or bank details as per our policies. We do not guarantee any minimum earnings. Refunds and cancellations are governed by our <Link href="/refund" className="text-primary hover:underline">Refund Policy</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mt-6 mb-2">5. Intellectual Property</h2>
          <p>
            The Service, including its design, content, and software, is owned by Pom Pomm or its licensors. You may not copy, modify, or distribute any part of the Service without prior written permission.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mt-6 mb-2">6. Limitation of Liability</h2>
          <p>
            To the extent permitted by applicable law, Pom Pomm and its affiliates shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service. Our total liability shall not exceed the amount you have paid to us in the twelve months preceding the claim (if any).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mt-6 mb-2">7. Governing Law</h2>
          <p>
            These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of [insert city/state — update for your entity].
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mt-6 mb-2">8. Changes</h2>
          <p>
            We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance. Material changes will be communicated via the app or email where appropriate.
          </p>
        </section>

        <p className="mt-8 text-sm">
          For questions, see our <Link href="/contact" className="text-primary hover:underline">Contact</Link> page.
        </p>
      </div>
    </main>
  );
}
