import type { Metadata } from "next";
import "./globals.css";
import { fraunces, archivo, plexMono } from "@/lib/fonts";
import AppShell from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "CIVICOS · Civic intelligence for your city",
  description:
    "CIVICOS turns scattered citizen observations into verified, prioritized civic incidents, and verifies that reported problems were actually fixed.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${archivo.variable} ${plexMono.variable}`}>
      <body>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
