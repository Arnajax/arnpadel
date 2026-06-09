import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, Space_Mono } from "next/font/google";
import PwaRuntime from "./components/PwaRuntime";
import { EARLY_CAPTURE_SCRIPT } from "./_lib/install-eligibility";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f5f2e5",
};

export const metadata: Metadata = {
  title: "Padel Hub Hoorn — Privélessen bij de beste trainers",
  description: "Boek een privépadelles bij Padel Hub Hoorn. Kies jouw trainer en plan een moment. Alle niveaus welkom bij Sportcentrum Hoorn.",
  appleWebApp: {
    capable: true,
    title: "Padel Hub",
    statusBarStyle: "default",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SportsActivityLocation",
      "@id": "https://padelhubhoorn.vercel.app/#business",
      "name": "Padel Hub Hoorn",
      "url": "https://padelhubhoorn.vercel.app",
      "telephone": "+31629896879", // TODO: confirm or replace with official business number if different
      "priceRange": "€€",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Holenweg 14a",
        "addressLocality": "Hoorn",
        "postalCode": "1624 PB",
        "addressCountry": "NL",
      },
      "image": "https://padelhubhoorn.vercel.app/arn-photo.jpg",
    },
    {
      "@type": "Person",
      "name": "Arn Braunschweiger",
      "jobTitle": "Padeltrainer",
      "image": "https://padelhubhoorn.vercel.app/arn-photo.jpg",
      "worksFor": { "@id": "https://padelhubhoorn.vercel.app/#business" },
    },
    {
      "@type": "Person",
      "name": "Wessel Molenkamp",
      "jobTitle": "Padeltrainer",
      "image": "https://padelhubhoorn.vercel.app/wessel-photo.jpg",
      "worksFor": { "@id": "https://padelhubhoorn.vercel.app/#business" },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${inter.variable} ${spaceGrotesk.variable} ${spaceMono.variable} h-full antialiased`}>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: `(function(){document.addEventListener('gesturestart',function(e){e.preventDefault();},{passive:false});document.addEventListener('touchmove',function(e){if(e.touches.length>1)e.preventDefault();},{passive:false});})();` }}
        />
        <script dangerouslySetInnerHTML={{ __html: EARLY_CAPTURE_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <PwaRuntime />
        {children}
      </body>
    </html>
  );
}
