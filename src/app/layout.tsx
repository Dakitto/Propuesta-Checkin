import type { Metadata } from "next";
import localFont from "next/font/local";

import { PortalProvider } from "@/components/portal-provider";

import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Portal de Check-In",
  description: "Portal de asistencia para consejeros y eventos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-slate-100 font-sans antialiased`}>
        <PortalProvider>{children}</PortalProvider>
      </body>
    </html>
  );
}
