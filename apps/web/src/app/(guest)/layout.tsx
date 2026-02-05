export default function GuestLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return <main className="flex min-h-screen items-center justify-center">{children}</main>;
}
