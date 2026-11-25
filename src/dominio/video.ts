// Campo extra do tipo VIDEO (25/11/2026): o vídeo não é armazenado; o campo guarda o link e a página o mostra num iframe.
// Só provedores conhecidos viram iframe, e sempre pelo endereço de embed montado aqui (nunca o link digitado como `src`).

export type VideoIncorporado = { provedor: "YouTube" | "Vimeo" | "Google Drive"; src: string };

const ID_YOUTUBE = /^[A-Za-z0-9_-]{6,20}$/;

/** O endereço de embed de um link de vídeo, ou null se o link não é de um provedor aceito. */
export function videoIncorporado(valor: string): VideoIncorporado | null {
  let url: URL;
  try {
    url = new URL(valor.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
  const partes = url.pathname.split("/").filter(Boolean);

  if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "youtu.be") {
    const id =
      host === "youtu.be"
        ? partes[0]
        : partes[0] === "watch"
          ? url.searchParams.get("v")
          : ["embed", "shorts", "live", "v"].includes(partes[0] ?? "")
            ? partes[1]
            : null;
    if (!id || !ID_YOUTUBE.test(id)) return null;
    const inicio = Number.parseInt(url.searchParams.get("t") ?? url.searchParams.get("start") ?? "", 10);
    return { provedor: "YouTube", src: `https://www.youtube-nocookie.com/embed/${id}${inicio > 0 ? `?start=${inicio}` : ""}` };
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const i = partes.findIndex((p) => /^\d+$/.test(p));
    if (i < 0) return null;
    // Vídeo não listado: vimeo.com/<id>/<hash> ou ?h=<hash>.
    const hash = url.searchParams.get("h") ?? (partes[i + 1] && /^[0-9a-f]+$/i.test(partes[i + 1]) ? partes[i + 1] : null);
    return { provedor: "Vimeo", src: `https://player.vimeo.com/video/${partes[i]}${hash ? `?h=${hash}` : ""}` };
  }

  if (host === "drive.google.com") {
    const i = partes.indexOf("d");
    const id = partes[0] === "file" && i >= 0 ? partes[i + 1] : url.searchParams.get("id");
    if (!id || !/^[A-Za-z0-9_-]{10,}$/.test(id)) return null;
    return { provedor: "Google Drive", src: `https://drive.google.com/file/d/${id}/preview` };
  }

  return null;
}
