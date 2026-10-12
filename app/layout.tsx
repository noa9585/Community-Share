import type { Metadata, Viewport } from "next";
import { Heebo, Rubik } from "next/font/google";
import { headers } from "next/headers";

import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700"],
});

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "שיתוף קהילתי",
  description: "פלטפורמה קהילתית לניהול השאלת ציוד",
  // A closed community: keep it out of search engines.
  robots: { index: false, follow: false },
  referrer: "strict-origin-when-cross-origin",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#43637e",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reading the per-request nonce makes every route render dynamically, which
  // the nonce-based Content-Security-Policy set in proxy.ts requires.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${rubik.variable}`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
          nonce={nonce}
        />
      </head>
      <body className="min-h-screen bg-primary-container text-brand-deep antialiased">
        {children}
      </body>
    </html>
  );
}
