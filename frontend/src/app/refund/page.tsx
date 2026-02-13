import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | Pom Pomm",
  description: "Refund and cancellation policy for payments and subscriptions on Pom Pomm.",
};

export default function RefundPage() {
  return (
    <main className="min-h-[60vh] container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Refund & Cancellation Policy</h1>
      <div className="prose prose-invert prose-sm max-w-none text-muted space-y-6">
        <p className="text-sm text-muted/90">Last updated: {new Date().toLocaleDateString("en-IN")}</p>

        <section>
          <h2 className="text-lg font-semibold text-foreground mt-6 mb-2">1. Scope</h2>
          <p>
            This policy applies to payments made on the Pom Pomm platform, including subscription fees and any other charges, in accordance with Indian consumer protection and payment gateway requirements.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mt-6 mb-2">2. Subscription and One-Time Payments</h2>
          <p>
            Subscription fees are charged as per the plan chosen at the time of purchase. You may cancel your subscription before the next billing cycle to avoid further charges. Cancellation will take effect at the end of the current billing period; no partial refunds for unused time within a billing period will be provided unless required by law or at our discretion.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mt-6 mb-2">3. Creator Payouts</h2>
          <p>
            Rewards and payouts to creators are subject to our verification and anti-fraud checks. Once a payout is initiated or completed, reversal or refund may not be possible except in cases of proven error or fraud, which will be assessed on a case-by-case basis.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mt-6 mb-2">4. Refund Requests</h2>
          <p>
            To request a refund, contact us within [e.g. 7–14] days of the charge via our <Link href="/contact" className="text-primary hover:underline">Contact</Link> page with your registered email/mobile and transaction details. We will review and respond within a reasonable time. Approved refunds will be processed to the original payment method or as per our payment partner’s policy; processing may take 7–15 business days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mt-6 mb-2">5. Non-Refundable Situations</h2>
          <p>
            We may not provide refunds where: (a) the service was fully consumed or used as per terms, (b) the request is made after the stated refund window, (c) there is evidence of fraud or abuse, or (d) otherwise prohibited by our payment partner or applicable law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mt-6 mb-2">6. Disputes and Grievances</h2>
          <p>
            For payment or refund disputes, please contact us first. If unresolved, you may have recourse under applicable consumer protection laws in India. Our contact details are on the <Link href="/contact" className="text-primary hover:underline">Contact</Link> page.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mt-6 mb-2">7. Changes</h2>
          <p>
            We may update this policy from time to time. Material changes will be communicated via the app or email. Continued use after changes constitutes acceptance.
          </p>
        </section>

        <p className="mt-8 text-sm">
          For questions, see our <Link href="/contact" className="text-primary hover:underline">Contact</Link> page.
        </p>
      </div>
    </main>
  );
}
