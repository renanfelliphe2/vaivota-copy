"use client";

import { CircleCheck, Trophy } from "lucide-react";
import type { CoresTema } from "@/lib/tema";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { LogoEvento } from "@/components/evento/LogoEvento";
import { TemaEvento } from "@/components/evento/TemaEvento";
import { Abas } from "@/components/ui/Abas";
import { Botao } from "@/components/ui/Botao";
import { Selo } from "@/components/ui/Selo";

export type PreviaTemaProps = {
  cores: CoresTema;
  nome: string;
  logoUrl: string | null;
  rotuloCandidato: string;
  rotuloCandidatos: string;
};

/**
 * Etapa 6 (D18): prévia com o tema do rascunho, em TemaEvento com `inert`: não altera o app antes de salvar.
 * A aba Telão é uma amostra simplificada (a cena real é da Etapa 8).
 */
export function PreviaTema({ cores, nome, logoUrl, rotuloCandidato, rotuloCandidatos }: PreviaTemaProps) {
  const moldura = (conteudo: React.ReactNode) => (
    <TemaEvento tema={cores} inert aria-label="Pré-visualização" className="overflow-hidden rounded-2xl border border-tema-borda">
      {conteudo}
    </TemaEvento>
  );

  return (
    <Abas
      rotulo="Telas da pré-visualização"
      abas={[
        {
          id: "login",
          rotulo: "Login",
          conteudo: moldura(
            <div className="flex flex-col gap-4 p-5">
              <LogoEvento nome={nome} logoUrl={logoUrl} className="h-10" />
              <div className="flex flex-col gap-3 rounded-2xl border border-tema-borda bg-tema-superficie p-4">
                <p className="font-bold">Entre para participar</p>
                <div className="min-h-11 rounded-lg border border-tema-texto-suave bg-tema-fundo px-3 py-2.5 text-tema-texto-suave">seu@email.com</div>
                <Botao larguraTotal>Continuar</Botao>
                <p className="text-sm text-tema-texto-suave">Texto de apoio com a cor suave.</p>
              </div>
            </div>,
          ),
        },
        {
          id: "votacao",
          rotulo: "Votação",
          conteudo: moldura(
            <div className="flex flex-col gap-3 p-5">
              <p className="text-2xl font-bold">{rotuloCandidatos}</p>
              <p className="text-sm font-semibold text-tema-primaria-texto">8 {rotuloCandidatos.toLocaleLowerCase("pt-BR")} concorrendo</p>
              <div className="overflow-hidden rounded-2xl border-2 border-tema-primaria bg-tema-superficie">
                <ImagemCandidato titulo={rotuloCandidato} imagemUrl="placeholder:1" proporcao="16/9" />
                <div className="flex flex-col gap-2 p-3">
                  <Selo variante="primaria" icone={CircleCheck}>
                    Sua escolha
                  </Selo>
                  <p className="font-bold">{rotuloCandidato} de exemplo</p>
                  <div className="flex gap-2">
                    <Botao variante="contorno" tamanho="pequeno">
                      Ver detalhes
                    </Botao>
                    <Botao variante="secundaria" tamanho="pequeno">
                      Escolher
                    </Botao>
                  </div>
                </div>
              </div>
            </div>,
          ),
        },
        {
          id: "telao",
          rotulo: "Telão",
          conteudo: moldura(
            <div className="flex aspect-video flex-col items-center justify-center gap-3 p-5 text-center">
              <LogoEvento nome={nome} logoUrl={logoUrl} className="h-8" />
              <p className="text-xl font-bold">Resultado</p>
              <ol className="flex items-end gap-3">
                {[2, 1, 3].map((pos) => (
                  <li
                    key={pos}
                    className={
                      pos === 1
                        ? "flex h-24 w-20 flex-col items-center justify-end rounded-t-xl bg-tema-primaria p-2 text-tema-sobre-primaria"
                        : "flex h-16 w-20 flex-col items-center justify-end rounded-t-xl bg-tema-secundaria p-2 text-tema-sobre-secundaria"
                    }
                  >
                    {pos === 1 && <Trophy aria-hidden className="size-5" />}
                    <span className="text-sm font-bold">{pos}º</span>
                  </li>
                ))}
              </ol>
            </div>,
          ),
        },
      ]}
    />
  );
}
