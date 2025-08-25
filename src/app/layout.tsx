import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/auth/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "سیستم حضور و غیاب کارکنان",
  description: "سیستم جامع مدیریت حضور و غیاب کارکنان با Next.js و FastAPI",
  keywords: ["حضور و غیاب", "Next.js", "TypeScript", "Tailwind CSS", "FastAPI"],
  authors: [{ name: "تیم توسعه" }],
  openGraph: {
    title: "سیستم حضور و غیاب کارکنان",
    description: "سیستم جامع مدیریت حضور و غیاب کارکنان",
    url: "https://localhost:3000",
    siteName: "سیستم حضور و غیاب",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
