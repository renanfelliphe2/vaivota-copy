"use client";

import { ArrowLeft, BarChart3, ChevronRight, LogOut, Play, Square } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Campo, Input } from "@/components/ui/Campo";
import { Dialogo } from "@/components/ui/Dialogo";
import type { ResumoSessao } from "@/dominio/sessaoTotem";
import { cx } from "@/lib/classes";
import { pedirRelatorioTotem, registrarAberturaNoLog, registrarEncerramentoNoLog } from "@/lib/logTotem";
import { TEXTOS_TOTEM } from "@/lib/textosTotem";
import { abrirSessaoTotem, encerrarSessaoTotem } from "@/servicos/totem";
import { ResumoSessaoTotem } from "./ResumoSessaoTotem";

// Menu do totem (logTotem.md, 26/11/2026), aberto depois do PIN: Analisar votos, Encerrar sessão e Sair. O PIN fica só na memória
// enquanto o menu está aberto (as chamadas o levam); fechar o menu o esquece. Encerrar a sessão não pausa nada: só separa as turmas.
// 26/11/2026 (2ª sessão): passado a limpo. Cada opção é uma linha com ícone, nome e uma frase do que faz; ações e "Voltar" sempre
// no rodapé de cada vista; o resumo de sessão encerrada abre o diálogo mais largo.

type Vista = { tipo: "MENU" } | { tipo: "ABRIR" } | { tipo: "CONFIRMAR" } | { tipo: "RESUMO"; resumo: ResumoSessao };

