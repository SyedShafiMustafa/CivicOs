import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — CIVICOS",
  description: "How the CIVICOS prototype handles data, including photos and location.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[760px] px-4 py-10 lg:py-14">
      <p className="font-data text-[10px] uppercase tracking-[0.22em] text-ink-faint">
        Legal · version 0.1, effective 21 September 2026
      </p>
      <h1 className="mt-2 font-display text-[28px] font-semibold tracking-tight text-ink">
        Privacy Policy
      </h1>
      <div className="rule-double mt-4 mb-8" aria-hidden="true" />

      <div className="space-y-8 text-[14px] leading-6 text-ink-soft">
        <section>
          <h2 className="font-display text-[17px] font-semibold text-ink">1. Scope</h2>
          <p className="mt-2">
            This policy explains what the CIVICOS prototype does with data: your photos, your
            device location, and the records the product builds around them. It applies to this
            prototype only. A production deployment would publish its own updated policy.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[17px] font-semibold text-ink">2. What we collect in the prototype</h2>
          <ul className="mt-2 space-y-1.5">
            <li className="flex gap-2"><span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rotate-45 bg-accent" /><span><span className="font-medium text-ink">Photos you capture or choose.</span> Used for issue classification, similarity matching and before/after verification. In the demo these stay on your device or in the local backend process.</span></li>
            <li className="flex gap-2"><span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rotate-45 bg-accent" /><span><span className="font-medium text-ink">Location.</span> With your permission, coarse device location (latitude and longitude) is attached to an observation so incidents can be plotted and clustered. Samples use a fixed demo location instead.</span></li>
            <li className="flex gap-2"><span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rotate-45 bg-accent" /><span><span className="font-medium text-ink">Derived features.</span> Embeddings (numeric vectors) computed from your photo and description, used to detect duplicates. They are not reversible into images.</span></li>
            <li className="flex gap-2"><span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rotate-45 bg-accent" /><span><span className="font-medium text-ink">Notification preferences.</span> Stored locally in your browser in this prototype.</span></li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-[17px] font-semibold text-ink">3. What we do not collect</h2>
          <p className="mt-2">
            No advertising identifiers. No contacts. No precise background tracking: location is
            read once per report, only while you are filing it. The demo account (Tanisha) is
            fictional and collects nothing.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[17px] font-semibold text-ink">4. How data is used and shared</h2>
          <p className="mt-2">
            Data you submit exists to build the civic record: clustering your observation with
            others about the same problem, showing contributors how their reports progressed, and
            generating drafts for municipal complaint portals. Aggregates (counts, areas,
            resolution rates) may be shown publicly. Individual observations may show your display
            name as the contributor; a production version would let you file anonymously.
          </p>
          <p className="mt-2">
            If AI features are enabled with an API key, the photo and short description of the
            report being analyzed are sent to the configured model provider for classification.
            The prototype never sells data, and nothing is sent to any government system.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[17px] font-semibold text-ink">5. Retention</h2>
          <p className="mt-2">
            The demo store is in-memory and resets when the backend restarts. Nothing you do in the
            prototype persists. A production version would publish explicit retention periods (for
            example: exhibits kept while an incident is open plus 12 months, then reduced to
            aggregates).
          </p>
        </section>

        <section>
          <h2 className="font-display text-[17px] font-semibold text-ink">6. Your choices and rights</h2>
          <p className="mt-2">
            You can decline the location permission and still file reports using manually chosen
            positions. You can delete an observation you filed (in a production version) at any
            time, which removes the photo and detaches it from its incident while preserving the
            incident record. For questions or deletion requests, write to{" "}
            <a href="mailto:privacy@civicos.example" className="text-accent underline underline-offset-2 hover:text-ink">privacy@civicos.example</a>.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[17px] font-semibold text-ink">7. Photographing responsibly</h2>
          <p className="mt-2">
            Frame your evidence on the infrastructure, not on people. Avoid licence plates, home
            entrances and identifiable faces. This keeps the record useful and respects the privacy
            of everyone who lives on the street.
          </p>
        </section>
      </div>

      <p className="mt-10 border-t border-rule pt-4 font-data text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">
        <Link href="/" className="text-accent hover:text-ink">Back to the survey</Link>
        <span className="mx-2">·</span>
        <Link href="/legal/terms" className="text-accent hover:text-ink">Terms of Service</Link>
      </p>
    </div>
  );
}
