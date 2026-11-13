import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Manrope, Syne } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import { BRAND } from "@/lib/product/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: BRAND.name,
    template: `%s · ${BRAND.name}`,
  },
  description: `${BRAND.description} Plus a free daily musical puzzle.`,
  applicationName: BRAND.name,
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "any" },
      { url: BRAND.iconSrc, type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: BRAND.name,
    description: "Train your musical reflexes. Master your instrument. Play today’s puzzle.",
    type: "website",
    siteName: BRAND.name,
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.name,
    description: "Train your musical reflexes. Master your instrument.",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090D",
  colorScheme: "dark",
};

const themeBoot = `(function(){try{var k='riffony';var raw=localStorage.getItem(k)||localStorage.getItem('musical-reflex');var theme='dark';var reduced=false;if(raw){var p=JSON.parse(raw);var s=(p.state&&p.state.settings)||p.settings;if(s){theme=s.theme||'dark';reduced=!!s.reducedMotion;}}if(theme==='system'){theme=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.dataset.theme=theme;document.documentElement.dataset.reducedMotion=reduced?'true':'false';}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${manrope.variable} ${syne.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
