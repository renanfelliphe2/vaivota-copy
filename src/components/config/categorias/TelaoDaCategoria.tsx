"use client";

import { LIMITE_MENSAGEM_TELAO, MENSAGEM_TOTEM_PADRAO, mostraVotosNaPosicao, PODIO } from "@/dominio/apresentacao/cerimonia";
import type { CanalCategoria } from "@/dominio/tipos";
import { Campo, Input } from "@/components/ui/Campo";
import { cx } from "@/lib/classes";

// Cerimônia (25/11/2026): como a categoria aparece no telão. Quantos lugares a revelação mostra (1 = só o vencedor), em quais deles
// aparecem os votos e a porcentagem e, na categoria do totem, a frase no lugar do QR Code durante a votação.

export type TelaoCategoria = { podioTamanho: number; podioVotos: boolean[]; mensagemTelao: string };

const ATALHOS_TAMANHO = [
  { valor: 1, rotulo: "Só o vencedor" },
  { valor: 3, rotulo: "3 lugares" },
  { valor: 5, rotulo: "5 lugares" },
] as const;

/** Os votos de cada posição, com o padrão (só o 1º) para as que não têm valor gravado. */
export function votosPorPosicao(t: Pick<TelaoCategoria, "podioTamanho" | "podioVotos">): boolean[] {
  return Array.from({ length: t.podioTamanho }, (_, i) => mostraVotosNaPosicao(t.podioVotos, i + 1));
}

function Opcao({ ativo, children, aoEscolher }: { ativo: boolean; children: React.ReactNode; aoEscolher: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={aoEscolher}
      className={cx(
        "min-h-11 rounded-xl border px-3.5 text-sm font-semibold transition focus-visible:outline-3 focus-visible:outline-tema-foco",
        ativo ? "border-tema-primaria bg-tema-superficie text-tema-primaria-texto" : "border-tema-borda hover:border-tema-primaria",
      )}
    >
      {children}
    </button>
  );
}

export function TelaoDaCategoria({ valor, canal, aoMudar }: { valor: TelaoCategoria; canal: CanalCategoria; aoMudar: (v: Partial<TelaoCategoria>) => void }) {
  const tamanho = valor.podioTamanho;
  const outro = !ATALHOS_TAMANHO.some((a) => a.valor === tamanho);
  const votos = votosPorPosicao(valor);
  const definirVotos = (lista: boolean[]) => aoMudar({ podioVotos: lista });
  return (
    <fieldset className="flex flex-col gap-4 rounded-xl border border-tema-borda p-4">
      <legend className="px-1 font-semibold">No telão</legend>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold" id="podio-rotulo">
          Lugares revelados
        </span>
        <div role="group" aria-labelledby="podio-rotulo" className="flex flex-wrap items-center gap-2">
          {ATALHOS_TAMANHO.map((a) => (
            <Opcao key={a.valor} ativo={tamanho === a.valor} aoEscolher={() => aoMudar({ podioTamanho: a.valor })}>
              {a.rotulo}
            </Opcao>
          ))}
          <Opcao ativo={outro} aoEscolher={() => aoMudar({ podioTamanho: outro ? tamanho : 2 })}>
            Outro
          </Opcao>
          {outro && (
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-tema-texto-suave">
              Lugares
              <Input
                type="number"
                min={PODIO.minimo}
                max={PODIO.maximo}
                value={tamanho}
                className="w-20"
                onChange={(e) => aoMudar({ podioTamanho: Math.min(PODIO.maximo, Math.max(PODIO.minimo, Number(e.target.value) || PODIO.minimo)) })}
              />
            </label>
          )}
        </div>
        <span className="text-sm text-tema-texto-suave">
          {tamanho === 1 ? "A revelação mostra só o vencedor da categoria." : `A revelação mostra do ${tamanho}º ao 1º lugar, e o resultado da categoria traz os ${tamanho}.`}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">Votos e porcentagem</span>
        {tamanho > 1 && (
          <div className="flex flex-wrap gap-2">
            <Opcao ativo={votos.every(Boolean)} aoEscolher={() => definirVotos(votos.map(() => true))}>
              Em todas
            </Opcao>
            <Opcao ativo={votos[0] && votos.slice(1).every((v) => !v)} aoEscolher={() => definirVotos(votos.map((_, i) => i === 0))}>
              Só no 1º
            </Opcao>
            <Opcao ativo={votos.every((v) => !v)} aoEscolher={() => definirVotos(votos.map(() => false))}>
              Em nenhuma
            </Opcao>
          </div>
        )}
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {votos.map((v, i) => (
            <li key={i}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-sm has-focus-visible:outline-3 has-focus-visible:outline-tema-foco">
                <input
                  type="checkbox"
                  checked={v}
                  onChange={(e) => definirVotos(votos.map((x, j) => (j === i ? e.target.checked : x)))}
                  className="size-4 accent-tema-primaria"
                />
                <span>
                  <b>{tamanho === 1 ? "Vencedor" : `${i + 1}º lugar`}</b>: {v ? "mostra os votos e a porcentagem" : "só a posição"}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {canal === "TOTEM" && (
        <Campo id="categoria-mensagem-telao" rotulo="Mensagem no lugar do QR Code" dica={`Aparece no telão enquanto a votação está aberta. Vazio: "${MENSAGEM_TOTEM_PADRAO}".`}>
          <Input value={valor.mensagemTelao} maxLength={LIMITE_MENSAGEM_TELAO} placeholder={MENSAGEM_TOTEM_PADRAO} onChange={(e) => aoMudar({ mensagemTelao: e.target.value })} />
        </Campo>
      )}
    </fieldset>
  );
}
