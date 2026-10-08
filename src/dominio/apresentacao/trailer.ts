// Etapa 8 (D11, seção 5.8): link do YouTube ou do Vimeo → URL de embed (sem mudo, C19), ou null.
// 08/10/2026: o telão é uma aba própria, que pode nunca ter recebido um clique; sem isso o navegador só deixa o vídeo
// começar sozinho se estiver mudo. `mudo` pede o início mudo, com a API do player ligada para o som voltar no
// primeiro toque no telão (CenaTrailer). A API do YouTube fica sempre ligada: o som baixa junto com a imagem na
// saída do trailer (comandoVolume).

const ID_YOUTUBE = /^[A-Za-z0-9_-]{11}$/;
const ID_VIMEO = /^\d{6,12}$/;

export function interpretarLinkTrailer(url: string | null | undefined, opcoes: { mudo?: boolean } = {}): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\.|^m\./, "");
  const partes = u.pathname.split("/").filter(Boolean);
  let youtube: string | null = null;
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (partes[0] === "watch") youtube = u.searchParams.get("v");
    else if ((partes[0] === "embed" || partes[0] === "shorts") && partes[1]) youtube = partes[1];
  } else if (host === "youtu.be" && partes[0]) {
    youtube = partes[0];
  }
  if (youtube)
    return ID_YOUTUBE.test(youtube)
      ? `https://www.youtube-nocookie.com/embed/${youtube}?autoplay=1&rel=0${opcoes.mudo ? "&mute=1&playsinline=1" : ""}&enablejsapi=1`
      : null;

  let vimeo: string | null = null;
  if (host === "vimeo.com" && partes[0]) vimeo = partes[0];
  else if (host === "player.vimeo.com" && partes[0] === "video" && partes[1]) vimeo = partes[1];
  if (vimeo) return ID_VIMEO.test(vimeo) ? `https://player.vimeo.com/video/${vimeo}?autoplay=1${opcoes.mudo ? "&muted=1&playsinline=1" : ""}` : null;
  return null;
}

/** Comando de "tirar o mudo" para o player do embed (postMessage), conforme o provedor. */
export function comandoTirarMudo(embedUrl: string): string | null {
  if (embedUrl.includes("youtube")) return JSON.stringify({ event: "command", func: "unMute", args: [] });
  if (embedUrl.includes("vimeo")) return JSON.stringify({ method: "setMuted", value: false });
  return null;
}

/** Comando de volume (`fracao` de 0 a 1) para o player do embed (postMessage), conforme o provedor. */
export function comandoVolume(embedUrl: string, fracao: number): string | null {
  const v = Math.max(0, Math.min(1, fracao));
  if (embedUrl.includes("youtube")) return JSON.stringify({ event: "command", func: "setVolume", args: [Math.round(v * 100)] });
  if (embedUrl.includes("vimeo")) return JSON.stringify({ method: "setVolume", value: v });
  return null;
}
