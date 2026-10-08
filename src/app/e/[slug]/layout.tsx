import { GateEvento } from "@/components/evento/GateEvento";

/** Layout de servidor (D14): a validade do slug é resolvida no cliente, pelo GateEvento. */
export default function LayoutEvento({ children }: LayoutProps<"/e/[slug]">) {
  return <GateEvento>{children}</GateEvento>;
}
