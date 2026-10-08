"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import type { ErroServico, Resultado } from "@/servicos/resultado";

/**
 * Executa um serviço da configuração: `carregando` para aria-busy, toast de sucesso ou de erro, e o erro
 * devolvido para os campos (VALIDACAO). Em falha, quem chamou mantém o rascunho (D7).
 */
export function useServico() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<ErroServico | null>(null);
  const toast = useToast();

  async function executar<T>(chamada: () => Promise<Resultado<T>>, mensagemSucesso: string | null = "Salvo"): Promise<Resultado<T>> {
    setCarregando(true);
    setErro(null);
    const r = await chamada();
    setCarregando(false);
    if (r.ok) {
      if (mensagemSucesso) toast(mensagemSucesso, "sucesso");
    } else {
      setErro(r.erro);
      toast(r.erro.mensagem, "erro");
    }
    return r;
  }

  return { carregando, erro, limparErro: () => setErro(null), executar };
}
