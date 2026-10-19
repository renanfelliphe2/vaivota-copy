import Image from "next/image";
import { cx } from "@/lib/classes";

export type MarcaOrganizador = {
  nome: string;
  /** Logo colorido, para fundo claro. */
  logo: string;
  /** Mesmo logo com o texto branco, para fundo escuro. */
  logoClaro: string;
  largura: number;
  altura: number;
  /** Fração da altura do logo ocupada pelo símbolo (as montanhas), acima do nome. */
  fracaoSimbolo: number;
};

/**
 * Organizador da Maratona Tech Tivit (19/10/2026): o Rio Pomba Valley, cujo logo assina as artes do evento
 * (public/*-tivit.png). O tema ainda não tem campo para a marca do organizador; até ter, ela fica aqui e aparece no
 * hero, no cabeçalho e no rodapé da página do evento. Para outro evento, troque ou use null.
 */
export const MARCA_ORGANIZADOR: MarcaOrganizador | null = {
  nome: "Rio Pomba Valley",
  logo: "/logo-rpv-standard.png",
  logoClaro: "/logo-rpv-white-bottom-border.png",
  largura: 521,
  altura: 382,
  fracaoSimbolo: 0.42,
};

/** Logo inteiro do organizador. Altura pelas classes, largura automática. */
export function LogoOrganizador({
  marca,
  claro = false,
  className,
  prioridade,
}: {
  marca: MarcaOrganizador;
  /** Versão de texto branco, para fundo escuro. */
  claro?: boolean;
  className?: string;
  prioridade?: boolean;
}) {
  return (
    <Image
      src={claro ? marca.logoClaro : marca.logo}
      alt={marca.nome}
      width={marca.largura}
      height={marca.altura}
      // Exibido com 4 a 6rem de largura: sem `sizes`, o next/image serviria a versão de 640px.
      sizes="6rem"
      loading={prioridade ? "eager" : undefined}
      fetchPriority={prioridade ? "high" : undefined}
      className={cx("w-auto", className)}
    />
  );
}

/**
 * Só o símbolo (as montanhas), recortado do logo colorido sem gerar outro arquivo: a moldura tem a proporção do
 * símbolo e o logo, na largura dela, fica preso ao topo. Decorativo (o nome do evento vem ao lado). Altura e `display`
 * pelas classes (como item flex, a moldura já vira bloco).
 */
export function SimboloOrganizador({ marca, className }: { marca: MarcaOrganizador; className?: string }) {
  return (
    <span
      aria-hidden
      className={cx("relative shrink-0 overflow-hidden", className)}
      style={{ aspectRatio: `${marca.largura} / ${Math.round(marca.altura * marca.fracaoSimbolo)}` }}
    >
      <Image
        src={marca.logo}
        alt=""
        width={marca.largura}
        height={marca.altura}
        sizes="8rem"
        className="absolute inset-x-0 top-0 h-auto w-full max-w-none"
      />
    </span>
  );
}
