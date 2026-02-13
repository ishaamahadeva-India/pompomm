import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Pom Pomm",
  description: "Privacy Policy for Pom Pomm — how we collect, use and protect your data.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-[60vh] container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>
      <div className="prose prose-invert prose-sm max-w-none text-muted space-y-6">
        <p className="text-sm text-muted/90">Last updated: {new Date().toLocaleDateString("en-IN")}</p>

        <section>
          <h2 className="text-lg font-semibold text-foreground mt-6 mb-2">1. Introduction</h2>
          <p>
            Pom Pomm (“we”, “our”, “us”) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform and services, in compliance with applicable Indian law including the Information Technology Act, 2000 and related rules.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mt-6 mb-2">2. Information We Collect</h2>
          <p>We may collect:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li><strong className="text-foreground">Account data:</strong> mobile number, display name, email, profile details you provide.</li>
            <li><strong className="text-foreground">Usage data:</strong> campaign participation, views, engagement metrics, device and log data.</li>
            <li><strong className="text-foreground">Payment-related data:</strong> as required for payouts (e.g. bank details, KYC) in accordance with payment and regulatory requirements.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mt-6 mb-2">3. How We Use Your Information</h2>
          <p>
            We use the information to provide, operate, and improve the Service; to process rewards and payouts; to prevent fraud and abuse; to comply with legal obligations; and to communicate with you. We do not sell your personal information to third parties for marketing.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mt-6 mb-2">4. Disclosure and Sharing</h2>
          <p>
            We may share information with service providers (e.g. hosting, payment processors), when required by law, or to protect our rights and safety. Payment and KYC data may be shared with banks, payment gateways, and regulatory authorities as necessary for processing and compliance.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mt-6 mb-2">5. Data Security</h2>
          <p>
            We implement reasonable technical and organisational measures to protect your data. No method of transmission over the internet is fully secure; we encourage you to protect your account credentials.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mt-6 mb-2">6. Retention</h2>
          <p>
            We retain your information for as long as your account is active or as needed to provide the Service, comply with law, or resolve disputes. You may request deletion of your account and associated data subject to legal retention requirements.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mt-6 mb-2">7. Your Rights</h2>
          <p>
            You may access, correct, or request deletion of your personal data where applicable. You may withdraw consent where we rely on it, subject to our ability to continue providing the Service. For requests or grievances, contact us via our <Link href="/contact" className="text-primary hover:underline">Contact</Link> page.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mt-6 mb-2">8. Changes</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of material changes via the app or email. Continued use after changes constitutes acceptance.
          </p>
        </section>

        <p className="mt-8 text-sm">
          For questions, see our <Link href="/contact" className="text-primary hover:underline">Contact</Link> page.
        </p>
      </div>
    </main>
  );
}
