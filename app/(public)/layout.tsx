import { PublicNav } from "./public-nav";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicNav />
      {children}
      <footer className="py-8 text-center text-sm text-outline font-label space-y-1">
        <p>Powered by <span className="font-semibold text-primary">GovTech</span></p>
        <p className="text-xs text-outline/60">© 2026 GovEvent. All rights reserved.</p>
      </footer>
    </>
  );
}
