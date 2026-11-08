import {
  BadgeCheck,
  ChartColumn,
  Check,
  FileDown,
  Fingerprint,
  Gavel,
  Lock,
  MonitorPlay,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Tablet,
  Trophy,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { TituloDeSecao } from "./TituloDeSecao";

// Seções fixas da landing (07/11/2026): como funciona, recursos, segurança e perguntas. Conteúdo estático, só servidor.

const TEMPOS: { quando: string; titulo: string; icone: LucideIcon; itens: string[] }[] = [
  {
    quando: "Antes",
    titulo: "Monte a votação",
    icone: SlidersHorizontal,
    itens: [
      "Cadastre os candidatos com foto e informações",
      "Defina a janela, os pesos de cada grupo e o desempate",
      "Aplique as cores, o logo e a fonte do evento",
      "Gere os convites do júri e pareie os totens",
    ],
  },
  {
    quando: "Durante",
    titulo: "Abra a urna",
    icone: Vote,
    itens: [
      "O público entra pelo QR Code e vota pelo celular",
      "Os jurados votam ou dão notas por critério",
      "As crianças votam no totem, sem login",
      "A organização acompanha a participação no painel ao vivo",
    ],
  },
  {
    quando: "Depois",
    titulo: "Revele o resultado",
    icone: Trophy,
    itens: [
      "A urna fecha e o resultado oficial é congelado",
      "A revelação sobe ao telão no tempo da cerimônia",
      "Relatório para imprimir e planilhas para conferir",
      "Os dados pessoais são anonimizados no prazo definido",
    ],
  },
];

export function ComoFunciona() {
  return (
    <section id="como-funciona" aria-labelledby="titulo-como-funciona" className="w-full bg-vv-ceu/70">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <TituloDeSecao
          id="titulo-como-funciona"
          rotulo="Como funciona"
          titulo="Uma votação em três tempos"
          texto="A organização conduz cada etapa. Nada abre, fecha ou aparece no telão sem uma decisão sua."
        />
        <ol className="mt-14 grid gap-6 lg:grid-cols-3">
          {TEMPOS.map(({ quando, titulo, icone: Icone, itens }, i) => (
            <li key={quando} className="vv-surgir flex flex-col gap-6 rounded-[2rem] bg-tema-fundo p-7 shadow-sm ring-1 ring-tema-borda sm:p-8">
              <div className="flex items-center justify-between">
                <span aria-hidden className="flex size-12 items-center justify-center rounded-2xl bg-tema-primaria text-tema-sobre-primaria">
                  <Icone className="size-6" />
                </span>
                <span aria-hidden className="text-5xl font-bold tabular-nums text-tema-borda">
                  0{i + 1}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-vv-destaque-texto">{quando}</p>
                <h3 className="mt-1 text-2xl font-bold">{titulo}</h3>
              </div>
              <ul className="flex flex-col gap-3">
                {itens.map((item) => (
                  <li key={item} className="flex gap-3 text-tema-texto-suave">
                    <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-vv-destaque-texto" />
                    {item}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const JEITOS: { icone: LucideIcon; quem: string; como: string; texto: string; etapas: string[] }[] = [
  {
    icone: Smartphone,
    quem: "Público",
    como: "Pelo celular",
    texto:
      "Aponta a câmera para o QR Code, entra com Google ou e-mail verificado, revisa a escolha e confirma. Um voto por pessoa, sigiloso e definitivo.",
    etapas: ["QR Code", "Login", "Revisão", "Confirmado"],
  },
  {
    icone: Gavel,
    quem: "Júri",
    como: "Por convite",
    texto:
      "Cada jurado recebe um convite de uso único. Você escolhe o formato: voto único, notas por critério ou o melhor em cada critério. O jurado pode rever o voto enquanto a urna estiver aberta.",
    etapas: ["Convite", "Avaliação", "Revisão até o fim"],
  },
  {
    icone: Tablet,
    quem: "Crianças",
    como: "No totem",
    texto: "Tablets pareados em modo quiosque: um toque no favorito e pronto. Sem login, sem dados pessoais, e a saída do modo é protegida por PIN.",
    etapas: ["Toque", "Confirmação", "Próxima criança"],
  },
];

// A identidade visual ("A cara do seu evento") tem seção própria: VitrineIdentidade.
const EXTRAS: { icone: LucideIcon; titulo: string; texto: string }[] = [
  {
    icone: ChartColumn,
    titulo: "Painel ao vivo",
    texto: "Participação e votos por minuto em tempo real, sem revelar a parcial de cada candidato.",
  },
  {
    icone: MonitorPlay,
    titulo: "Revelação no telão",
    texto: "Trailer, categorias, desempate e pódio, no ritmo que a organização conduzir.",
  },
  {
    icone: FileDown,
    titulo: "Relatório e planilhas",
    texto: "O resultado oficial vira relatório para imprimir e arquivos CSV para conferir.",
  },
];

/** Pesos de exemplo do placar (ilustração): público, júri, crianças. */
const PESOS_EXEMPLO = [
  { grupo: "Público", peso: 60, cor: "var(--tema-primaria)", classe: "bg-tema-primaria" },
  { grupo: "Júri", peso: 30, cor: "var(--vv-destaque)", classe: "bg-vv-destaque" },
  { grupo: "Crianças", peso: 10, cor: "var(--tema-secundaria)", classe: "bg-tema-secundaria" },
];

function fatiasDoPlacar(): string {
  let inicio = 0;
  const fatias = PESOS_EXEMPLO.map(({ peso, cor }) => {
    const fim = inicio + peso;
    const fatia = `${cor} ${inicio}% ${fim}%`;
    inicio = fim;
    return fatia;
  });
  return `conic-gradient(${fatias.join(", ")})`;
}

export function Recursos() {
  return (
    <section id="recursos" aria-labelledby="titulo-recursos" className="w-full bg-tema-fundo">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <TituloDeSecao
          id="titulo-recursos"
          rotulo="Recursos"
          titulo="Três jeitos de votar, uma apuração só"
          texto="Cada grupo vota do jeito que faz sentido para ele. No fim, tudo entra no mesmo placar."
        />

        <ul className="mt-14 grid gap-6 lg:grid-cols-3">
          {JEITOS.map(({ icone: Icone, quem, como, texto, etapas }) => (
            <li key={quem} className="vv-surgir flex flex-col gap-5 rounded-[2rem] bg-tema-superficie p-7 sm:p-8">
              <span aria-hidden className="flex size-14 items-center justify-center rounded-2xl bg-tema-fundo text-vv-destaque-texto shadow-sm">
                <Icone className="size-7" />
              </span>
              <div>
                <h3 className="text-2xl font-bold">{quem}</h3>
                <p className="font-semibold text-vv-destaque-texto">{como}</p>
              </div>
              <p className="leading-relaxed text-tema-texto-suave">{texto}</p>
              <ol aria-label={`Etapas do voto: ${quem.toLocaleLowerCase("pt-BR")}`} className="mt-auto flex flex-wrap gap-1.5 pt-2 text-xs font-semibold">
                {etapas.map((etapa, i) => (
                  <li
                    key={etapa}
                    className={
                      i === etapas.length - 1
                        ? "rounded-full bg-tema-primaria px-3 py-1.5 text-tema-sobre-primaria"
                        : "rounded-full bg-tema-fundo px-3 py-1.5 ring-1 ring-tema-borda"
                    }
                  >
                    {etapa}
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>

        <div className="vv-surgir mt-6 grid items-center gap-8 rounded-[2rem] p-7 ring-1 ring-tema-borda sm:p-10 md:grid-cols-[auto_minmax(0,1fr)] md:gap-12">
          <div aria-hidden className="relative mx-auto size-40 rounded-full sm:size-44" style={{ backgroundImage: fatiasDoPlacar() }}>
            <span className="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-tema-fundo text-center">
              <span className="text-3xl font-bold">100</span>
              <span className="text-xs font-semibold text-tema-texto-suave">pontos</span>
            </span>
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="text-2xl font-bold">Placar ponderado</h3>
            <p className="max-w-2xl leading-relaxed text-tema-texto-suave">
              Você decide quanto vale cada grupo. Os votos de cada um são normalizados antes de receber o peso, então um público
              grande não apaga o voto do júri. O critério de desempate também é seu.
            </p>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
              {PESOS_EXEMPLO.map(({ grupo, peso, classe }) => (
                <li key={grupo} className="flex items-center gap-2">
                  <span aria-hidden className={`size-3 rounded-full ${classe}`} />
                  {grupo} {peso}%
                </li>
              ))}
              <li className="font-normal text-tema-texto-suave">(exemplo)</li>
            </ul>
          </div>
        </div>

        <ul className="mt-6 grid gap-6 md:grid-cols-3">
          {EXTRAS.map(({ icone: Icone, titulo, texto }) => (
            <li key={titulo} className="vv-surgir flex flex-col gap-3 rounded-[1.5rem] p-6 ring-1 ring-tema-borda">
              <Icone aria-hidden className="size-6 text-vv-destaque-texto" />
              <h3 className="text-lg font-bold">{titulo}</h3>
              <p className="text-sm leading-relaxed text-tema-texto-suave">{texto}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const GARANTIAS: { icone: LucideIcon; titulo: string; texto: string }[] = [
  {
    icone: Fingerprint,
    titulo: "Um voto por pessoa",
    texto: "Garantido pelo banco de dados, inclusive com muita gente votando ao mesmo tempo. Não depende de um botão desligado.",
  },
  {
    icone: Lock,
    titulo: "Voto secreto",
    texto: "O voto do público não fica ligado a quem votou. O do jurado é identificado só para a organização, e ele é avisado.",
  },
  {
    icone: BadgeCheck,
    titulo: "Resultado congelado",
    texto: "Calculado no encerramento da urna, sem recálculo depois. Telão, painel e relatório leem exatamente o mesmo resultado.",
  },
  {
    icone: ShieldCheck,
    titulo: "Privacidade (LGPD)",
    texto: "Só nome e e-mail. Depois do evento, no prazo que a organização definir, os dois são anonimizados.",
  },
];

export function Seguranca() {
  return (
    <section id="seguranca" aria-labelledby="titulo-seguranca" className="w-full bg-tema-fundo">
      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
        <div className="vv-surgir grid gap-10 rounded-[2.5rem] bg-vv-noite p-7 text-white [--tema-foco:#ffffff] sm:p-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          <div className="flex flex-col gap-4">
            <p className="inline-flex items-center gap-3 text-sm font-bold uppercase tracking-[0.18em] text-vv-destaque-claro">
              <span aria-hidden className="h-0.5 w-8 rounded-full bg-current" />
              Segurança
            </p>
            <h2 id="titulo-seguranca" className="text-balance text-3xl font-bold tracking-tight sm:text-[2.625rem] sm:leading-[1.1]">
              Uma votação em que dá para confiar
            </h2>
            <p className="text-pretty text-lg leading-relaxed text-white/85">
              As regras valem no servidor, não só na tela. Ninguém vota duas vezes, e ninguém mexe no resultado depois que a
              urna fecha.
            </p>
            <p className="mt-auto pt-4 text-sm leading-relaxed text-white/75">
              Por baixo: convites, tokens de aparelho e PINs guardados só como hash, limite de tentativas no login e no voto, e
              auditoria de cada ação da organização.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {GARANTIAS.map(({ icone: Icone, titulo, texto }) => (
              <li key={titulo} className="flex flex-col gap-3 rounded-3xl bg-white/10 p-5 ring-1 ring-white/15">
                <span aria-hidden className="flex size-10 items-center justify-center rounded-xl bg-tema-secundaria text-tema-sobre-secundaria">
                  <Icone className="size-5" />
                </span>
                <h3 className="text-lg font-bold">{titulo}</h3>
                <p className="text-sm leading-relaxed text-white/80">{texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

const PERGUNTAS: { pergunta: string; resposta: string }[] = [
  {
    pergunta: "Preciso instalar algum aplicativo?",
    resposta: "Não. O público vota pelo navegador do celular, a partir do QR Code ou do link do evento.",
  },
  {
    pergunta: "Dá para votar mais de uma vez?",
    resposta:
      "Não. Cada pessoa tem um voto por evento, e o banco de dados garante isso mesmo quando muita gente vota ao mesmo tempo. Só o jurado pode rever o próprio voto, e só enquanto a urna estiver aberta.",
  },
  {
    pergunta: "Alguém fica sabendo em quem eu votei?",
    resposta:
      "O voto do público não fica ligado ao nome de quem votou. O voto do jurado é identificado apenas para a organização do evento, e o jurado é avisado disso antes de votar.",
  },
  {
    pergunta: "Quando sai o resultado?",
    resposta:
      "Quando a organização encerra a urna, o resultado oficial é calculado e congelado. Ele sobe ao telão no momento que a organização escolher e aparece nesta página depois que o evento é concluído.",
  },
  {
    pergunta: "O que acontece com os meus dados?",
    resposta:
      "Pedimos só nome e e-mail, para garantir um voto por pessoa. Depois do evento, no prazo que a organização definir, nome e e-mail são anonimizados.",
  },
  {
    pergunta: "A página fica com a cara do meu evento?",
    resposta:
      "Fica. Cores, logo, fonte e o nome dado aos candidatos (filme, projeto, música) são os do evento, e o contraste das cores é conferido automaticamente.",
  },
];

export function Perguntas() {
  return (
    <section id="perguntas" aria-labelledby="titulo-perguntas" className="w-full border-t border-tema-borda bg-tema-fundo">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <TituloDeSecao
          id="titulo-perguntas"
          rotulo="Perguntas"
          titulo="O que todo mundo pergunta antes de votar"
          texto="Respostas curtas para quem vota e para quem organiza."
        />
        <div className="vv-surgir flex flex-col divide-y divide-tema-borda border-y border-tema-borda">
          {PERGUNTAS.map(({ pergunta, resposta }) => (
            <details key={pergunta} className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                {pergunta}
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-tema-superficie transition-transform duration-300 group-open:rotate-45"
                >
                  <Plus className="size-4" />
                </span>
              </summary>
              <p className="pb-6 pr-12 leading-relaxed text-tema-texto-suave">{resposta}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
