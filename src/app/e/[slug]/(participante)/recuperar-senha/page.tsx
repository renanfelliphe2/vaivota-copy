import { metadadosDaTela } from "@/servicos/metadados";
import { Suspense } from "react";
import { TelaRecuperarSenha } from "./TelaRecuperarSenha";

/** "Esqueci minha senha" (08/10/2026). Não exige LOGADO: quem esqueceu a senha ainda não tem sessão. */
export default function PaginaRecuperarSenha() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6">
      <Suspense>
        <TelaRecuperarSenha />
      </Suspense>
    </div>
  );
}

export const generateMetadata = metadadosDaTela("Recuperar senha");