export function MenuTotem({
  pin,
  aoFechar,
  aoAnalisar,
  aoSair,
}: {
  /** null = menu fechado. */
  pin: string | null;
  aoFechar: () => void;
  aoAnalisar: () => void;
  aoSair: () => void;
}) {
  const [vista, setVista] = useState<Vista>({ tipo: "MENU" });
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [esperadas, setEsperadas] = useState("");
  const [aberta, setAberta] = useState<{ numero: number; jaAberta: boolean } | null>(null);

  function fechar() {
    setVista({ tipo: "MENU" });
    setErro(null);
    setEsperadas("");
    setAberta(null);
    aoFechar();
  }

  function irPara(v: Vista) {
    setErro(null);
    setVista(v);
  }

  async function encerrar() {
    if (!pin || ocupado) return;
    setOcupado(true);
    setErro(null);
    const r = await encerrarSessaoTotem(pin);
    setOcupado(false);
    if (!r.ok) return setErro(r.erro.mensagem);
    // Os toques desde o último voto ficam com a sessão que acabou; o funil final sai agora.
    registrarEncerramentoNoLog();
    pedirRelatorioTotem();
    setVista({ tipo: "RESUMO", resumo: r.dados.resumo });
  }

  async function abrirProxima(e: FormEvent) {
    e.preventDefault();
    if (!pin || ocupado) return;
    const n = esperadas.trim() ? Number(esperadas) : null;
    if (n !== null && (!Number.isInteger(n) || n < 1 || n > 100_000)) return setErro("Informe um número inteiro de crianças, ou deixe em branco.");
    setOcupado(true);
    setErro(null);
    const r = await abrirSessaoTotem(pin, n);
    setOcupado(false);
    if (!r.ok) return setErro(r.erro.mensagem);
    registrarAberturaNoLog({ id: r.dados.sessaoId, numero: r.dados.numero });
    setAberta({ numero: r.dados.numero, jaAberta: r.dados.jaAberta });
  }

  const titulo =
    vista.tipo === "RESUMO"
      ? `Sessão ${vista.resumo.numero} encerrada`
      : vista.tipo === "CONFIRMAR"
        ? TEXTOS_TOTEM.menuEncerrar
        : vista.tipo === "ABRIR"
          ? TEXTOS_TOTEM.menuAbrir
          : TEXTOS_TOTEM.menu;

  /** Campo das crianças esperadas + botão de abrir (no "Abrir sessão" do menu e no resumo depois de encerrar). */
  const formularioAbrir = (comFechar: boolean) =>
    aberta === null ? (
      <form onSubmit={(e) => void abrirProxima(e)} className="flex flex-col gap-4">
        <Campo
          id="totem-esperadas"
          rotulo="Crianças esperadas nesta turma (opcional)"
          dica="Se já houver uma sessão aberta, ela continua e só recebe o número de crianças. Sem abrir aqui, o próximo voto abre a sessão sozinho."
        >
          <Input
            inputMode="numeric"
            autoComplete="off"
            value={esperadas}
            onChange={(e) => setEsperadas(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Ex.: 144"
            className="sm:max-w-48"
          />
        </Campo>
        <Rodape>
          <Botao
            type="button"
            variante="contorno"
            onClick={comFechar ? fechar : () => irPara({ tipo: "MENU" })}
            icone={comFechar ? undefined : <ArrowLeft aria-hidden className="size-4" />}
          >
            {comFechar ? "Fechar" : "Voltar"}
          </Botao>
          <Botao type="submit" carregando={ocupado} icone={<Play aria-hidden className="size-4" />}>
            {comFechar ? "Abrir próxima sessão" : TEXTOS_TOTEM.menuAbrir}
          </Botao>
        </Rodape>
      </form>
    ) : (
      <div className="flex flex-col gap-4">
        <Alerta variante="sucesso">
          {aberta.jaAberta
            ? `A sessão ${aberta.numero} já estava aberta${esperadas ? ` e agora espera ${esperadas} crianças` : ""}.`
            : `Sessão ${aberta.numero} aberta${esperadas ? ` para ${esperadas} crianças` : ""}.`}{" "}
          O totem segue votando normalmente.
        </Alerta>
        <Rodape>
          <Botao onClick={fechar}>Voltar ao totem</Botao>
        </Rodape>
      </div>
    );

  return (
    <Dialogo
      aberto={pin !== null}
      aoFechar={fechar}
      titulo={titulo}
      // O resumo tem números e barras: abre mais largo. As outras vistas são curtas.
      className={vista.tipo === "RESUMO" ? "sm:max-w-2xl!" : "sm:max-w-md!"}
    >
      <div className="flex flex-col gap-4">
        {erro && <Alerta variante="erro">{erro}</Alerta>}

        {vista.tipo === "MENU" && (
          <nav aria-label={TEXTOS_TOTEM.menu} className="flex flex-col gap-2">
            <ItemMenu
              icone={<BarChart3 aria-hidden />}
              titulo={TEXTOS_TOTEM.menuAnalisar}
              descricao="Votos, sessões e o funil deste aparelho. Não mostra em quem se votou."
              onClick={() => {
                pedirRelatorioTotem();
                fechar();
                aoAnalisar();
              }}
            />
            <ItemMenu
              icone={<Play aria-hidden />}
              titulo={TEXTOS_TOTEM.menuAbrir}
              descricao="Começa a contar uma nova turma, com as crianças esperadas."
              onClick={() => irPara({ tipo: "ABRIR" })}
            />
            <ItemMenu
              icone={<Square aria-hidden />}
              titulo={TEXTOS_TOTEM.menuEncerrar}
              descricao="Fecha a turma atual e mostra o resumo dela."
              onClick={() => irPara({ tipo: "CONFIRMAR" })}
            />
            <div className="my-1 border-t border-tema-borda" />
            <ItemMenu
              icone={<LogOut aria-hidden />}
              titulo={TEXTOS_TOTEM.menuSair}
              descricao="Volta para a página do evento neste aparelho."
              discreto
              onClick={() => {
                fechar();
                aoSair();
              }}
            />
          </nav>
        )}

        {vista.tipo === "CONFIRMAR" && (
          <>
            <p className="text-tema-texto">
              Encerrar a sessão atual? Os votos continuam valendo e o totem continua votando: a sessão só separa uma turma da outra
              na análise.
            </p>
            <Rodape>
              <Botao variante="contorno" onClick={() => irPara({ tipo: "MENU" })} icone={<ArrowLeft aria-hidden className="size-4" />}>
                Voltar
              </Botao>
              <Botao onClick={() => void encerrar()} carregando={ocupado} icone={<Square aria-hidden className="size-4" />}>
                {TEXTOS_TOTEM.menuEncerrar}
              </Botao>
            </Rodape>
          </>
        )}

        {vista.tipo === "RESUMO" && (
          <>
            <ResumoSessaoTotem resumo={vista.resumo} />
            <div className="border-t border-tema-borda pt-4">{formularioAbrir(true)}</div>
          </>
        )}

        {vista.tipo === "ABRIR" && formularioAbrir(false)}
      </div>
    </Dialogo>
  );
}

/** Ações de uma vista: empilhadas no celular (a principal em cima), lado a lado e à direita do sm em diante. */
function Rodape({ children }: { children: ReactNode }) {
  return <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">{children}</div>;
}

/** Uma opção do menu: ícone num círculo, nome e o que ela faz; a linha toda é o alvo do toque. */
function ItemMenu({
  icone,
  titulo,
  descricao,
  onClick,
  discreto = false,
}: {
  icone: ReactNode;
  titulo: string;
  descricao: string;
  onClick: () => void;
  discreto?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "group flex min-h-16 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-tema-superficie active:scale-[0.99]",
        discreto ? "" : "border border-tema-borda",
      )}
    >
      <span
        className={cx(
          "flex size-10 shrink-0 items-center justify-center rounded-full [&>svg]:size-5",
          discreto ? "bg-tema-superficie text-tema-texto-suave" : "bg-tema-primaria/10 text-tema-primaria-texto",
        )}
      >
        {icone}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold text-tema-texto">{titulo}</span>
        <span className="text-sm text-tema-texto-suave">{descricao}</span>
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-tema-texto-suave transition group-hover:translate-x-0.5" />
    </button>
  );
}
