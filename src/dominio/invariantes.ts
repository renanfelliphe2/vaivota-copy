import type { DadosResultado, EstadoApp } from "./tipos";

/**
 * Invariante 7, segunda parte ("urna ENCERRADA tem ao menos um resultado"): ligada pela Etapa 7,
 * agora que congelarResultado grava a versão.
 */
export const EXIGIR_RESULTADO_NA_URNA_ENCERRADA = true;

/** Devolve a lista de violações (vazia = estado consistente). Etapa 0, seção 5.7. */
export function verificarInvariantes(estado: EstadoApp): string[] {
  const { banco } = estado;
  const erros: string[] = [];

  // 1. Slugs únicos; uma participação por (usuarioId, eventoId).
  const slugs = new Set<string>();
  for (const evento of banco.eventos) {
    if (slugs.has(evento.slug)) erros.push(`1: slug duplicado "${evento.slug}"`);
    slugs.add(evento.slug);
  }
  const pares = new Set<string>();
  for (const p of banco.participacoes) {
    const chave = `${p.usuarioId}:${p.eventoId}`;
    if (pares.has(chave)) erros.push(`1: participação duplicada ${chave}`);
    pares.add(chave);
  }

  const candidatoPorId = new Map(banco.candidatos.map((c) => [c.id, c]));
  const participacaoPorId = new Map(banco.participacoes.map((p) => [p.id, p]));

  for (const evento of banco.eventos) {
    // 2. Pesos configurados somam 100; módulo desligado tem peso 0.
    const placar = banco.configsPlacar.find((c) => c.eventoId === evento.id);
    if (!placar) {
      erros.push(`2: ${evento.slug} sem ConfigPlacar`);
    } else {
      const soma = placar.pesoPopular + placar.pesoJuri + placar.pesoInfantil;
      if (soma !== 100) erros.push(`2: ${evento.slug} pesos somam ${soma}`);
      if (!evento.moduloJuri && placar.pesoJuri !== 0) erros.push(`2: ${evento.slug} júri desligado com peso ${placar.pesoJuri}`);
      if (!evento.moduloInfantil && placar.pesoInfantil !== 0)
        erros.push(`2: ${evento.slug} infantil desligado com peso ${placar.pesoInfantil}`);
      const pesos = [placar.pesoPopular, placar.pesoJuri, placar.pesoInfantil];
      if (pesos.some((p) => !Number.isInteger(p) || p < 0)) erros.push(`2: ${evento.slug} peso não inteiro ou negativo`);
    }

    const participacoes = banco.participacoes.filter((p) => p.eventoId === evento.id);

    // 3. Nº de Voto = nº de participações PUBLICO com votou.
    const votos = banco.votos.filter((v) => v.eventoId === evento.id).length;
    const publicosVotaram = participacoes.filter((p) => p.papel === "PUBLICO" && p.votou).length;
    if (votos !== publicosVotaram) erros.push(`3: ${evento.slug} tem ${votos} votos e ${publicosVotaram} públicos que votaram`);

    // 4. Nº de VotoJuri = nº de participações JURADO com votou.
    const votosJuri = banco.votosJuri.filter((v) => v.eventoId === evento.id).length;
    const juradosVotaram = participacoes.filter((p) => p.papel === "JURADO" && p.votou).length;
    if (votosJuri !== juradosVotaram)
      erros.push(`4: ${evento.slug} tem ${votosJuri} votos do júri e ${juradosVotaram} jurados que votaram`);

    // 7. Resultados com versão única e sequencial.
    const versoes = banco.resultados
      .filter((r) => r.eventoId === evento.id)
      .map((r) => r.versao)
      .sort((a, b) => a - b);
    versoes.forEach((v, i) => {
      if (v !== i + 1) erros.push(`7: ${evento.slug} versões de resultado fora de sequência (${versoes.join(", ")})`);
    });
    if (EXIGIR_RESULTADO_NA_URNA_ENCERRADA && evento.estadoUrna === "ENCERRADA" && versoes.length === 0)
      erros.push(`7: ${evento.slug} urna encerrada sem resultado`);
  }

  // 4 (cont.). Cada VotoJuri tem ao menos 1 entrada de histórico.
  for (const vj of banco.votosJuri) {
    if (!banco.historicoVotosJuri.some((h) => h.votoJuriId === vj.id)) erros.push(`4: voto do júri ${vj.id} sem histórico`);
  }

  // 5. Todo voto aponta para candidato do mesmo evento (inclui histórico do júri).
  const mesmoEvento = (candidatoId: string | null, eventoId: string) =>
    candidatoId === null || candidatoPorId.get(candidatoId)?.eventoId === eventoId;
  for (const v of banco.votos)
    if (!mesmoEvento(v.candidatoId, v.eventoId)) erros.push(`5: voto ${v.id} aponta para candidato de outro evento`);
  for (const v of banco.votosInfantis)
    if (!mesmoEvento(v.candidatoId, v.eventoId)) erros.push(`5: voto infantil ${v.id} aponta para candidato de outro evento`);
  for (const vj of banco.votosJuri) {
    if (!mesmoEvento(vj.candidatoId, vj.eventoId)) erros.push(`5: voto do júri ${vj.id} aponta para candidato de outro evento`);
    if (participacaoPorId.get(vj.participacaoId)?.eventoId !== vj.eventoId)
      erros.push(`5: voto do júri ${vj.id} aponta para participação de outro evento`);
  }
  for (const h of banco.historicoVotosJuri) {
    const vj = banco.votosJuri.find((v) => v.id === h.votoJuriId);
    if (!vj) {
      erros.push(`5: histórico ${h.id} sem voto do júri`);
      continue;
    }
    if (!mesmoEvento(h.candidatoAnteriorId, vj.eventoId) || !mesmoEvento(h.candidatoNovoId, vj.eventoId))
      erros.push(`5: histórico ${h.id} aponta para candidato de outro evento`);
  }

  // 6. Convite USADO tem participacaoId de uma participação JURADO do mesmo evento.
  for (const c of banco.convitesJurado) {
    if (c.estado !== "USADO") continue;
    const p = c.participacaoId ? participacaoPorId.get(c.participacaoId) : undefined;
    if (!p || p.papel !== "JURADO" || p.eventoId !== c.eventoId)
      erros.push(`6: convite ${c.id} usado sem participação JURADO do mesmo evento`);
  }

  // 8. Candidato publicado tem imagem (rev. 3, C5).
  for (const c of banco.candidatos) {
    if (c.publicado && !c.imagemUrl) erros.push(`8: candidato publicado ${c.id} sem imagem`);
  }

  // 9. Apuração (I8 da Etapa 7; aqui 9 porque a 8 já é a da imagem), para cada versão do resultado.
  for (const r of banco.resultados) erros.push(...conferirDadosResultado(r.dados).map((e) => `9: ${r.id} ${e}`));

  return erros;
}

