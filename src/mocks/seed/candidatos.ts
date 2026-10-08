import type { Candidato } from "@/dominio/tipos";
import { ID_FESTIVAL } from "./eventos";

// Casos de borda (Etapa 0, seção 5.6). Títulos e descrições fictícios; imagens por D16.
// Festival: 01–06 votáveis; 07 rascunho sem imagem; 08 desqualificado; 05 título longo; 06 descrição curta;
//           02 sem `duracao`.

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

export const seedCandidatos = festival.map((c, i) => candidato(ID_FESTIVAL, CRIADO_FV, i + 1, c)) satisfies Candidato[];
