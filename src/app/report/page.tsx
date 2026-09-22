import ReportFlow from "@/components/report/ReportFlow";
import MobileReport from "@/components/mobile/MobileReport";

export default function ReportPage() {
  return (
    <>
      {/* Mobile sheet */}
      <div className="lg:hidden">
        <MobileReport />
      </div>

      {/* Desktop flow */}
      <div className="mx-auto hidden max-w-4xl space-y-6 p-4 lg:block lg:p-8">
        <header>
          <p className="font-data text-[10px] uppercase tracking-[0.22em] text-ink-faint">
            Sheet 03 · field capture
          </p>
          <h1 className="mt-2 font-display text-[26px] font-semibold tracking-tight text-ink lg:text-[30px]">
            File a report
          </h1>
          <p className="mt-1 max-w-xl text-sm text-ink-soft">
            Start with a photo. The system reads the issue, checks for existing incidents nearby and
            routes your observation. No long forms.
          </p>
          <div className="rule-double mt-4" aria-hidden="true" />
        </header>
        <ReportFlow />
      </div>
    </>
  );
}
