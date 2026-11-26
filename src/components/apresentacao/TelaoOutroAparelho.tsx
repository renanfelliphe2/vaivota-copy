"use client";

import { MonitorSmartphone, Unplug } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { DialogoConfirmacao } from "@/components/ui/DialogoConfirmacao";
import { Selo } from "@/components/ui/Selo";
import { SEM_SINAL_REMOTO_MS, chaveDoModo, type ModoPalco, type StatusTelaoRemoto } from "@/dominio/telaoRemoto";
import { consultarTelaoRemoto, desconectarTelaoRemoto, prepararTelaoRemoto } from "@/servicos/telaoRemoto";
import { useAmbiente } from "@/store/AppProvider";
import { guardarSessaoTelaoRemoto, useSessaoTelaoRemoto } from "@/store/telaoRemoto";

// Telão em outro aparelho (25/11/2026): no palco aberto pelo admin, abaixo de "Entrar em tela cheia" e "Apresentar em janela",
// o código para abrir a apresentação em outro aparelho (em /e/<slug>/telao/parear). O controle remoto fica neste navegador.
// O código só aparece quando o admin pede: esta tela costuma estar no telão, à vista do público, e quem digita o código vira o
// telão (e lê o resultado antes da revelação). Apresentar aqui descarta o código ainda não usado: nunca dois palcos no ar.

const INTERVALO_STATUS_MS = 2000;
/** A consulta do palco não quer a cópia da apresentação (quem a troca é o controle remoto). */
const SEM_COPIA = 2_147_483_647;
const semInscricao = () => () => {};

export type TelaoRemotoDoPalco = {
  /** A sessão deste navegador, se ainda viva (AGUARDANDO com o código, ou PAREADO). */
  status: StatusTelaoRemoto | null;
  gerando: boolean;
  erro: string | null;
  mostrarCodigo: () => Promise<void>;
  esconderCodigo: () => Promise<void>;
  /** O admin vai apresentar aqui: o código ainda não usado sai de circulação. false se um aparelho acabou de parear. */
  liberarParaApresentarAqui: () => Promise<boolean>;
  desconectar: () => Promise<void>;
};

export function useTelaoRemotoDoPalco(eventoId: string, modo: ModoPalco, ativo: boolean): TelaoRemotoDoPalco {
  const { store } = useAmbiente();
  const id = useSessaoTelaoRemoto(ativo ? eventoId : null);
  const [lido, setLido] = useState<StatusTelaoRemoto | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const chaveModo = chaveDoModo(modo);
  const [modoAtual, setModoAtual] = useState(modo);
  if (chaveDoModo(modoAtual) !== chaveModo) setModoAtual(modo);

  // Com uma sessão guardada, este palco a reabre e passa a ela o seu modo; depois, pergunta a situação de tempos em tempos (também
  // com a aba de fundo: com uma tela só, o palco fica atrás da sala enquanto o outro aparelho pareia).
  useEffect(() => {
    if (!id) return;
    let parado = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const descartar = () => {
      guardarSessaoTelaoRemoto(eventoId, null, id);
      setLido(null);
    };
    async function consultar() {
      const r = await consultarTelaoRemoto({ eventoId, id: id!, versaoApresentacao: SEM_COPIA });
      if (parado) return;
      if (r.ok && r.dados.situacao === "ENCERRADO") return descartar();
      if (!r.ok && r.erro.codigo === "NAO_ENCONTRADO") return descartar();
      if (r.ok) setLido(r.dados);
      timer = setTimeout(() => void consultar(), INTERVALO_STATUS_MS);
    }
    void (async () => {
      const r = await prepararTelaoRemoto({ eventoId, id, modo: modoAtual, apresentacao: store.getState().ui.apresentacao, criar: false });
      if (parado) return;
      if (r.ok && !r.dados) return descartar();
      if (r.ok && r.dados) setLido(r.dados);
      void consultar();
    })();
    return () => {
      parado = true;
      clearTimeout(timer);
    };
  }, [eventoId, id, modoAtual, store]);

  const status = id && lido?.id === id && lido.situacao !== "ENCERRADO" ? lido : null;

  async function mostrarCodigo() {
    setGerando(true);
    setErro(null);
    const r = await prepararTelaoRemoto({ eventoId, id, modo, apresentacao: store.getState().ui.apresentacao, criar: true });
    setGerando(false);
    if (!r.ok) return setErro(r.erro.mensagem);
    if (!r.dados) return setErro("Não foi possível gerar o código. Tente de novo.");
    guardarSessaoTelaoRemoto(eventoId, r.dados.id);
    setLido(r.dados);
  }

  /** Descarta o código ainda não usado. true se não sobrou aparelho pareado. */
  async function descartarCodigo(): Promise<boolean> {
    if (!id) return true;
    const r = await desconectarTelaoRemoto({ eventoId, id, soSeAguardando: true });
    if (!r.ok) return lido?.situacao !== "PAREADO";
    if (r.dados.situacao === "PAREADO") {
      setLido(r.dados);
      return false;
    }
    guardarSessaoTelaoRemoto(eventoId, null, id);
    setLido(null);
    return true;
  }

  async function desconectar() {
    if (!id) return;
    const r = await desconectarTelaoRemoto({ eventoId, id, soSeAguardando: false });
    if (!r.ok) return setErro(r.erro.mensagem);
    guardarSessaoTelaoRemoto(eventoId, null, id);
    setLido(null);
  }

  return {
    status,
    gerando,
    erro,
    mostrarCodigo,
    esconderCodigo: async () => {
      await descartarCodigo();
    },
    liberarParaApresentarAqui: descartarCodigo,
    desconectar,
  };
}

