"use client";

import { Star } from "lucide-react";
import { useMemo, useState } from "react";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { LogoEvento } from "@/components/evento/LogoEvento";
import { TemaEvento } from "@/components/evento/TemaEvento";
import { Abas } from "@/components/ui/Abas";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Campo, Checkbox, Input, Select, Textarea } from "@/components/ui/Campo";
import { Cartao } from "@/components/ui/Cartao";
import { Carregando, Esqueleto } from "@/components/ui/Carregando";
import { ContagemRegressiva } from "@/components/ui/ContagemRegressiva";
import { Dialogo } from "@/components/ui/Dialogo";
import { DialogoConfirmacao } from "@/components/ui/DialogoConfirmacao";
import { Selo } from "@/components/ui/Selo";
import { useToast } from "@/components/ui/Toast";
import { formatarDecimal } from "@/lib/formatar";
import { calcularTokens, paresDeContraste } from "@/lib/tema";
import type { Tema } from "@/dominio/tipos";
import { useEventos, useTemas } from "@/store/seletores/evento";
import { useAgora } from "@/store/seletores/relogio";

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-tema-texto-suave">{titulo}</h3>
      {children}
    </section>
  );
}

function Amostra({ tema, nome }: { tema: Tema; nome: string }) {
  const agora = useAgora();
  const mostrarToast = useToast();
  const [dialogo, setDialogo] = useState(false);
  const [confirmacao, setConfirmacao] = useState(false);
  const pares = useMemo(() => paresDeContraste(calcularTokens(tema)), [tema]);
  const prefixo = tema.eventoId;

  return (
    <TemaEvento tema={tema} className="flex flex-col gap-8 rounded-2xl border border-tema-borda p-5 sm:p-8">
      <h2 className="text-2xl font-bold">{nome}</h2>

      <Bloco titulo="Botões">
        <div className="flex flex-wrap gap-2">
          <Botao>Primária</Botao>
          <Botao variante="secundaria">Secundária</Botao>
          <Botao variante="contorno">Contorno</Botao>
          <Botao variante="fantasma">Fantasma</Botao>
          <Botao variante="perigo">Perigo</Botao>
          <Botao carregando>Carregando</Botao>
          <Botao disabled>Desabilitado</Botao>
          <Botao href="/" variante="contorno" tamanho="pequeno">
            Link interno
          </Botao>
        </div>
      </Bloco>

      <Bloco titulo="Selos e alertas">
        <div className="flex flex-wrap gap-2">
          <Selo>Neutro</Selo>
          <Selo variante="primaria" icone={Star}>
            Primária
          </Selo>
          <Selo variante="info">Informação</Selo>
          <Selo variante="sucesso" pulsar>
            Sucesso
          </Selo>
          <Selo variante="aviso">Aviso</Selo>
          <Selo variante="erro">Erro</Selo>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Alerta variante="informacao" titulo="Informação" role={null}>
            Texto de apoio.
          </Alerta>
          <Alerta variante="sucesso" titulo="Sucesso" role={null}>
            Tudo certo.
          </Alerta>
          <Alerta variante="aviso" titulo="Aviso" role={null}>
            Atenção a isto.
          </Alerta>
          <Alerta variante="erro" titulo="Erro" role={null}>
            Algo deu errado.
          </Alerta>
        </div>
      </Bloco>

      <Bloco titulo="Campos">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id={`${prefixo}-nome`} rotulo="Nome" dica="Como aparece para a organização" obrigatorio>
            <Input placeholder="Seu nome" />
          </Campo>
          <Campo id={`${prefixo}-email`} rotulo="E-mail" erro="Informe um e-mail válido.">
            <Input defaultValue="publico@" />
          </Campo>
          <Campo id={`${prefixo}-sel`} rotulo="Opção">
            <Select defaultValue="b">
              <option value="a">Opção A</option>
              <option value="b">Opção B</option>
            </Select>
          </Campo>
          <Campo id={`${prefixo}-txt`} rotulo="Descrição">
            <Textarea defaultValue="Texto longo" />
          </Campo>
        </div>
        <Checkbox id={`${prefixo}-chk`} rotulo="Concordo com os termos" />
      </Bloco>

      <Bloco titulo="Abas">
        <Abas
          rotulo="Exemplo de abas"
          abas={[
            { id: "a", rotulo: "Entrar", conteudo: <p>Conteúdo da aba Entrar.</p> },
            { id: "b", rotulo: "Criar conta", conteudo: <p>Conteúdo da aba Criar conta.</p> },
            { id: "c", rotulo: "Desabilitada", desabilitada: true, dica: "Indisponível neste estado.", conteudo: null },
          ]}
        />
      </Bloco>

      <Bloco titulo="Cartão, carregamento e contagem">
        <Cartao className="flex flex-col gap-3">
          <Carregando />
          <Esqueleto className="h-4 w-2/3" />
          <p>
            Encerra em <ContagemRegressiva alvoMs={agora + 3 * 3600_000 + 125_000} rotulo="Encerra em" textoZerado="Encerrada" />
          </p>
        </Cartao>
      </Bloco>

      <Bloco titulo="Imagens de candidato e logo">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {["placeholder:1", "placeholder:2", "placeholder:3", "placeholder:4", null].map((url, i) => (
            <ImagemCandidato key={i} titulo={url ? `Candidato ${i + 1}` : "Sem imagem"} imagemUrl={url} />
          ))}
        </div>
        <LogoEvento nome={tema.nomeExibicao ?? nome} logoUrl={tema.logoUrl} />
      </Bloco>

      <Bloco titulo="Diálogos e toast">
        <div className="flex flex-wrap gap-2">
          <Botao variante="contorno" onClick={() => setDialogo(true)}>
            Abrir diálogo
          </Botao>
          <Botao variante="contorno" onClick={() => setConfirmacao(true)}>
            Confirmação com digitação
          </Botao>
          <Botao variante="contorno" onClick={() => mostrarToast("Aviso de exemplo.", "sucesso")}>
            Mostrar toast
          </Botao>
        </div>
        <Dialogo
          aberto={dialogo}
          aoFechar={() => setDialogo(false)}
          titulo="Diálogo de exemplo"
          descricao="Foco preso, Esc fecha, foco volta ao botão."
          rodape={<Botao onClick={() => setDialogo(false)}>Fechar</Botao>}
        >
          <p>No celular, aparece como bottom sheet.</p>
        </Dialogo>
        <DialogoConfirmacao
          aberto={confirmacao}
          aoFechar={() => setConfirmacao(false)}
          aoConfirmar={() => setConfirmacao(false)}
          titulo="Encerrar a votação?"
          consequencia="Ninguém mais poderá votar. Esta ação não pode ser desfeita."
          rotuloConfirmar="Encerrar"
          confirmarDigitando="ENCERRAR"
        />
      </Bloco>

      <Bloco titulo="Contraste (política D15)">
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {pares.map((p) => (
            <li key={p.par} className="flex justify-between gap-2 border-b border-tema-borda py-1">
              <span>{p.par}</span>
              <span className={p.razao >= p.minimo ? "text-tema-sucesso" : "text-tema-erro"}>
                {formatarDecimal(p.razao)}:1 {p.razao >= p.minimo ? "✓" : "✗"}
              </span>
            </li>
          ))}
        </ul>
      </Bloco>
    </TemaEvento>
  );
}

/** Galeria de componentes nos dois temas (Etapa 0, CP7). */
export function GaleriaUi() {
  const temas = useTemas();
  const eventos = useEventos();
  return (
    <main id="conteudo" className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Galeria de componentes</h1>
      {temas.map((tema) => (
        <Amostra key={tema.eventoId} tema={tema} nome={eventos.find((e) => e.id === tema.eventoId)?.nome ?? tema.eventoId} />
      ))}
    </main>
  );
}
