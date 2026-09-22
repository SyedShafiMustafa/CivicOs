import dynamic from "next/dynamic";

const MobileShell = dynamic(() => import("@/components/mobile/MobileShell"), { ssr: false });

export const metadata = { title: "CIVICOS · Mobile survey" };

/**
 * /mobile — the dedicated mobile prototype route. In force (framed) mode the
 * shell is fully self-contained: it renders its own screens via internal
 * state, so navigation never leaves the device frame, on any viewport.
 */
export default function MobilePage() {
  return (
    <div className="relative min-h-dvh bg-paper sm:flex sm:items-center sm:justify-center sm:bg-well sm:p-6">
      <div className="h-dvh w-full overflow-hidden sm:h-[92dvh] sm:max-h-[920px] sm:w-[430px] sm:border sm:border-ink sm:shadow-[6px_6px_0_0_var(--rule-strong)]">
        <MobileShell force />
      </div>
    </div>
  );
}
