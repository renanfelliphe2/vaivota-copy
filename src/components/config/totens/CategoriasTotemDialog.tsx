"use client";

import { useState } from "react";
import type { Categoria } from "@/dominio/tipos";
import { Botao } from "@/components/ui/Botao";
import { Dialogo } from "@/components/ui/Dialogo";
import { EscolhaCategoriasTotem } from "./EscolhaCategoriasTotem";

/**
 * Troca as categorias de um totem já pareado (25/11/2026). Vale com a votação aberta: o tablet recebe a lista nova na próxima
 * consulta. Montado com `key` do totem: cada abertura começa do salvo.
 */
export function CategoriasTotemDialog({
  nome,
  aberto,
  categorias,
  iniciais,
  carregando,
  erroServidor,
  aoFechar,
  aoConfirmar,
}: {
  nome: string | null;
  aberto: boolean;
  categorias: readonly Categoria[];
  iniciais: readonly string[];
  carregando: boolean;
  erroServidor: string | null;
  aoFechar: () => void;
  aoConfirmar: (ids: string[]) => void;
}) {
  // Só as que ainda são do totem (uma categoria pode ter ido para a página depois do pareamento).
  const [marcadas, setMarcadas] = useState(() => iniciais.filter((id) => categorias.some((c) => c.id === id)));
  const [tentou, setTentou] = useState(false);
  const erro = marcadas.length === 0 ? "Escolha ao menos uma categoria para o totem." : null;

  return (
    <Dialogo
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={`Categorias: ${nome ?? "totem"}`}
      rodape={
        <>
          <Botao variante="contorno" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao
            carregando={carregando}
            disabled={categorias.length === 0}
            onClick={() => {
              setTentou(true);
              if (!erro) aoConfirmar(marcadas);
            }}
          >
            Salvar
          </Botao>
        </>
      }
    >
      <EscolhaCategoriasTotem categorias={categorias} marcadas={marcadas} aoMudar={setMarcadas} erro={erroServidor ?? (tentou ? erro : null)} />
    </Dialogo>
  );
}
