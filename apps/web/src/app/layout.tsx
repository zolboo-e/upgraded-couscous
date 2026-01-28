import type { Metadata } from "next";

import { Header } from "@/components/layout/header";
import { AuthProvider } from "@/contexts/auth-context";

import "./globals.css";

export const metadata: Metadata = {
  title: "Upgraded Couscous",
  description: "A Turborepo monorepo with Next.js, Hono, and more",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <Header />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
