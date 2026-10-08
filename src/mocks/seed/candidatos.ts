import type { Candidato } from "@/dominio/tipos";
import { ID_FESTIVAL, ID_SEMANA_TECH } from "./eventos";

// Casos de borda (Etapa 0, seção 5.6). Títulos e descrições fictícios; imagens por D16.
// Semana Tech: 01–08 votáveis; 09 rascunho sem imagem; 10 desqualificado; 06 título longo; 07 descrição curta;
//              08 vinculado a Gabi; 02 sem `tecnologias`.
// Festival:    01–06 votáveis; 07 rascunho sem imagem; 08 desqualificado; 05 título longo; 06 descrição curta;
//              03 vinculado a Gabi; 02 sem `duracao`.

const CRIADO_ST = "2026-09-20T10:00:00-03:00";
const CRIADO_FV = "2026-09-25T10:00:00-03:00";

type Base = Pick<Candidato, "id" | "titulo" | "descricao" | "imagemUrl" | "camposExtras"> &
  Partial<Pick<Candidato, "publicado" | "desqualificado" | "usuarioVinculadoId">>;

function candidato(eventoId: string, criadoEm: string, ordem: number, base: Base): Candidato {
  return {
    eventoId,
    publicado: true,
    desqualificado: false,
    usuarioVinculadoId: null,
    ordem,
    criadoEm,
    atualizadoEm: criadoEm,
    ...base,
  };
}

const semanaTech: Base[] = [
  {
    id: "cand-st-01",
    titulo: "HortaBot",
    descricao:
      "Sensor de umidade de baixo custo que avisa pelo celular quando a horta da escola precisa de água. Montado com sucata eletrônica e um microcontrolador.",
    imagemUrl: "placeholder:1",
    camposExtras: { equipe: "Lia, Caio e Rafa", tecnologias: "Arduino, MQTT" },
  },
  {
    id: "cand-st-02",
    titulo: "Rota Segura",
    descricao:
      "Mapa colaborativo de calçadas e travessias acessíveis da cidade, alimentado por quem anda a pé ou de cadeira de rodas.",
    imagemUrl: "placeholder:2",
    camposExtras: { equipe: "Bia e Thiago" }, // sem `tecnologias`
  },
  {
    id: "cand-st-03",
    titulo: "Libras na Mão",
    descricao: "Aplicativo que ensina os sinais básicos de Libras com vídeos curtos e exercícios diários.",
    imagemUrl: "placeholder:3",
    camposExtras: { equipe: "Duda, Pedro e Nina", tecnologias: "React Native" },
  },
  {
    id: "cand-st-04",
    titulo: "Energia Viva",
    descricao:
      "Painel que mostra em tempo real o consumo de energia das salas de aula e sugere economias simples para cada turma.",
    imagemUrl: "placeholder:4",
    camposExtras: { equipe: "Marcos e Júlia", tecnologias: "Python, Grafana" },
  },
  {
    id: "cand-st-05",
    titulo: "Biblioteca Livre",
    descricao: "Sistema de empréstimo de livros entre estudantes, com fila de espera e lembretes de devolução.",
    imagemUrl: "placeholder:5",
    camposExtras: { equipe: "Ana Clara", tecnologias: "Next.js, SQLite" },
  },
  {
    id: "cand-st-06",
    titulo:
      "Plataforma integrada de monitoramento comunitário da qualidade do ar com sensores de baixo custo instalados nas escolas públicas da região",
    descricao:
      "Rede de sensores instalados em cinco escolas que publica dados abertos sobre a qualidade do ar e alerta a comunidade em dias críticos.",
    imagemUrl: "placeholder:6",
    camposExtras: { equipe: "Coletivo Ar Limpo", tecnologias: "ESP32, LoRa, PostgreSQL" },
  },
  {
    id: "cand-st-07",
    titulo: "Quiz da Cidade",
    descricao: "Jogo de perguntas sobre a história local.",
    imagemUrl: "placeholder:7",
    camposExtras: { equipe: "Gui e Lara", tecnologias: "Godot" },
  },
  {
    id: "cand-st-08",
    titulo: "Feira Conecta",
    descricao: "Catálogo digital dos produtores da feira municipal, com pedidos por mensagem e retirada no sábado.",
    imagemUrl: "placeholder:8",
    camposExtras: { equipe: "Gabi Torres e Leo", tecnologias: "Flutter" },
    usuarioVinculadoId: "usr-gabi",
  },
  {
    id: "cand-st-09",
    titulo: "Robô Recicla",
    descricao: "Protótipo de braço robótico que separa recicláveis por cor. Ainda em ajustes.",
    imagemUrl: null, // rascunho sem imagem (rev. 3, C5)
    camposExtras: { equipe: "Turma 2B", tecnologias: "Visão computacional" },
    publicado: false,
  },
  {
    id: "cand-st-10",
    titulo: "Agenda Escolar",
    descricao: "Aplicativo de agenda compartilhada entre professores e famílias.",
    imagemUrl: "placeholder:10",
    camposExtras: { equipe: "Equipe Agenda", tecnologias: "Kotlin" },
    desqualificado: true,
  },
];

