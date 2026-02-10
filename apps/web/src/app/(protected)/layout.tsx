import { Header } from "@/components/layout/header";
import { QueryProvider } from "@/components/providers/query-provider";

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <QueryProvider>
      <Header />
      <main>{children}</main>
    </QueryProvider>
  );
}
