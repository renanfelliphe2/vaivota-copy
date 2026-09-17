import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 bg-white font-sans">
      {/* Header */}
      <header className="w-full border-b border-zinc-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Image
            src="/festival-ver-e-fazer-filmes-logo.webp"
            alt="9º Festival Ver e Fazer Filmes - Cataguases 2026"
            width={220}
            height={64}
            className="h-10 w-auto sm:h-12"
            priority
          />
          <a
            href="#votar"
            className="hidden rounded-full bg-[#F15A29] px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 sm:inline-block"
          >
            Votar agora
          </a>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center">
        <section className="w-full bg-gradient-to-b from-[#8DC63F]/10 to-white px-6 py-20 text-center">
          <span className="inline-block rounded-full bg-[#8DC63F]/15 px-4 py-1 text-sm font-medium text-[#5f8a1f]">
            Cataguases · 2026
          </span>
          <h1 className="mx-auto mt-6 max-w-2xl text-4xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-5xl">
            Vote nos melhores curtas do{" "}
            <span className="text-[#F15A29]">9º Festival Ver e Fazer Filmes</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-zinc-600">
            Uma plataforma feita para o público viver o concurso de
            curtas-metragens de pertinho: assista, vote e acompanhe seus
            favoritos em tempo real.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              id="votar"
              href="#"
              className="rounded-full bg-[#F15A29] px-8 py-3 text-base font-semibold text-white transition hover:opacity-90"
            >
              Quero votar
            </a>
            <a
              href="https://festivalverefazerfilmes.org.br/"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-zinc-300 px-8 py-3 text-base font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Sobre o festival
            </a>
          </div>
        </section>

        {/* Como funciona */}
        <section className="w-full max-w-5xl px-6 py-20">
          <h2 className="text-center text-2xl font-bold text-zinc-900 sm:text-3xl">
            Como funciona
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              {
                titulo: "Assista",
                texto:
                  "Confira os curtas-metragens selecionados para esta edição do festival.",
                cor: "#8DC63F",
              },
              {
                titulo: "Vote",
                texto:
                  "Escolha seus favoritos e envie seu voto em poucos cliques.",
                cor: "#F15A29",
              },
              {
                titulo: "Acompanhe",
                texto:
                  "Veja o resultado e a repercussão do concurso em tempo real.",
                cor: "#8DC63F",
              },
            ].map((item) => (
              <div key={item.titulo} className="text-center">
                <div
                  className="mx-auto mb-4 h-2 w-12 rounded-full"
                  style={{ backgroundColor: item.cor }}
                />
                <h3 className="text-lg font-semibold text-zinc-900">
                  {item.titulo}
                </h3>
                <p className="mt-2 text-zinc-600">{item.texto}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-100 px-6 py-8 text-center text-sm text-zinc-500">
        9º Festival Ver e Fazer Filmes · Cataguases / 2026
      </footer>
    </div>
  );
}