const festival: Base[] = [
  {
    id: "cand-fv-01",
    titulo: "O Último Trem de Cataguases",
    descricao:
      "Um maquinista aposentado reencontra os passageiros da última viagem da linha que atravessava a cidade.",
    imagemUrl: "placeholder:1",
    camposExtras: { direcao: "Helena Prado", duracao: "14 min" },
  },
  {
    id: "cand-fv-02",
    titulo: "Quintal",
    descricao: "Três irmãs disputam a memória de uma mangueira centenária no quintal da casa da avó.",
    imagemUrl: "placeholder:2",
    camposExtras: { direcao: "Rui Andrade" }, // sem `duracao`
  },
  {
    id: "cand-fv-03",
    titulo: "Rádio Pirata",
    descricao: "Adolescentes montam uma rádio clandestina para narrar o campeonato de futebol do bairro.",
    imagemUrl: "placeholder:3",
    camposExtras: { direcao: "Gabi Torres", duracao: "11 min" },
    usuarioVinculadoId: "usr-gabi",
  },
  {
    id: "cand-fv-04",
    titulo: "Sal",
    descricao: "Documentário sobre as últimas salineiras do litoral norte e o ofício que passa de mãe para filha.",
    imagemUrl: "placeholder:4",
    camposExtras: { direcao: "Coletivo Maré", duracao: "19 min" },
  },
  {
    id: "cand-fv-05",
    titulo:
      "Tudo aquilo que a gente não disse no caminho de volta para casa depois da festa de formatura da turma de mil novecentos e noventa e nove",
    descricao:
      "Vinte e cinco anos depois, dois amigos refazem a pé o trajeto da noite da formatura e acertam as contas com o passado.",
    imagemUrl: "placeholder:5",
    camposExtras: { direcao: "Marcos Vale", duracao: "22 min" },
  },
  {
    id: "cand-fv-06",
    titulo: "Lanterna",
    descricao: "Animação em stop-motion.",
    imagemUrl: "placeholder:6",
    camposExtras: { direcao: "Estúdio Vagalume", duracao: "7 min" },
  },
  {
    id: "cand-fv-07",
    titulo: "Fronteira",
    descricao: "Montagem final em andamento.",
    imagemUrl: null, // rascunho sem imagem (rev. 3, C5)
    camposExtras: { direcao: "Ivo Lemos", duracao: "16 min" },
    publicado: false,
  },
  {
    id: "cand-fv-08",
    titulo: "Noite de Estreia",
    descricao: "Bastidores da primeira sessão de um cinema de rua reaberto.",
    imagemUrl: "placeholder:8",
    camposExtras: { direcao: "Clara Mota", duracao: "12 min" },
    desqualificado: true,
  },
];

export const seedCandidatos = [
  ...semanaTech.map((c, i) => candidato(ID_SEMANA_TECH, CRIADO_ST, i + 1, c)),
  ...festival.map((c, i) => candidato(ID_FESTIVAL, CRIADO_FV, i + 1, c)),
] satisfies Candidato[];
