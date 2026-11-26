"use client";

import { Link2, MonitorX } from "lucide-react";
import { useEffect, useRef } from "react";
import { TelaPalco } from "@/components/apresentacao/TelaPalco";
import { Botao } from "@/components/ui/Botao";
import { Carregando } from "@/components/ui/Carregando";
import { chaveDoModo } from "@/dominio/telaoRemoto";
import { definirPalcoAtivo } from "@/store/acoesApresentacao";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useTelaoPareado } from "@/store/telaoRemoto";

// Telão em outro aparelho (25/11/2026): /e/<slug>/telao, depois do pareamento por código. O palco é o mesmo da aba do admin
// (TelaPalco), com o modo vindo do servidor e os botões do controle remoto chegando por ele (useTelaoPareado). A tela cheia é
// pedida na raiz desta página: trocar de modo (ensaio → real) remonta o palco sem sair dela.

export function TelaTelaoPareado() {
  const ativo = useEventoAtivo();
  const raiz = useRef<HTMLDivElement>(null);
  const situacao = useTelaoPareado(ativo?.evento.id ?? null);

  useEffect(() => {
    definirPalcoAtivo(true);
    return () => definirPalcoAtivo(false);
  }, []);

  if (!ativo) return null;
  const parear = `/e/${ativo.slug}/telao/parear`;

  let conteudo;
  if (situacao.tipo === "PRONTO") {
    conteudo = <TelaPalco key={chaveDoModo(situacao.modo)} remoto={{ modo: situacao.modo, raiz }} />;
  } else if (situacao.tipo === "CONECTANDO") {
    conteudo = (
      <main id="conteudo" className="flex flex-1 items-center justify-center px-6 py-16">
        <Carregando texto="Conectando à apresentação…" />
      </main>
    );
  } else {
    const substituido = situacao.tipo === "SUBSTITUIDO";
    conteudo = (
      <main id="conteudo" className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="flex max-w-xl flex-col items-center gap-6 text-center">
          <MonitorX aria-hidden className="size-16 text-tema-primaria-texto" />
          <h1 className="text-3xl font-bold">
            {substituido
              ? "O telão foi aberto em outra aba"
              : situacao.outroEvento
                ? "Este aparelho mostra a apresentação de outro evento"
                : "Este aparelho não está conectado à apresentação"}
          </h1>
          <p className="text-lg text-tema-texto-suave">
            {substituido
              ? "Use a outra aba, ou recarregue esta para trazer o telão para cá."
              : "No computador que vai comandar, abra a apresentação e clique em “Abrir em outro aparelho” para ver o código. Depois, digite-o aqui."}
          </p>
          {substituido ? (
            <Botao tamanho="grande" onClick={() => window.location.reload()}>
              Trazer o telão para esta aba
            </Botao>
          ) : (
            <Botao tamanho="grande" href={parear} icone={<Link2 aria-hidden className="size-5" />}>
              Digitar o código
            </Botao>
          )}
        </div>
      </main>
    );
  }

  return (
    <div ref={raiz} className="flex min-h-dvh flex-col bg-tema-fundo text-tema-texto font-tema">
      {conteudo}
    </div>
  );
}
