import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MetaVibeCoder",
  description: "Vibe code faster and better with AI-powered tools",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
