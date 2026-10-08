import { CONTRASTE_TEXTO, CONTRASTE_UI, razaoContraste } from "@/lib/contraste";
import { calcularTokens, type CoresTema } from "@/lib/tema";

// Etapa 6 (D18, seção 5.6): política de contraste do formulário de Tema (D15 da Etapa 0).
// Pares bloqueantes (4,5:1) impedem salvar e ativar; pares de aviso (3:1) só avisam.

export type ParContraste = {
  id: string;
  par: string;
  razao: number;
  minimo: number;
  bloqueante: boolean;
  aprovado: boolean;
};

export type AvaliacaoContraste = { pares: ParContraste[]; aprovado: boolean; reprovados: ParContraste[] };

export function avaliarContrasteTema(cores: CoresTema): AvaliacaoContraste {
  const v = calcularTokens(cores).variaveis;
  const par = (id: string, nome: string, a: string, b: string, bloqueante: boolean): ParContraste => {
    const minimo = bloqueante ? CONTRASTE_TEXTO : CONTRASTE_UI;
    const razao = razaoContraste(a, b);
    return { id, par: nome, razao, minimo, bloqueante, aprovado: razao >= minimo };
  };
  const pares = [
    par("texto-fundo", "Texto × fundo", v["--tema-texto"], v["--tema-fundo"], true),
    par("suave-fundo", "Texto suave × fundo", v["--tema-texto-suave"], v["--tema-fundo"], true),
    par("suave-superficie", "Texto suave × superfície", v["--tema-texto-suave"], v["--tema-superficie"], true),
    par("sobre-primaria", "Texto sobre a primária", v["--tema-sobre-primaria"], v["--tema-primaria"], true),
    par("sobre-secundaria", "Texto sobre a secundária", v["--tema-sobre-secundaria"], v["--tema-secundaria"], true),
    par("primaria-texto", "Primária como texto × fundo", v["--tema-primaria-texto"], v["--tema-fundo"], true),
    par("secundaria-texto", "Secundária como texto × fundo", v["--tema-secundaria-texto"], v["--tema-fundo"], true),
    par("primaria-fundo", "Primária × fundo", v["--tema-primaria"], v["--tema-fundo"], false),
    par("secundaria-fundo", "Secundária × fundo", v["--tema-secundaria"], v["--tema-fundo"], false),
    par("foco-fundo", "Foco × fundo", v["--tema-foco"], v["--tema-fundo"], false),
  ];
  const reprovados = pares.filter((p) => p.bloqueante && !p.aprovado);
  return { pares, aprovado: reprovados.length === 0, reprovados };
}
