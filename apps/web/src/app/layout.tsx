import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Upgraded Couscous",
  description: "A Turborepo monorepo with Next.js, Hono, and more",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
