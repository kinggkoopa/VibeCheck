import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MetaVibeCoder",
  description:
    "S+++ meta-vibe-coding tool — optimize prompts, orchestrate agents, ship better code",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
