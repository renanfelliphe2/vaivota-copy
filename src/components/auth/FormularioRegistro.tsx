"use client";

import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { AvisoPrivacidade } from "@/components/evento/AvisoPrivacidade";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Campo, Checkbox, Input } from "@/components/ui/Campo";
import { validarFormatoCodigo } from "@/lib/codigos";
import { validarEmail, validarNome } from "@/lib/validarAcesso";
import { registrar } from "@/servicos/auth";
import { useEventoAtivo } from "@/store/seletores/evento";
import { BotaoGoogle } from "./BotaoGoogle";
import { CampoCodigoConvite } from "./CampoCodigoConvite";
import { SeletorPapel, type PapelRegistro } from "./SeletorPapel";

type Erros = Partial<Record<"nome" | "email" | "codigo" | "aceite", string>>;

const ERROS_DE_CODIGO = ["CODIGO_INVALIDO", "CODIGO_USADO", "CODIGO_REVOGADO", "CODIGO_EXPIRADO", "LIMITE_TENTATIVAS"];
const DICA_GOOGLE_JURADO =
  "Para entrar como jurado, crie a conta com seu e-mail, ou entre com Google e resgate o código depois em 'Tenho um código de convite'.";

/** Registro sem senha (Etapa 3): Público ou Jurado (com código), seguido da tela de código. */
export function FormularioRegistro({ de, aoConcluir }: { de?: string; aoConcluir?: () => void }) {
  const ativo = useEventoAtivo();
  const router = useRouter();
  const id = useId();
  const [papel, setPapel] = useState<PapelRegistro>("PUBLICO");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [aceite, setAceite] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  if (!ativo) return null;
  const { evento } = ativo;
  const jurado = evento.moduloJuri && papel === "JURADO";
  const metodo = evento.metodoIdentificacao;
  const comEmail = metodo !== "SOMENTE_GOOGLE";
  const comGoogle = metodo !== "SOMENTE_EMAIL";
  const dicaGoogleId = `${id}-dica-google`;

  const validar = (): Erros => {
    const novos: Erros = {};
    const n = validarNome(nome);
    const e = validarEmail(email);
    if (n) novos.nome = n;
    if (e) novos.email = e;
    if (jurado && !validarFormatoCodigo(codigo)) novos.codigo = "Digite o código completo, no formato XXXX-XXXX.";
    if (!aceite) novos.aceite = "Marque a caixa para continuar.";
    return novos;
  };

  const enviar = async (evt: FormEvent) => {
    evt.preventDefault();
    if (enviando) return;
    const novos = validar();
    setErros(novos);
    setErroGeral(null);
    if (Object.keys(novos).length > 0) return;
    setEnviando(true);
    const r = await registrar(evento.id, { nome, email, papel: jurado ? "JURADO" : "PUBLICO", codigo, aceite, de });
    setEnviando(false);
    if (!r.ok) {
      if (r.erro.campos) setErros(r.erro.campos as Erros);
      else if (ERROS_DE_CODIGO.includes(r.erro.codigo)) setErros({ codigo: r.erro.mensagem });
      else setErroGeral(r.erro.mensagem);
      return;
    }
    aoConcluir?.();
    router.push(r.dados.destino);
  };

  const seletor = evento.moduloJuri && <SeletorPapel valor={papel} aoMudar={setPapel} />;

  if (!comEmail) {
    // SOMENTE_GOOGLE: sem formulário de e-mail. O caminho Jurado resgata o código depois de entrar.
    return (
      <div className="flex flex-col gap-4">
        {seletor}
        {erroGeral && <Alerta variante="erro">{erroGeral}</Alerta>}
        <BotaoGoogle de={de} aoConcluir={aoConcluir} desabilitado={jurado} dicaId={jurado ? dicaGoogleId : undefined} />
        {jurado && (
          <p id={dicaGoogleId} className="text-sm text-tema-texto-suave">
            {DICA_GOOGLE_JURADO}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      {erroGeral && (
        <Alerta variante="erro">
          {erroGeral}
        </Alerta>
      )}
      {seletor}
      <Campo id={`${id}-nome`} rotulo="Nome" erro={erros.nome} obrigatorio>
        <Input
          autoComplete="name"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onBlur={() => nome && setErros((x) => ({ ...x, nome: validarNome(nome) ?? undefined }))}
        />
      </Campo>
      <Campo id={`${id}-email`} rotulo="E-mail" erro={erros.email} obrigatorio dica="Enviaremos um código de 6 números para confirmar.">
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => email && setErros((x) => ({ ...x, email: validarEmail(email) ?? undefined }))}
        />
      </Campo>
      {jurado && <CampoCodigoConvite id={`${id}-codigo`} valor={codigo} aoMudar={setCodigo} erro={erros.codigo} />}
      <Checkbox
        id={`${id}-aceite`}
        checked={aceite}
        onChange={(e) => setAceite(e.target.checked)}
        erro={erros.aceite}
        rotulo="Li e concordo que meu nome e e-mail sejam usados só para identificar minha participação neste evento. Meu voto é sigiloso: ele não fica ligado aos meus dados."
      />
      <div className="-mt-2 flex flex-wrap gap-x-4 pl-8 text-sm text-tema-primaria-texto">
        <AvisoPrivacidade />
        {evento.avisoPrivacidadeUrl && (
          <a
            href={evento.avisoPrivacidadeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1 underline underline-offset-2 hover:no-underline"
          >
            Aviso de privacidade do evento
            <ExternalLink aria-hidden className="size-3.5" />
            <span className="sr-only">(abre em nova aba)</span>
          </a>
        )}
      </div>
      <Botao type="submit" larguraTotal carregando={enviando}>
        {jurado ? "Criar conta de jurado" : "Criar conta"}
      </Botao>
      {comGoogle && (
        <>
          <div className="flex items-center gap-3 text-sm text-tema-texto-suave" aria-hidden>
            <span className="h-px flex-1 bg-tema-borda" />
            ou
            <span className="h-px flex-1 bg-tema-borda" />
          </div>
          <BotaoGoogle de={de} aoConcluir={aoConcluir} desabilitado={jurado} dicaId={jurado ? dicaGoogleId : undefined} />
          {jurado && (
            <p id={dicaGoogleId} className="text-sm text-tema-texto-suave">
              {DICA_GOOGLE_JURADO}
            </p>
          )}
        </>
      )}
    </form>
  );
}
