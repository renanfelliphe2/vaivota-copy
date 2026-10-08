"use client";

import { ChevronDown, Gavel, LogIn, LogOut, UserPlus, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { CartaoAcesso } from "@/components/auth/CartaoAcesso";
import { Botao } from "@/components/ui/Botao";
import { Dialogo } from "@/components/ui/Dialogo";
import { ROTULO_PAPEL } from "@/lib/rotulos";
import { sair } from "@/servicos/sessao";
import { abrirAcesso, fecharAcesso } from "@/store/acoesAcesso";
import { useUi } from "@/store/seletores/dev";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useSessao } from "@/store/seletores/sessao";
import { useVisaoEvento } from "@/store/seletores/visao";

/**
 * Menu do usuário (Etapa 3, assume o provisório da Etapa 2). Deslogado: "Entrar" e "Criar conta" abrem o painel de acesso
 * num diálogo (`ui.acesso`, 08/10/2026); "Criar conta" só com o evento ATIVO (D7). Logado: nome, papel, convite e "Sair".
 */
export function MenuUsuario() {
  const ativo = useEventoAtivo();
  const sessao = useSessao();
  const visao = useVisaoEvento();
  const { acesso } = useUi();
  const router = useRouter();
  const pathname = usePathname();
  const painelId = useId();
  const [menuAberto, setMenuAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuAberto) return;
    const fora = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setMenuAberto(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuAberto(false);
        botao.current?.focus();
      }
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [menuAberto]);

  if (!ativo) return null;
  const slug = ativo.slug;

  if (!sessao.logado) {
    // Fora da entrada, volta para a tela atual depois do login.
    const deAtual = pathname === `/e/${slug}` || pathname === "/" ? undefined : pathname;
    const podeCriar = ativo.evento.estado === "ATIVO";
    return (
      <>
        <div className="flex items-center gap-2">
          <Botao variante="contorno" tamanho="pequeno" onClick={() => abrirAcesso("entrar", deAtual)} icone={<LogIn aria-hidden className="size-4" />}>
            Entrar
          </Botao>
          {podeCriar && (
            // No celular só "Entrar" cabe ao lado da logo; o diálogo tem a aba "Criar conta".
            <span className="hidden sm:block">
              <Botao tamanho="pequeno" onClick={() => abrirAcesso("criar", deAtual)} icone={<UserPlus aria-hidden className="size-4" />}>
                Criar conta
              </Botao>
            </span>
          )}
        </div>
        <Dialogo aberto={acesso !== null} aoFechar={fecharAcesso} titulo="Acesso ao evento">
          {acesso && <CartaoAcesso key={acesso.aba} de={acesso.de} abaInicial={acesso.aba} aoConcluir={fecharAcesso} />}
        </Dialogo>
      </>
    );
  }

  const usuario = sessao.usuario!;
  const papel = sessao.papel ? ROTULO_PAPEL[sessao.papel] : "Visitante";

  const aoSair = async () => {
    setSaindo(true);
    const r = await sair();
    setSaindo(false);
    if (r.ok) {
      setMenuAberto(false);
      router.push(`/e/${slug}`);
    }
  };

  return (
    <div ref={raiz} className="relative">
      <button
        ref={botao}
        type="button"
        aria-expanded={menuAberto}
        aria-controls={painelId}
        onClick={() => setMenuAberto((a) => !a)}
        className="inline-flex min-h-11 max-w-[14rem] items-center gap-2 rounded-full border border-tema-borda px-3 text-sm hover:bg-tema-superficie"
      >
        <UserRound aria-hidden className="size-4 shrink-0" />
        {/* No celular o cabeçalho fixo divide a linha com os atalhos: só o ícone (o nome segue no painel do menu). */}
        <span className="hidden min-w-0 flex-col items-start leading-tight sm:flex">
          <span className="max-w-full truncate font-semibold">{usuario.nome}</span>
          <span className="text-xs text-tema-texto-suave">{papel}</span>
        </span>
        <ChevronDown aria-hidden className="size-4 shrink-0" />
        <span className="sr-only">
          <span className="sm:hidden">{usuario.nome}, {papel}. </span>Menu da conta
        </span>
      </button>
      {menuAberto && (
        <div
          id={painelId}
          className="absolute right-0 z-30 mt-2 flex w-72 flex-col gap-1 rounded-xl border border-tema-borda bg-tema-fundo p-2 shadow-xl"
        >
          <div className="px-3 py-2 text-sm">
            <p className="font-semibold">{usuario.nome}</p>
            <p className="break-all text-tema-texto-suave">{usuario.email}</p>
            <p className="mt-1 text-tema-texto-suave">
              Papel neste evento: <strong className="text-tema-texto">{papel}</strong>
            </p>
          </div>
          {visao?.mostrarCodigoConvite && (
            <Link
              href={`/e/${slug}/convite`}
              onClick={() => setMenuAberto(false)}
              className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm hover:bg-tema-superficie"
            >
              <Gavel aria-hidden className="size-4" />
              Tenho um código de convite
            </Link>
          )}
          <button
            type="button"
            onClick={() => void aoSair()}
            disabled={saindo}
            aria-busy={saindo || undefined}
            className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-tema-superficie disabled:opacity-60"
          >
            <LogOut aria-hidden className="size-4" />
            {saindo ? "Saindo…" : "Sair"}
          </button>
        </div>
      )}
    </div>
  );
}
