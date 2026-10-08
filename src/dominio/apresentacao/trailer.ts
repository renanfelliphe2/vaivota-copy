// Etapa 8 (D11, seção 5.8): link do YouTube ou do Vimeo → URL de embed (sem mudo, C19), ou null.

const ID_YOUTUBE = /^[A-Za-z0-9_-]{11}$/;
const ID_VIMEO = /^\d{6,12}$/;

export function interpretarLinkTrailer(url: string | null | undefined): string | null {
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
  if (youtube) return ID_YOUTUBE.test(youtube) ? `https://www.youtube-nocookie.com/embed/${youtube}?autoplay=1&rel=0` : null;

  let vimeo: string | null = null;
  if (host === "vimeo.com" && partes[0]) vimeo = partes[0];
  else if (host === "player.vimeo.com" && partes[0] === "video" && partes[1]) vimeo = partes[1];
  if (vimeo) return ID_VIMEO.test(vimeo) ? `https://player.vimeo.com/video/${vimeo}?autoplay=1` : null;
  return null;
}
