"use client";

import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Carregando } from "@/components/ui/Carregando";
import { formatarDataHora, paraMs } from "@/lib/tempo";
import { useConsulta } from "@/lib/useConsulta";
import { obterVotosJuri } from "@/servicos/dashboard";

// Etapa 7 (5.6 bloco 9, D8, C15): fechada por padrão; abrir não é auditado (exportar é). Só depois do
// encerramento (o serviço recusa antes). Estado local: volta a fechar ao sair da tela.

export function VotosJuriTable({
  eventoId,
  versao,
  titulo,
  fuso,
}: {
  eventoId: string;
  versao: number;
  titulo: (id: string) => string;
  fuso: string;
}) {
  const [aberta, setAberta] = useState(false);
  const consulta = useConsulta(() => obterVotosJuri(eventoId), { ativo: aberta, chave: `${eventoId}:${versao}` });
  const data = (instante: string) => formatarDataHora(paraMs(instante), fuso);

  return (
    <section aria-labelledby="votos-juri" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="votos-juri" className="text-lg font-bold">
          Votos do júri
        </h3>
        <Botao variante="contorno" tamanho="pequeno" aria-expanded={aberta} onClick={() => setAberta((v) => !v)}>
          {aberta ? "Ocultar votos do júri" : "Mostrar votos do júri"}
        </Botao>
      </div>
      <p className="inline-flex items-start gap-2 text-sm text-tema-texto-suave">
        <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
        Estes votos são identificados e só a organização os vê. A exportação deste arquivo fica registrada na auditoria.
      </p>
      {aberta &&
        (consulta.dados ? (
          <div className="overflow-x-auto rounded-xl border border-tema-borda">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <caption className="sr-only">Votos identificados do júri</caption>
              <thead className="bg-tema-fundo">
                <tr className="border-b border-tema-borda">
                  <th scope="col" className="px-3 py-2 font-semibold">Jurado</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Escolha</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Atualizado em</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Histórico</th>
                </tr>
              </thead>
              <tbody>
                {consulta.dados.jurados.map((j, i) => (
                  <tr key={`${j.rotulo}-${i}`} className="border-b border-tema-borda last:border-0 align-top">
                    <th scope="row" className="px-3 py-2 font-normal">
                      <span className="block font-semibold">{j.nome}</span>
                      {j.rotulo && <span className="block text-xs text-tema-texto-suave">{j.rotulo}</span>}
                    </th>
                    <td className="px-3 py-2">{j.candidatoId ? titulo(j.candidatoId) : "Pendente"}</td>
                    <td className="px-3 py-2">{j.atualizadoEm ? data(j.atualizadoEm) : "—"}</td>
                    <td className="px-3 py-2">
                      {j.historico.length > 1 ? (
                        <details>
                          <summary className="cursor-pointer">{j.historico.length - 1} alteração(ões)</summary>
                          <ol className="mt-1 flex flex-col gap-1 text-xs">
                            {j.historico.map((h, k) => (
                              <li key={k}>
                                {data(h.em)}: {h.candidatoAnteriorId ? `${titulo(h.candidatoAnteriorId)} → ` : ""}
                                {titulo(h.candidatoId)}
                              </li>
                            ))}
                          </ol>
                        </details>
                      ) : j.historico.length === 1 ? (
                        "Sem alterações"
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : consulta.erro ? (
          <Alerta variante="erro">{consulta.erro.mensagem}</Alerta>
        ) : (
          <Carregando />
        ))}
    </section>
  );
}
