import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { BackendStatusCheck } from "@/components/backend-status-check";
import "katex/dist/katex.min.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Clarift - AI-Powered Study Engine",
    template: "%s | Clarift",
  },
  description:
    "Clarift is an AI-powered study engine that helps Filipino students learn faster with smart summaries, quizzes, and personalized practice.",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://clarift.me"
  ),
  openGraph: {
    title: "Clarift - AI-Powered Study Engine",
    description:
      "Clarift is an AI-powered study engine that helps Filipino students learn faster with smart summaries, quizzes, and personalized practice.",
    url: "/",
    siteName: "Clarift",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Clarift - AI-Powered Study Engine",
      },
    ],
    locale: "en_PH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Clarift - AI-Powered Study Engine",
    description:
      "Clarift is an AI-powered study engine that helps Filipino students learn faster with smart summaries, quizzes, and personalized practice.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-surface-page text-text-primary antialiased">
        <ThemeProvider>
          <ClerkProvider
            appearance={{
              variables: {
                colorPrimary: "var(--clerk-color-primary)",
                colorDanger: "var(--clerk-color-danger)",
                colorSuccess: "var(--clerk-color-success)",
                colorWarning: "var(--clerk-color-warning)",
                colorBackground: "var(--clerk-color-background)",
                colorForeground: "var(--clerk-color-foreground)",
                colorMutedForeground: "var(--clerk-color-muted-foreground)",
                colorBorder: "var(--clerk-color-border)",
                colorInputBackground: "var(--clerk-color-input-background)",
                colorInputForeground: "var(--clerk-color-input-foreground)",
                colorRing: "var(--clerk-color-ring)",
                borderRadius: "var(--clerk-border-radius)",
                fontFamily: "var(--clerk-font-family)",
              },
            }}
          >
            {children}
            <BackendStatusCheck />
            <Toaster theme="dark" position="bottom-right" richColors />
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
