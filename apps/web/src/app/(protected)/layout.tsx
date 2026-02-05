import { Header } from "@/components/layout/header";

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <>
      <Header />
      <main>{children}</main>
    </>
  );
}
