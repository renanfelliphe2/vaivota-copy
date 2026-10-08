"use client";

import { useSearchParams } from "next/navigation";
import { RecuperarSenha } from "@/components/auth/RecuperarSenha";
import { ehRotaInterna } from "@/dominio/acesso";

export function TelaRecuperarSenha() {
  const de = useSearchParams().get("de");
  return <RecuperarSenha de={ehRotaInterna(de) ? de : undefined} />;
}
