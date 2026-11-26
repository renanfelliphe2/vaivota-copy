"use client";

import { BarChart3, LogOut, Square } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Campo, Input } from "@/components/ui/Campo";
import { Dialogo } from "@/components/ui/Dialogo";
import type { ResumoSessao } from "@/dominio/sessaoTotem";
import { pedirRelatorioTotem, registrarAberturaNoLog, registrarEncerramentoNoLog } from "@/lib/logTotem";
import { TEXTOS_TOTEM } from "@/lib/textosTotem";
import { abrirSessaoTotem, encerrarSessaoTotem } from "@/servicos/totem";
import { ResumoSessaoTotem } from "./ResumoSessaoTotem";

// Menu do totem (logTotem.md, 26/11/2026), aberto depois do PIN: Analisar votos, Encerrar sessão e Sair. O PIN fica só na memória
// enquanto o menu está aberto (as chamadas o levam); fechar o menu o esquece. Encerrar a sessão não pausa nada: só separa as turmas.

type Vista = { tipo: "MENU" } | { tipo: "CONFIRMAR" } | { tipo: "RESUMO"; resumo: ResumoSessao };

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
  const [aberta, setAberta] = useState<number | null>(null);

  function fechar() {
    setVista({ tipo: "MENU" });
    setErro(null);
    setEsperadas("");
    setAberta(null);
    aoFechar();
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
    setAberta(r.dados.numero);
  }

  const titulo = vista.tipo === "RESUMO" ? `Sessão ${vista.resumo.numero} encerrada` : vista.tipo === "CONFIRMAR" ? TEXTOS_TOTEM.menuEncerrar : TEXTOS_TOTEM.menu;

  return (
    <Dialogo aberto={pin !== null} aoFechar={fechar} titulo={titulo} className="max-w-xl">
      <div className="flex flex-col gap-4">
        {erro && <Alerta variante="erro">{erro}</Alerta>}

        {vista.tipo === "MENU" && (
          <div className="flex flex-col gap-2">
            <Botao
              variante="contorno"
              larguraTotal
              onClick={() => {
                pedirRelatorioTotem();
                fechar();
                aoAnalisar();
              }}
            >
              <BarChart3 aria-hidden className="size-5" /> {TEXTOS_TOTEM.menuAnalisar}
            </Botao>
            <Botao variante="contorno" larguraTotal onClick={() => setVista({ tipo: "CONFIRMAR" })}>
              <Square aria-hidden className="size-5" /> {TEXTOS_TOTEM.menuEncerrar}
            </Botao>
            <Botao
              variante="fantasma"
              larguraTotal
              onClick={() => {
                fechar();
                aoSair();
              }}
            >
              <LogOut aria-hidden className="size-5" /> {TEXTOS_TOTEM.menuSair}
            </Botao>
          </div>
        )}

        {vista.tipo === "CONFIRMAR" && (
          <>
            <p className="text-tema-texto">
              Encerrar a sessão atual? Os votos continuam valendo e o totem continua votando: a sessão só separa uma turma da outra
              na análise.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Botao variante="contorno" onClick={() => setVista({ tipo: "MENU" })}>
                Cancelar
              </Botao>
              <Botao onClick={() => void encerrar()} carregando={ocupado}>
                {TEXTOS_TOTEM.menuEncerrar}
              </Botao>
            </div>
          </>
        )}

        {vista.tipo === "RESUMO" && (
          <>
            <ResumoSessaoTotem resumo={vista.resumo} />
            {aberta === null ? (
              <form onSubmit={(e) => void abrirProxima(e)} className="flex flex-col gap-3 border-t border-tema-borda pt-4">
                <Campo id="totem-esperadas" rotulo="Crianças esperadas na próxima sessão (opcional)">
                  <Input
                    inputMode="numeric"
                    autoComplete="off"
                    value={esperadas}
                    onChange={(e) => setEsperadas(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Ex.: 144"
                  />
                </Campo>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Botao type="button" variante="contorno" onClick={fechar}>
                    Fechar
                  </Botao>
                  <Botao type="submit" carregando={ocupado}>
                    Abrir próxima sessão
                  </Botao>
                </div>
                <p className="text-sm text-tema-texto-suave">Se fechar sem abrir, o próximo voto abre a sessão sozinho.</p>
              </form>
            ) : (
              <div className="flex flex-col gap-3 border-t border-tema-borda pt-4">
                <Alerta variante="sucesso">Sessão {aberta} aberta. O totem segue votando normalmente.</Alerta>
                <Botao onClick={fechar}>Voltar ao totem</Botao>
              </div>
            )}
          </>
        )}
      </div>
    </Dialogo>
  );
}