/** Tolerância por parcela da soma (cada parcela é arredondada a 6 casas). */
const TOLERANCIA = 1e-6;

/** Soma dos placares = totais; pontuações e pesos efetivos somam 100 (ou 0); posições 1, 1, 3. */
export function conferirDadosResultado(dados: DadosResultado): string[] {
  const erros: string[] = [];
  const grupos = dados.categorias.map((c) => c.grupo);
  for (const g of grupos) {
    const soma = dados.placares[g].reduce((s, p) => s + p.votos, 0);
    if (soma !== dados.totais[g]) erros.push(`placar ${g} soma ${soma} e total ${dados.totais[g]}`);
  }
  const somaPesos = grupos.reduce((s, g) => s + dados.pesosEfetivos[g], 0);
  const esperado = somaPesos > TOLERANCIA ? 100 : 0;
  if (Math.abs(somaPesos - esperado) > TOLERANCIA) erros.push(`pesos efetivos somam ${somaPesos}`);
  const somaPontos = dados.ranking.reduce((s, item) => s + item.pontuacao, 0);
  const temPontos = esperado === 100 && dados.ranking.length > 0 && grupos.some((g) => dados.pesosEfetivos[g] > 0);
  const tolerancia = TOLERANCIA * Math.max(1, dados.ranking.length * grupos.length);
  if (Math.abs(somaPontos - (temPontos ? 100 : 0)) > tolerancia) erros.push(`pontuações somam ${somaPontos}`);
  dados.ranking.forEach((item, i) => {
    const soma = grupos.reduce((s, g) => s + item.pontosPorGrupo[g], 0);
    if (Math.abs(soma - item.pontuacao) > TOLERANCIA) erros.push(`${item.candidatoId} pontos por grupo somam ${soma}`);
    const anterior = dados.ranking[i - 1];
    const ok = i === 0 ? item.posicao === 1 : item.posicao === anterior.posicao || item.posicao === i + 1;
    if (!ok) erros.push(`posição ${item.posicao} fora da regra 1, 1, 3`);
  });
  return erros;
}
