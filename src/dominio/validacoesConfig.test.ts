import { describe, expect, it } from "vitest";
import { criarEstadoInicial } from "@/mocks/criarEstadoInicial";
import { gerarChave, contarValores, removerValores } from "./camposExtras";
import { avaliarContrasteTema } from "./contrasteTema";
import { estadoExibidoConvite, proximoNumeroRotulo, resumirConvites } from "./convites";
import { calcularExemploPlacar, liderDoExemplo } from "./placarExemplo";
import {
  LIMITES,
  validarArquivoImagem,
  validarCandidato,
  validarExtensaoFim,
  validarGeracaoConvites,
  validarParceiros,
  validarJanela,
  validarMotivo,
  validarNomeEvento,
  validarPesos,
  validarRotuloCampo,
  validarSlug,
  validarTema,
} from "./validacoesConfig";

const T0 = Date.parse("2026-10-22T14:00:00-03:00");
const HORA = 3_600_000;

describe("Geral", () => {
  it("nome e slug", () => {
    expect(validarNomeEvento("")).not.toBeNull();
    expect(validarNomeEvento("ab")).not.toBeNull();
    expect(validarNomeEvento("Maratona Tech Tivit")).toBeNull();
    expect(validarSlug("Meu Evento", [])).not.toBeNull();
    expect(validarSlug("-abc", [])).not.toBeNull();
    expect(validarSlug("ab", [])).not.toBeNull();
    expect(validarSlug("maratona-tech-tivit", ["Maratona-Tech-Tivit"])).toBe("Este endereço já está em uso.");
    expect(validarSlug("maratona-tech-tivit-2026", ["maratona-tech-tivit"])).toBeNull();
  });

  it("janela e extensão do fim", () => {
    expect(validarJanela(T0, T0 - HORA)).toHaveProperty("janelaFim");
    expect(validarJanela(T0 - 2 * HORA, T0 - HORA)).toEqual({}); // no passado é permitido salvar
    expect(validarExtensaoFim(T0 + HORA, T0 + 2 * HORA, T0)).not.toBeNull();
    expect(validarExtensaoFim(T0 + 3 * HORA, T0 + 2 * HORA, T0)).toBeNull();
    expect(validarExtensaoFim(T0 - HORA, T0 - 2 * HORA, T0)).not.toBeNull();
  });

  it("motivo obrigatório só no excepcional", () => {
    expect(validarMotivo("", false)).toBeNull();
    expect(validarMotivo("curto", true)).not.toBeNull();
    expect(validarMotivo("Projeto plagiado comprovadamente", true)).toBeNull();
  });
});

describe("Candidatos", () => {
  const base = { titulo: "Título", imagemUrl: null, camposExtras: {} };

  it("só exige o título; imagem é obrigatória apenas na votação (D12)", () => {
    expect(validarCandidato(base, { naVotacao: false })).toEqual({});
    expect(validarCandidato(base, { naVotacao: true })).toHaveProperty("imagemUrl");
    expect(validarCandidato({ ...base, titulo: " " }, { naVotacao: false })).toHaveProperty("titulo");
  });

  it("descrição é um campo extra opcional, multilinha e com limite de 1500 caracteres", () => {
    expect(validarCandidato({ ...base, camposExtras: { descricao: "Linha 1\nLinha 2" } }, { naVotacao: false })).toEqual({});
    expect(validarCandidato({ ...base, camposExtras: { descricao: "x".repeat(1501) } }, { naVotacao: false })).toHaveProperty("campo:descricao");
    expect(validarCandidato({ ...base, camposExtras: { equipe: "x".repeat(201) } }, { naVotacao: false })).toHaveProperty("campo:equipe");
  });

  it("limites cobrem o seed", () => {
    for (const c of criarEstadoInicial().banco.candidatos) {
      expect(c.titulo.length).toBeLessThanOrEqual(LIMITES.tituloCandidato);
      expect((c.camposExtras?.descricao ?? "").length).toBeLessThanOrEqual(LIMITES.descricaoCandidato);
    }
  });

  it("arquivo de imagem", () => {
    expect(validarArquivoImagem({ type: "image/png", size: 1000 })).toBeNull();
    expect(validarArquivoImagem({ type: "image/gif", size: 1000 })).not.toBeNull();
    expect(validarArquivoImagem({ type: "image/png", size: 3 * 1024 * 1024 })).not.toBeNull();
  });

  it("campos extras: rótulo, chave e remoção de valores", () => {
    expect(validarRotuloCampo("E", [])).not.toBeNull();
    expect(validarRotuloCampo("Direção", ["direção"])).not.toBeNull();
    expect(gerarChave("Direção de Arte", [])).toBe("direcao_de_arte");
    expect(gerarChave("Elenco", ["elenco"])).toBe("elenco_2");
    const { candidatos } = criarEstadoInicial().banco;
    expect(contarValores(candidatos, "evt-ver-e-fazer-filmes", "duracao")).toBe(7);
    const sem = removerValores(candidatos, "evt-ver-e-fazer-filmes", ["duracao"]);
    expect(contarValores(sem, "evt-ver-e-fazer-filmes", "duracao")).toBe(0);
    expect(contarValores(sem, "evt-ver-e-fazer-filmes", "direcao")).toBe(8);
  });
});

