"use client";

import { useSearchParams } from "next/navigation";
import { AvisoVerificacaoEmail } from "@/components/auth/AvisoVerificacaoEmail";
import { ehRotaInterna } from "@/dominio/acesso";

export function TelaCodigo() {
  const de = useSearchParams().get("de");
  return <AvisoVerificacaoEmail de={ehRotaInterna(de) ? de : undefined} />;
}
