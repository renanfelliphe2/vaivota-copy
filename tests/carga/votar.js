// ST6: teste de carga do voto (k6). Preparação: `pnpm db:carga-preparar --usuarios 500` (gera tests/carga/sessoes.json).
//
//   k6 run -e BASE_URL=https://votacao.exemplo.space -e VUS=300 tests/carga/votar.js
//
// Cada usuário virtual é uma pessoa diferente (uma sessão do arquivo), que lê o estado e vota uma vez, com uma pausa
// parecida com a de quem confere a tela. Depois, `pnpm db:carga-conferir`: votos = participações que votaram, sem duplicados.
// Defina VUS até o número de sessões geradas. Limites: quase nenhum erro e p95 do voto abaixo de 1,5 s.
import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import exec from "k6/execution";

const base = __ENV.BASE_URL || "http://localhost:3000";
const dados = JSON.parse(open("./sessoes.json"));
const sessoes = new SharedArray("sessoes", () => dados.sessoes);
const vus = Number(__ENV.VUS || 100);

export const options = {
  scenarios: {
    votacao: {
      executor: "per-vu-iterations",
      vus,
      iterations: 1,
      maxDuration: __ENV.MAX_DURACAO || "5m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{servico:votarPopular}": ["p(95)<1500"],
    checks: ["rate>0.99"],
  },
};

function chamar(nome, args, sessao) {
  return http.post(`${base}/api/servico/${nome}`, JSON.stringify({ args }), {
    headers: { "Content-Type": "application/json", Origin: base, Cookie: sessao.cookie },
    tags: { servico: nome },
  });
}

export default function () {
  const sessao = sessoes[exec.vu.idInInstance - 1];
  if (!sessao) throw new Error("Há mais VUS do que sessões em sessoes.json.");

  // Chegada escalonada: o público entra aos poucos, não todo no mesmo milissegundo.
  sleep(Math.random() * (Number(__ENV.ESPALHAR_S) || 20));

  const estado = chamar("obterEstado", {}, sessao);
  check(estado, { "estado 200": (r) => r.status === 200 });
  sleep(1 + Math.random() * 4); // lê a lista e escolhe

  const candidato = dados.candidatos[Math.floor(Math.random() * dados.candidatos.length)];
  const voto = chamar("votarPopular", { eventoId: dados.eventoId, candidatoId: candidato }, sessao);
  check(voto, {
    "voto 200": (r) => r.status === 200,
    "voto registrado": (r) => r.json("ok") === true,
  });

  // Quem vê o aviso de sucesso e confere o estado: confirma que votou.
  const confere = chamar("consultarEstadoVoto", { eventoId: dados.eventoId }, sessao);
  check(confere, { "consulta diz que votou": (r) => r.json("dados.votou") === true });
}