describe("Convites", () => {
  it("expirado é derivado e o resumo do seed", () => {
    const { convitesJurado } = criarEstadoInicial().banco;
    const fv = convitesJurado.filter((c) => c.eventoId === "evt-ver-e-fazer-filmes");
    expect(resumirConvites(fv, T0)).toEqual({ disponiveis: 2, usados: 1, revogados: 0, expirados: 0 });
    expect(estadoExibidoConvite({ estado: "DISPONIVEL", validadeAte: "2026-10-20T23:59:00-03:00" }, T0)).toBe("EXPIRADO");
  });

  it("geração e rótulo base", () => {
    expect(validarGeracaoConvites({ quantidade: 51, rotuloBase: "", validadeAteMs: null, agoraMs: T0 })).toHaveProperty("quantidade");
    expect(validarGeracaoConvites({ quantidade: 5, rotuloBase: "Banca", validadeAteMs: T0 - 1, agoraMs: T0 })).toHaveProperty("validadeAte");
    expect(validarGeracaoConvites({ quantidade: 5, rotuloBase: "Banca", validadeAteMs: null, agoraMs: T0 })).toEqual({});
    expect(proximoNumeroRotulo(["Jurado 1", "Jurado 3", "Jurado 2", null, "Banca 9"], "Jurado")).toBe(4);
    expect(proximoNumeroRotulo([], "Banca")).toBe(1);
  });
});

describe("Placar", () => {
  const ligados = { POPULAR: true, JURI: true, INFANTIL: false };
  it("pesos", () => {
    expect(validarPesos({ POPULAR: 70, JURI: 30, INFANTIL: 0 }, ligados)).toBeNull();
    expect(validarPesos({ POPULAR: 60, JURI: 30, INFANTIL: 0 }, ligados)).toBe("Faltam 10%.");
    expect(validarPesos({ POPULAR: 75, JURI: 30, INFANTIL: 0 }, ligados)).toBe("Excede 5%.");
    expect(validarPesos({ POPULAR: 70, JURI: 20, INFANTIL: 10 }, ligados)).not.toBeNull();
    expect(validarPesos({ POPULAR: 70.5, JURI: 29.5, INFANTIL: 0 }, ligados)).not.toBeNull();
  });

  it("exemplo numérico (seção 5.5)", () => {
    const r = (p: number, j: number, i: number) => calcularExemploPlacar({ POPULAR: p, JURI: j, INFANTIL: i }).map((l) => l.pontuacao);
    expect(r(70, 30, 0)).toEqual([41, 42, 17]);
    expect(r(50, 30, 20)).toEqual([36, 41, 23]);
    expect(r(100, 0, 0)).toEqual([50, 30, 20]);
    expect(liderDoExemplo(calcularExemploPlacar({ POPULAR: 70, JURI: 30, INFANTIL: 0 }))).toBe("B");
    expect(liderDoExemplo(calcularExemploPlacar({ POPULAR: 100, JURI: 0, INFANTIL: 0 }))).toBe("A");
  });
});

describe("Tema", () => {
  it("temas do seed são aprovados; texto igual ao fundo reprova", () => {
    for (const tema of criarEstadoInicial().banco.temas) expect(avaliarContrasteTema(tema).aprovado).toBe(true);
    const ruim = avaliarContrasteTema({ corPrimaria: "#38BDF8", corSecundaria: "#A78BFA", corFundo: "#0F172A", corTexto: "#0F172A", fonte: "Inter" });
    expect(ruim.aprovado).toBe(false);
    expect(ruim.reprovados.map((p) => p.id)).toContain("texto-fundo");
  });

  it("primária com pouco contraste só avisa", () => {
    const r = avaliarContrasteTema({ corPrimaria: "#FFE08A", corSecundaria: "#18181B", corFundo: "#FFFFFF", corTexto: "#18181B", fonte: "Inter" });
    const primaria = r.pares.find((p) => p.id === "primaria-fundo")!;
    expect(primaria.aprovado).toBe(false);
    expect(primaria.bloqueante).toBe(false);
    expect(r.aprovado).toBe(true);
  });

  it("campos", () => {
    const dados = {
      nomeExibicao: "Festival",
      corPrimaria: "#F15A29",
      corSecundaria: "#8DC63F",
      corFundo: "#FFFFFF",
      corTexto: "#18181B",
      fonte: "Inter",
      rotuloCandidato: "Curta",
      rotuloCandidatos: "Curtas",
    };
    expect(validarTema(dados, ["Inter"])).toEqual({});
    expect(validarTema({ ...dados, rotuloCandidato: "", corFundo: "branco" }, ["Inter"])).toHaveProperty("rotuloCandidato");
    expect(validarTema({ ...dados, fonte: "Comic" }, ["Inter"])).toHaveProperty("fonte");
  });
});

describe("parceiros", () => {
  it("validarParceiros: nome obrigatório, tamanho, duplicado e limite", () => {
    expect(validarParceiros([])).toEqual({});
    expect(validarParceiros(["Energisa", "energisa ", "", "X"])).toEqual({
      "parceiro-1": "Já existe um parceiro com este nome.",
      "parceiro-2": "Informe o nome do parceiro.",
      "parceiro-3": "Use de 2 a 60 caracteres.",
    });
    const muitos = Array.from({ length: LIMITES.maxParceiros + 1 }, (_, i) => `Parceiro ${i + 1}`);
    expect(validarParceiros(muitos)).toEqual({ parceiros: `Use até ${LIMITES.maxParceiros} parceiros.` });
  });

  it("seed: os parceiros do Festival passam na validação e estão em ordem", () => {
    const { parceiros } = criarEstadoInicial().banco;
    expect(parceiros.length).toBeGreaterThan(0);
    expect(validarParceiros(parceiros.map((p) => p.nome))).toEqual({});
    expect(parceiros.map((p) => p.ordem)).toEqual(parceiros.map((_, i) => i + 1));
  });
});
