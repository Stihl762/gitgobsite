// src/pages/terms.tsx
import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function TermsPage() {
  return (
    <main>
      <Header />

      <section className="px-6 py-16 max-w-3xl mx-auto">
        <h1 className="text-3xl font-semibold text-amber mb-2">
          NetGoblin Terms of Service
        </h1>

        <div className="text-ivory/80 text-sm mb-8 space-y-1">
          <div>
            <span className="font-semibold text-ivory/90">Effective Date:</span>{" "}
            02/14/2026
          </div>
          <div>
            <span className="font-semibold text-ivory/90">Jurisdiction:</span>{" "}
            USA
          </div>
        </div>

        <PolicySection title="1. Acceptance of Terms">
          <p className="text-ivory/90">
            By creating an account, submitting information for privacy services,
            or clicking &quot;Start the Hunt,&quot; you agree to be bound by
            these Terms of Service and the NetGoblin Privacy Policy. This is a
            legally binding click-wrap agreement.
          </p>
        </PolicySection>

        <PolicySection title="2. Services Provided">
          <p className="text-ivory/90">
            NetGoblin provides privacy-enhancing services including data broker
            removal, opt-outs, monitoring, manual, future semi-automated, and
            future automated systems, dashboards, email support,
            logs/screenshots, and secure data handling. Future services may
            include real-time monitoring apps, progress displays, catfish
            protection, data compression, and additional privacy modules.
          </p>
        </PolicySection>

        <PolicySection title="3. Services Not Provided">
          <p className="text-ivory/90">
            NetGoblin does not provide legal advice, identity theft recovery,
            credit repair, offensive security, guaranteed removal, or guaranteed
            permanent suppression of data.
          </p>
        </PolicySection>

        <PolicySection title="4. User Responsibilities">
          <p className="text-ivory/90">
            Users must provide accurate info, legally authorize data use, and
            acknowledge varying results and re-collection risks. Minors require
            guardian consent.
          </p>
        </PolicySection>

        <PolicySection title="5. Account Access &amp; Authority">
          <p className="text-ivory/90">
            User authorizes opt-outs/removal requests. NetGoblin does not create
            accounts or use customer logins.
          </p>
        </PolicySection>

        <PolicySection title="6. Information &amp; Data Handling">
          <p className="text-ivory/90">
            NetGoblin stores data required for service, including
            logs/screenshots. Upon deletion request, identifiers are anonymized
            for analytics unless law requires full deletion.
          </p>
        </PolicySection>

        <PolicySection title="7. Refund &amp; Cancellation Policy">
          <p className="text-ivory/90">
            No refunds. Monthly cancellations take effect at the end of the
            billing cycle. Annual plans are non-refundable. Beta cancellations
            permanently forfeit lifetime pricing.
          </p>
        </PolicySection>

        <PolicySection title="8. Beta Program Terms">
          <p className="text-ivory/90">
            Beta access limited. Discount tied to continued subscription.
            Cancellation irrevocably forfeits discount. Beta may change or end
            anytime.
          </p>
        </PolicySection>

        <PolicySection title="9. No Guarantee Clause">
          <p className="text-ivory/90">
            NetGoblin provides best-effort services. Timelines vary, some sites
            may resist removal, re-collection may occur, and complete permanence
            cannot be guaranteed.
          </p>
        </PolicySection>

        <PolicySection title="10. Limitation of Liability">
          <p className="text-ivory/90">
            Liability limited to the amount paid. No responsibility for
            third-party actions, re-collection, platform refusals, or indirect
            damages.
          </p>
        </PolicySection>

        <PolicySection title="11. Dispute Resolution &amp; Governing Law">
          <p className="text-ivory/90">
            Binding arbitration under California law. No class actions. Venue:
            California.
          </p>
        </PolicySection>

        <PolicySection title="12. Termination">
          <p className="text-ivory/90">
            Accounts may be suspended for misuse or violations.
          </p>
        </PolicySection>

        <PolicySection title="13. Modification of Terms">
          <p className="text-ivory/90">
            Terms may be updated anytime. Continued use = acceptance.
          </p>
        </PolicySection>

        <PolicySection title="14. Contact">
          <p className="text-ivory/90">
            NetGoblin Legal
            <br />
            <a
              className="text-amber underline underline-offset-4"
              href="mailto:support@netgoblin.org"
            >
              support@netgoblin.org
            </a>
          </p>
        </PolicySection>

        <div className="mt-10 pt-6 border-t border-ivory/10">
          <h2 className="text-xl font-semibold text-amber mb-3">
            Click-Wrap Consent Language
          </h2>

          <div className="space-y-3 text-ivory/90">
            <p>
              <span className="font-semibold">Button:</span> Start the Hunt
            </p>
            <p>
              <span className="font-semibold">Consent Line:</span> By
              continuing, you agree to the Terms of Service and Privacy Policy
              and authorize NetGoblin to perform data protection and removal
              operations on your behalf.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function PolicySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-amber mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
