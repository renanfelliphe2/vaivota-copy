import { AdminShell } from "@/components/nav/AdminShell";
import { RotaGuard } from "@/components/nav/RotaGuard";

export default function LayoutPainel({ children }: LayoutProps<"/e/[slug]/admin">) {
  return (
    <RotaGuard exigencia={{ tipo: "PAPEL", papeis: ["ADMIN"] }} comoMain>
      <AdminShell>{children}</AdminShell>
    </RotaGuard>
  );
}
