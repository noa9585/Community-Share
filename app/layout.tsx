import type { Metadata } from "next";
import { Heebo, Rubik } from "next/font/google";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${rubik.variable}`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-primary-container text-brand-deep antialiased">
        {children}
      </body>
    </html>
  );
}
