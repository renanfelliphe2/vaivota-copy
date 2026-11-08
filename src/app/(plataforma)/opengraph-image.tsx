import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Prévia da landing ao compartilhar o link (WhatsApp, redes sociais), 07/11/2026. Só para "/": este arquivo fica no
// grupo (plataforma), então as páginas dos eventos não herdam a prévia da VaiVota. Imagem estática (gerada no build).

export const alt = "VaiVota: votação ao vivo para festivais, mostras e premiações. Quem decide é a plateia; a urna fica com a gente.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const LINHA_1 = "Quem decide é a plateia.";
const LINHA_2 = "A urna fica com a gente.";
// Três cabem numa linha só com a fonte da marca.
const CHIPS = ["Público pelo celular", "Júri por convite", "Crianças no totem"];

/**
 * Poppins (a fonte da marca) do Google Fonts, só com as letras usadas. Sem rede no build, a imagem sai com a fonte padrão
 * do next/og: melhor uma prévia com outra fonte do que nenhuma.
 */
async function poppins(peso: number, texto: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Poppins:wght@${peso}&text=${encodeURIComponent(texto)}`)).text();
    const fonte = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(css)?.[1];
    if (!fonte) return null;
    const resposta = await fetch(fonte);
    return resposta.ok ? await resposta.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Image() {
  const logo = await readFile(join(process.cwd(), "public/vaivota-logo.png"));
  const textoTodo = [LINHA_1, LINHA_2, ...CHIPS].join("");
  const [negrito, medio] = await Promise.all([poppins(700, textoTodo), poppins(500, textoTodo)]);
  const fontes = [
    ...(negrito ? [{ name: "Poppins", data: negrito, weight: 700 as const, style: "normal" as const }] : []),
    ...(medio ? [{ name: "Poppins", data: medio, weight: 500 as const, style: "normal" as const }] : []),
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 72px",
          position: "relative",
          color: "#ffffff",
          fontFamily: fontes.length ? "Poppins" : undefined,
          // Brilhos do palco (turquesa no alto à direita, âmbar embaixo à esquerda) no próprio fundo: um elemento que começa
          // fora da imagem sai cortado pelo Satori.
          backgroundImage: [
            "radial-gradient(circle at 88% 12%, rgba(2,153,179,0.55) 0%, rgba(2,153,179,0) 45%)",
            "radial-gradient(circle at 0% 100%, rgba(251,170,56,0.30) 0%, rgba(251,170,56,0) 40%)",
            "linear-gradient(160deg, #031a2d 0%, #04294a 55%, #054573 100%)",
          ].join(", "),
        }}
      >

        <div style={{ display: "flex", alignSelf: "flex-start", backgroundColor: "#ffffff", borderRadius: 28, padding: "16px 26px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse desenha <img>, não next/image */}
          <img src={`data:image/png;base64,${logo.toString("base64")}`} width={286} height={84} alt="" />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 80, fontWeight: 700, lineHeight: 1.04, letterSpacing: -2 }}>{LINHA_1}</div>
          <div style={{ fontSize: 80, fontWeight: 700, lineHeight: 1.04, letterSpacing: -2, color: "#7fd3e2" }}>{LINHA_2}</div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          {CHIPS.map((chip, i) => (
            <div
              key={chip}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 24px",
                borderRadius: 9999,
                fontSize: 26,
                fontWeight: 500,
                backgroundColor: "rgba(255,255,255,0.10)",
                border: "2px solid rgba(255,255,255,0.22)",
              }}
            >
              <div style={{ display: "flex", width: 12, height: 12, borderRadius: 9999, backgroundColor: i % 2 ? "#FBAA38" : "#0299b3" }} />
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts: fontes.length ? fontes : undefined },
  );
}
