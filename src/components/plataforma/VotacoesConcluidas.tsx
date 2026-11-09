import { ArrowRight, CalendarCheck, MapPin, Trophy, Users, Vote, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { gruposDaVotacao, type VotacaoComResultado } from "@/dominio/votacoesEncerradas";
import { cx } from "@/lib/classes";
import { formatarNumero } from "@/lib/formatar";
import { formatarData } from "@/lib/tempo";
import { MarcaDoEvento } from "./MarcaDoEvento";
import { TituloDeSecao } from "./TituloDeSecao";

/**
 * Resultados das votações concluídas (07/11/2026): participantes, votos e vencedor de cada evento, na ordem do mais
 * recente. Componente de servidor; os dados vêm de src/server/votacoesEncerradas.ts (só eventos concluídos chegam aqui). Com um número ímpar de votações, a
 * mais recente ocupa a linha inteira (imagem do vencedor de um lado, números do outro); as demais vão em pares.
 */
export function VotacoesConcluidas({ votacoes }: { votacoes: VotacaoComResultado[] }) {
  const destacarPrimeira = votacoes.length % 2 === 1;
  return (
    // Foco branco sobre o palco; dentro dos cartões (claros) volta ao marinho.
    <section id="resultados" aria-labelledby="titulo-resultados" className="vv-palco relative isolate w-full overflow-clip text-white [--tema-foco:#ffffff]">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <TituloDeSecao
          id="titulo-resultados"
          rotulo="Resultados oficiais"
          titulo="Votações que já aconteceram"
          texto="Quantas pessoas participaram, quantos votos entraram na urna e quem venceu cada evento concluído na VaiVota. Tudo sai do resultado oficial, congelado no encerramento da urna."
          sobreEscuro
        />
        <ul className="mt-12 grid gap-6 lg:grid-cols-2">
          {votacoes.map((votacao, i) => (
            <li key={votacao.eventoId} className={cx("vv-surgir", destacarPrimeira && i === 0 && "lg:col-span-2")}>
              <CartaoVotacao votacao={votacao} destaque={destacarPrimeira && i === 0} />
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-3xl text-sm leading-relaxed text-white/75">
          Participantes são as pessoas inscritas na votação, do público e do júri. Os votos somam o público, o júri e o totem
          infantil, nos eventos que usam esses módulos. Um evento só aparece aqui depois que a organização o conclui.
        </p>
      </div>
    </section>
  );
}

function CartaoVotacao({ votacao, destaque }: { votacao: VotacaoComResultado; destaque: boolean }) {
  const { slug, nome, local, tema, vencedores, rotuloCandidato } = votacao;
  const tituloId = `votacao-${slug}`;
  const grupos = gruposDaVotacao(votacao);
  const porCategoria = votacao.vencedoresPorCategoria?.length ? votacao.vencedoresPorCategoria : null;
  const empate = vencedores.length > 1;

  return (
    <article
      aria-labelledby={tituloId}
      className={cx(
        "relative grid h-full overflow-hidden rounded-[2rem] bg-tema-fundo text-tema-texto shadow-2xl shadow-black/40 [--tema-foco:var(--tema-texto)]",
        destaque && "lg:grid-cols-2",
      )}
    >
      {/* Faixa com as cores do evento: cada resultado guarda a identidade de quem organizou. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 z-10 h-1.5"
        style={{ backgroundImage: `linear-gradient(90deg, ${tema.corPrimaria}, ${tema.corSecundaria})` }}
      />
      <VitrineDoVencedor votacao={votacao} destaque={destaque} />

      <div className="flex flex-col gap-6 p-6 sm:p-8">
        <header className="flex items-center gap-4">
          <MarcaDoEvento nome={nome} corPrimaria={tema.corPrimaria} logoUrl={tema.logoUrl} />
          <div className="min-w-0">
            <h3 id={tituloId} className="text-xl font-bold leading-tight sm:text-2xl">
              {nome}
            </h3>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-tema-texto-suave">
              <span className="inline-flex items-center gap-1.5">
                <CalendarCheck aria-hidden className="size-4 shrink-0" />
                Concluída em {formatarData(votacao.concluidaEmMs, votacao.fusoHorario)}
              </span>
              {local && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin aria-hidden className="size-4 shrink-0" />
                  {local}
                </span>
              )}
            </p>
          </div>
        </header>

        <div className="rounded-2xl bg-vv-secundaria-clara p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em]">
            <Trophy aria-hidden className="size-4 text-tema-secundaria-texto" />
            {porCategoria ? "Vencedores por categoria" : empate ? "Empate no 1º lugar" : "Vencedor"}
          </p>
          {porCategoria ? (
            // Evento com categorias (09/11/2026): o primeiro lugar de cada uma.
            <ul className="mt-3 flex flex-col gap-3">
              {porCategoria.map((c) => (
                <li key={c.categoria}>
                  <p className="text-sm text-tema-texto-suave">{c.categoria}</p>
                  <p className="text-lg font-bold leading-tight">
                    {c.vencedores.length > 0 ? c.vencedores.map((v) => v.titulo).join(" e ") : "Nenhum voto válido"}
                  </p>
                </li>
              ))}
            </ul>
          ) : vencedores.length > 0 ? (
            <>
              <p className="mt-2 text-balance text-2xl font-bold leading-tight sm:text-[1.75rem]">
                {vencedores.map((v) => v.titulo).join(" e ")}
              </p>
              <p className="mt-1 text-sm text-tema-texto-suave">{rotuloCandidato}</p>
            </>
          ) : (
            <p className="mt-2 text-lg font-semibold">Nenhum voto válido nesta votação</p>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-3">
          <Numero icone={Users} rotulo="Participantes" valor={votacao.participantes} />
          <Numero icone={Vote} rotulo="Votos" valor={votacao.votos.total} />
        </dl>

        {grupos.length > 1 && (
          <ul aria-label="Votos por grupo" className="-mt-2 flex flex-wrap gap-2 text-sm">
            {grupos.map((g) => (
              <li key={g.rotulo} className="rounded-full bg-tema-superficie px-3 py-1">
                <span className="text-tema-texto-suave">{g.rotulo}</span> <strong className="tabular-nums">{formatarNumero(g.votos)}</strong>
              </li>
            ))}
          </ul>
        )}

        <Link
          href={`/e/${slug}`}
          className="group mt-auto inline-flex min-h-11 items-center gap-1.5 self-start font-semibold text-tema-primaria-texto underline-offset-4 hover:underline"
        >
          Ver a página do evento
          <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </article>
  );
}

function Numero({ icone: Icone, rotulo, valor }: { icone: LucideIcon; rotulo: string; valor: number }) {
  return (
    // Número em cima, rótulo embaixo, sem trocar a ordem de leitura (dt antes de dd).
    <div className="flex flex-col-reverse gap-1 rounded-2xl p-4 ring-1 ring-tema-borda">
      <dt className="flex items-center gap-1.5 text-sm font-medium text-tema-texto-suave">
        <Icone aria-hidden className="size-4 text-vv-destaque-texto" />
        {rotulo}
      </dt>
      <dd className="text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">{formatarNumero(valor)}</dd>
    </div>
  );
}

/** Imagem do vencedor (ou das duas primeiras, num empate) com o selo de 1º lugar. */
function VitrineDoVencedor({ votacao, destaque }: { votacao: VotacaoComResultado; destaque: boolean }) {
  const imagens = votacao.vencedores.slice(0, 2);
  // No destaque, a imagem preenche a altura da coluna no desktop; no celular, mantém a proporção.
  const preencher = destaque ? "lg:absolute lg:inset-0 lg:aspect-auto lg:h-full" : undefined;
  const largura = destaque ? "(min-width: 1024px) 576px, 100vw" : "(min-width: 1024px) 560px, 100vw";

  return (
    <div className={cx("relative bg-tema-superficie", destaque && "lg:min-h-[26rem]")}>
      {imagens.length === 0 ? (
        <div className={cx("flex aspect-video items-center justify-center text-tema-texto-suave", preencher)}>
          <Trophy aria-hidden className="size-16 opacity-40" />
        </div>
      ) : imagens.length === 1 ? (
        <ImagemCandidato titulo={imagens[0].titulo} imagemUrl={imagens[0].imagemUrl} proporcao="16/9" className={preencher} sizes={largura} />
      ) : (
        <div className={cx("grid grid-cols-2 gap-0.5", destaque && "lg:absolute lg:inset-0")}>
          {imagens.map((c) => (
            <ImagemCandidato
              key={c.id}
              titulo={c.titulo}
              imagemUrl={c.imagemUrl}
              proporcao="1/1"
              className={destaque ? "lg:aspect-auto lg:h-full" : undefined}
              sizes={destaque ? "(min-width: 1024px) 288px, 50vw" : "(min-width: 1024px) 280px, 50vw"}
            />
          ))}
        </div>
      )}
      <span className="absolute left-4 top-5 inline-flex items-center gap-1.5 rounded-full bg-tema-secundaria px-3.5 py-1.5 text-sm font-bold text-tema-sobre-secundaria shadow-lg">
        <Trophy aria-hidden className="size-4" />
        1º lugar
      </span>
    </div>
  );
}
