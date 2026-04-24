import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
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
  title: "Clarift",
  description: "AI-powered study engine",
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
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
