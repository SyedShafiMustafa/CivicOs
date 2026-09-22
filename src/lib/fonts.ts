import { Fraunces, Archivo, IBM_Plex_Mono } from "next/font/google";

/** Display — a characterful old-style serif with real personality at large sizes. */
export const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

/** Body — grotesque with slightly condensed, engineered proportions. */
export const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

/** Data — registry IDs, coordinates, measurements. */
export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});
