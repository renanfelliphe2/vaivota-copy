import { hrefDoCampo } from "@/dominio/camposExtras";
import { videoIncorporado } from "@/dominio/video";
import { cx } from "@/lib/classes";

/**
 * O player de um campo VIDEO (25/11/2026): iframe do provedor, em 16:9, carregado só quando chega perto da tela. O `src` é
 * sempre o endereço de embed montado em dominio/video.ts; link de outro site não vira iframe (aparece como link comum).
 */
export function VideoCampo({ valor, titulo, className }: { valor: string; titulo: string; className?: string }) {
  const video = videoIncorporado(valor);
  if (!video)
    return (
      <a href={hrefDoCampo(valor) ?? undefined} target="_blank" rel="noopener noreferrer" className="break-all underline">
        {valor}
      </a>
    );
  return (
    <div className={cx("relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-lg ring-1 ring-black/10", className)}>
      <iframe
        src={video.src}
        title={`${titulo} (vídeo do ${video.provedor})`}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        className="absolute inset-0 size-full border-0"
      />
    </div>
  );
}
