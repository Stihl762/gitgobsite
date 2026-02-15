// src/pages/privacy.tsx
import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function PrivacyPage() {
  return (
    <main>
      <Header />

      <section className="px-6 py-16 max-w-3xl mx-auto">
        <h1 className="text-3xl font-semibold text-header mb-2">
          NetGoblin Privacy Policy
        </h1>

        <div className="text-ivory/80 text-sm mb-8">
          <div>
            <span className="font-semibold text-ivory/90">Effective Date:</span>{" "}
            02/14/2026
          </div>
          <div>
            <span className="font-semibold text-ivory/90">Last Updated:</span>{" "}
            02/14/2026
          </div>
        </div>

        <PolicySection title="1. Introduction">
          <p className="text-ivory/90">
            NetGoblin LLC is committed to protecting your privacy and personal
            information. This Privacy Policy explains how we collect, use,
            store, and safeguard your data when you interact with netgoblin.org
            and our services.
          </p>
        </PolicySection>

        <PolicySection title="2. Information We Collect">
          <p className="text-ivory/90 mb-3">We may collect:</p>
          <ul className="list-disc pl-6 space-y-2 text-ivory/90">
            <li>Name, email, phone, address</li>
            <li>Identity verification documents</li>
            <li>Data from brokers for removal processing</li>
            <li>Payment information (via third-party processors)</li>
            <li>General analytics (non-personal metrics)</li>
            <li>Device/IP information for security</li>
          </ul>
        </PolicySection>

        <PolicySection title="3. Purpose of Data Use">
          <p className="text-ivory/90 mb-3">We use data to:</p>
          <ul className="list-disc pl-6 space-y-2 text-ivory/90">
            <li>Provide data-removal services</li>
            <li>Process billing &amp; subscriptions</li>
            <li>Verify identity for legal opt-out requests</li>
            <li>Notify users of removal progress &amp; alerts</li>
            <li>Improve service performance</li>
            <li>Minimal optional marketing updates</li>
          </ul>
        </PolicySection>

        <PolicySection title="4. Data Storage &amp; Security">
          <p className="text-ivory/90">
            Data is encrypted in transit and at rest. Stored securely via Google
            and protected internal systems.
          </p>
        </PolicySection>

        <PolicySection title="5. Data Retention">
          <p className="text-ivory/90">
            Data is retained during active service. After cancellation, core
            records may remain for 12–24 months for compliance and dispute
            resolution unless a user requests deletion sooner.
          </p>
        </PolicySection>

        <PolicySection title="6. User Rights">
          <p className="text-ivory/90 mb-3">Users can request:</p>
          <ul className="list-disc pl-6 space-y-2 text-ivory/90">
            <li>Access, correction, or deletion of data</li>
            <li>Export of personal data</li>
            <li>End of processing</li>
          </ul>

          <p className="text-ivory/90 mt-4">
            Contact:{" "}
            <a
              className="text-header underline underline-offset-4"
              href="mailto:support@netgoblin.org"
            >
              support@netgoblin.org
            </a>
          </p>
        </PolicySection>

        <PolicySection title="7. Children’s Data">
          <p className="text-ivory/90">
            We process minors’ data only with verified parental consent.
          </p>
        </PolicySection>

        <PolicySection title="8. Third-Party Services">
          <p className="text-ivory/90">
            We use secure third-party services (payment, storage, brokers). They
            may not sell or misuse data.
          </p>
        </PolicySection>

        <PolicySection title="9. Cookies &amp; Tracking">
          <p className="text-ivory/90">
            We may use minimal cookies in the future for security and essential
            functionality.
          </p>
        </PolicySection>

        <PolicySection title="10. No Data Selling">
          <p className="text-ivory/90">
            We do not sell or trade personal data. Only aggregate anonymous
            metrics are used.
          </p>
        </PolicySection>

        <PolicySection title="11. Policy Updates">
          <p className="text-ivory/90">
            Policy may change. Users will be notified of significant changes.
          </p>
        </PolicySection>

        <div className="mt-10 pt-6 border-t border-ivory/10">
          <h2 className="text-xl font-semibold text-header mb-3">
            Contact Information
          </h2>
          <p className="text-ivory/90">
            NetGoblin LLC — California, USA
            <br />
            <a
              className="text-header underline underline-offset-4"
              href="mailto:support@netgoblin.org"
            >
              support@netgoblin.org
            </a>
          </p>
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
      <h2 className="text-xl font-semibold text-header mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