/** Abaixo dos botões do palco: o código para abrir em outro aparelho, mostrado só a pedido. */
export function CodigoOutroAparelho({ telao, slug }: { telao: TelaoRemotoDoPalco; slug: string }) {
  const [revelado, setRevelado] = useState(false);
  const origem = useSyncExternalStore(semInscricao, () => window.location.origin, () => "");
  const endereco = `${origem.replace(/^https?:\/\//, "")}/e/${slug}/telao/parear`;
  const codigo = revelado && telao.status?.situacao === "AGUARDANDO" ? telao.status.codigo : null;

  return (
    <div className="flex w-full flex-col items-center gap-3 border-t border-tema-borda pt-6">
      {codigo ? (
        <>
          <p className="text-sm text-tema-texto-suave">
            No outro aparelho, abra <strong className="break-all text-tema-texto">{endereco}</strong> e digite:
          </p>
          <p aria-label={`Código ${codigo.split("").join(" ")}`} className="rounded-2xl border border-tema-borda bg-tema-superficie px-6 py-3 font-mono text-4xl font-bold tracking-[0.2em]">
            {codigo}
          </p>
          <p className="text-sm text-tema-texto-suave">O controle remoto continua neste computador.</p>
          <Botao
            variante="fantasma"
            tamanho="pequeno"
            onClick={() => {
              setRevelado(false);
              void telao.esconderCodigo();
            }}
          >
            Esconder o código
          </Botao>
        </>
      ) : (
        <Botao
          variante="fantasma"
          carregando={telao.gerando}
          icone={<MonitorSmartphone aria-hidden className="size-5" />}
          onClick={() => {
            setRevelado(true);
            void telao.mostrarCodigo();
          }}
        >
          Abrir em outro aparelho
        </Botao>
      )}
      {telao.erro && <Alerta variante="erro">{telao.erro}</Alerta>}
    </div>
  );
}

/** O palco deste navegador quando a apresentação está no outro aparelho. */
export function TelaoNoOutroAparelho({ telao }: { telao: TelaoRemotoDoPalco }) {
  const [confirmar, setConfirmar] = useState(false);
  const [desconectando, setDesconectando] = useState(false);
  const sinal = telao.status?.sinalHaMs;
  const comSinal = sinal !== null && sinal !== undefined && sinal < SEM_SINAL_REMOTO_MS;

  return (
    <main id="conteudo" className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex max-w-xl flex-col items-center gap-6 text-center">
        <MonitorSmartphone aria-hidden className="size-16 text-tema-primaria-texto" />
        <h1 className="text-3xl font-bold">A apresentação está no outro aparelho</h1>
        <p className="text-lg text-tema-texto-suave">
          Comande tudo pelo controle remoto, em qualquer página do admin deste navegador. Esta aba pode ficar aberta ou ser fechada.
        </p>
        <Selo variante={comSinal ? "sucesso" : "aviso"} pulsar={comSinal}>
          {comSinal ? "Outro aparelho conectado" : "Sem sinal do outro aparelho"}
        </Selo>
        {telao.erro && <Alerta variante="erro">{telao.erro}</Alerta>}
        <Botao variante="contorno" icone={<Unplug aria-hidden className="size-5" />} onClick={() => setConfirmar(true)}>
          Desconectar o outro aparelho
        </Botao>
      </div>
      <DialogoConfirmacao
        aberto={confirmar}
        aoFechar={() => setConfirmar(false)}
        aoConfirmar={async () => {
          setDesconectando(true);
          await telao.desconectar();
          setDesconectando(false);
          setConfirmar(false);
        }}
        carregando={desconectando}
        titulo="Desconectar o outro aparelho?"
        consequencia="Ele deixa de mostrar a apresentação. Para usá-lo de novo, gere outro código. A revelação continua de onde parou, aqui ou em outro aparelho."
        rotuloConfirmar="Desconectar"
      />
    </main>
  );
}
