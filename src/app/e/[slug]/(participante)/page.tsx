import { Suspense } from "react";
import { EntradaEvento } from "@/components/evento/EntradaEvento";

export default function PaginaEvento() {
  return (
    <Suspense>
      <EntradaEvento />
    </Suspense>
  );
}
