import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — CIVICOS",
  description: "The terms that govern your use of the CIVICOS prototype.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-[760px] px-4 py-10 lg:py-14">
      <p className="font-data text-[10px] uppercase tracking-[0.22em] text-ink-faint">
        Legal · version 0.1, effective 21 September 2026
      </p>
      <h1 className="mt-2 font-display text-[28px] font-semibold tracking-tight text-ink">
        Terms of Service
      </h1>
      <div className="rule-double mt-4 mb-8" aria-hidden="true" />

      <div className="space-y-8 text-[14px] leading-6 text-ink-soft">
        <section>
          <h2 className="font-display text-[17px] font-semibold text-ink">1. What CIVICOS is</h2>
          <p className="mt-2">
            CIVICOS is a software prototype that helps residents observe, document and track civic
            problems such as damaged roads, overflowing garbage points, water leaks, broken
            streetlights, blocked drains and damaged footpaths. It clusters citizen observations
            into incidents, prioritizes them with explainable factors, and tracks whether reported
            problems are actually repaired. CIVICOS is an independent platform. It is not owned by,
            operated by, or officially affiliated with the Greater Hyderabad Municipal Corporation
            (GHMC), HMWSSB, or any government body.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[17px] font-semibold text-ink">2. Prototype status and demo data</h2>
          <p className="mt-2">
            You are using a prototype. All incidents, observations, contributors, timestamps and
            department actions shown in the interface are a deterministic demo fixture. No real
            complaint has been submitted to any municipal system, and the &quot;GHMC demo
            connector&quot; is a simulation behind a future integration interface. Do not rely on
            anything you see here as a record of real civic conditions, and do not use it in an
            emergency. For urgent hazards, contact your municipal emergency line directly.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[17px] font-semibold text-ink">3. Your account and content</h2>
          <p className="mt-2">
            The prototype uses a single demo account (Tanisha) and has no authentication. In a
            production version, you would be responsible for the accuracy of observations you
            submit, for having the right to photograph what you upload from public or permitted
            vantage points, and for keeping your credentials secure. You may not submit content
            that is unlawful, defamatory, invades privacy (for example photographs identifying
            identifiable third parties or licence plates), or intentionally false.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[17px] font-semibold text-ink">4. Acceptable use</h2>
          <ul className="mt-2 space-y-1.5">
            <li className="flex gap-2"><span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rotate-45 bg-accent" />Do not attempt to identify, track or harass other contributors through the platform.</li>
            <li className="flex gap-2"><span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rotate-45 bg-accent" />Do not interfere with the service, scrape it at disruptive volumes, or probe its security.</li>
            <li className="flex gap-2"><span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rotate-45 bg-accent" />Do not use the platform to fabricate civic incidents or manipulate priority of real ones.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-[17px] font-semibold text-ink">5. Automated analysis and its limits</h2>
          <p className="mt-2">
            CIVICOS uses machine-learning models to classify photos, estimate severity, cluster
            duplicate reports and compare before/after evidence. These models are assistive: they
            can misread images, miss damage, or disagree with a human. Severity and similarity
            outputs are advisory and always shown with their reasoning. Resolution verification
            results are opinions based on visible evidence, not guarantees that a repair meets any
            standard. Human review, including on-site inspection, remains the authoritative check.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[17px] font-semibold text-ink">6. No warranty</h2>
          <p className="mt-2">
            The prototype is provided &quot;as is&quot; and &quot;as available&quot; without
            warranties of any kind, express or implied, including fitness for a particular purpose,
            accuracy or availability. It may be slow, wrong, or unavailable, and demo data resets
            when the backend restarts.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[17px] font-semibold text-ink">7. Limitation of liability</h2>
          <p className="mt-2">
            To the maximum extent permitted by law, the CIVICOS authors are not liable for any
            indirect, incidental or consequential loss arising from your use of the prototype,
            including decisions taken (or not taken) on the basis of its outputs.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[17px] font-semibold text-ink">8. Changes</h2>
          <p className="mt-2">
            These terms may be revised as the product evolves. Material changes will be announced
            in the application before taking effect. Continued use after an update constitutes
            acceptance.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[17px] font-semibold text-ink">9. Contact</h2>
          <p className="mt-2">
            Questions about these terms can be sent to{" "}
            <a href="mailto:legal@civicos.example" className="text-accent underline underline-offset-2 hover:text-ink">legal@civicos.example</a>.
          </p>
        </section>
      </div>

      <p className="mt-10 border-t border-rule pt-4 font-data text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">
        <Link href="/" className="text-accent hover:text-ink">Back to the survey</Link>
        <span className="mx-2">·</span>
        <Link href="/legal/privacy" className="text-accent hover:text-ink">Privacy Policy</Link>
      </p>
    </div>
  );
}
