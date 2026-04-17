import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ClerkProvider } from "@clerk/nextjs";
import { GlobalNav } from "@/components/global-nav";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Clarift",
  description: "AI-powered study engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(geistSans.variable, geistMono.variable, "font-sans", inter.variable)}>
      <body className="min-h-screen flex flex-col">
        <ClerkProvider>
          <GlobalNav />
          <div className="flex-1">
            {children}
          </div>
        </ClerkProvider>
      </body>
    </html>
  );
}
