import { describe, expect, it } from "vitest";
import { validarValorCampo } from "./validacoesConfig";
import { videoIncorporado } from "./video";

describe("campo VIDEO (25/11/2026)", () => {
  it("monta o embed do YouTube a partir dos formatos comuns", () => {
    const esperado = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ";
    for (const link of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ&feature=share",
      "https://youtube.com/shorts/dQw4w9WgXcQ",
    ])
      expect(videoIncorporado(link)?.src).toBe(esperado);
    expect(videoIncorporado("https://youtu.be/dQw4w9WgXcQ?t=42")?.src).toBe(`${esperado}?start=42`);
  });

  it("monta o embed do Vimeo (com o hash do vídeo não listado) e do Google Drive", () => {
    expect(videoIncorporado("https://vimeo.com/123456789")?.src).toBe("https://player.vimeo.com/video/123456789");
    expect(videoIncorporado("https://vimeo.com/123456789/abc123def")?.src).toBe("https://player.vimeo.com/video/123456789?h=abc123def");
    expect(videoIncorporado("https://player.vimeo.com/video/123456789?h=ff00")?.src).toBe("https://player.vimeo.com/video/123456789?h=ff00");
    expect(videoIncorporado("https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing")?.src).toBe(
      "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/preview",
    );
  });

  it("recusa outros sites e links que não são de vídeo", () => {
    expect(videoIncorporado("https://exemplo.com/video.mp4")).toBeNull();
    expect(videoIncorporado("https://www.youtube.com/@canal")).toBeNull();
    expect(videoIncorporado("javascript:alert(1)")).toBeNull();
    expect(videoIncorporado("https://youtube.com.malicioso.net/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(validarValorCampo("trailer", "VIDEO", "youtu.be/dQw4w9WgXcQ")).toBeNull();
    expect(validarValorCampo("trailer", "VIDEO", "https://exemplo.com")).toMatch(/YouTube/);
  });
});
