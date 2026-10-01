# VaiVota — Funcionalidade 2: Votação do Júri

> Status: definida em conversa, pronta para implementação.
> Depende de: `Login.md` (usuário, participação, urna, fluxo de voto).
> Stack: React/TS + Next.js.

## 1. Objetivo

Permitir que jurados convidados votem em um candidato por um fluxo quase idêntico ao do voto popular, com **apuração separada**, combinada ao placar popular por uma fórmula configurável. O voto do jurado é **identificado para o admin** e pode ser alterado até o fim da votação.

## 2. Escopo

**Dentro:**
- Códigos de convite individuais (geração em lote, resgate, revogação).
- Registro e login de jurado (reaproveita o fluxo do `Login.md`).
- Voto do júri (um candidato por jurado), com alteração até o fim da urna.
- Apuração do júri e placar combinado (popular + júri).
- Regras de desempate.

**Fora:**
- Notas por critério (Direção, Roteiro, Fotografia, Som): previsto, não implementado agora.
- Lista de impedimentos por conflito de interesse: futuro.
- Exibição do resultado (modo apresentação) e exportação (dashboard): arquivos próprios.

## 3. Decisões tomadas

| Tema | Decisão |
|---|---|
| Convite | **Código individual de uso único** por jurado, gerado em lote pelo admin |
| Tipo de voto | Voto simples (um candidato); modelo preparado para notas por critério |
| Urna | Mesma urna e mesma janela do voto popular |
| Sigilo | Voto do jurado **identificado para o admin**; opção de ser transparente no telão (desligada por padrão) |
| Alteração | Jurado pode mudar o voto **enquanto a urna estiver aberta**; histórico guardado |
| Fórmula | Percentual ponderado, configurável por evento (ex.: 70% popular / 30% júri) |
| Placares | Sempre exibir também o placar popular e o do júri separados |
| Desempate | Maior nota do júri **ou** do público, configurável por evento; por critério fica para depois |
| Participação | Um usuário, uma participação por evento (papel único: público **ou** jurado) |
| Painel do jurado | Mostra só a tela de voto, **sem contagens** |

## 4. Códigos de convite

- O admin informa **quantos jurados** o evento terá (n) e o sistema gera **n códigos** de uso único.
- Rótulo opcional por código (ex.: nome do jurado) para o admin saber quem é quem.
- Lista pode ser copiada ou baixada em CSV para distribuição.
- Armazenamento: **apenas o hash** do código; o valor legível aparece uma vez, na criação.
- Formato curto e fácil de digitar, sem caracteres ambíguos (0/O, 1/I).
- **Validade** configurável e **revogação** pelo admin (com geração de substituto).
- Limite de tentativas no campo de código (rate limiting).
- Auditoria: geração, resgate (quem e quando), revogação e tentativas inválidas.

## 5. Modelo de dados (conceitual)

Acrescenta ao modelo do `Login.md`:

- **ConviteJurado:** id, evento, hash do código, rótulo, validade, estado (`disponivel` | `usado` | `revogado`), participação que resgatou, resgatado em.
- **VotoJuri:** id, evento, **participação** (identificado), candidato, atualizado em.
  - Restrição única: `(participacao, evento)`.
  - Diferente do `Voto` popular, aqui **há vínculo** com a participação.
- **HistoricoVotoJuri:** id, voto do júri, candidato anterior, candidato novo, horário (alimenta a auditoria).
- **ConfigPlacar** (por evento): peso popular, peso júri, regra de desempate, exibir votos do júri no telão (booleano).

> Futuro, sem alterar o que existe: `Criterio` e `NotaJuri` (participação, candidato, critério, nota) para notas por critério.

## 6. Fluxo

1. **Registro como jurado:** switch **Jurado** no formulário, campo **Código de convite**, demais campos iguais ao registro comum. Login é padrão, sem código.
2. **Resgate para quem já tem conta:** opção "Tenho um código de convite" na conta logada.
3. **Validação do código:** existe, é deste evento, está disponível e dentro da validade.
   - Se o usuário **já votou como público** neste evento, o resgate é **bloqueado**.
4. **Participação com papel `jurado`** é criada (ou a existente, sem voto, é promovida).
5. **Tela de voto:** mesma lista e ordem embaralhada do fluxo popular, sem contagens.
6. **Confirmação:** grava `VotoJuri`. Nova confirmação enquanto a urna estiver aberta **substitui** o voto e registra no histórico.
7. **Tela de sucesso:** informa o voto atual e que ele pode ser alterado até o encerramento.

## 7. Apuração e placar

```
pontuação(candidato) =
    peso_popular × (votos_populares ÷ total_popular)
  + peso_juri    × (votos_juri     ÷ total_juri)
```

- Cada lado é normalizado antes de aplicar o peso, então o resultado não depende de quantas pessoas votaram.
- Pesos configuráveis por evento; devem somar 100%.
- **Desempate:** o critério configurado (maior votação do júri ou do público). Se persistir, sinalizar empate ao admin, sem decidir automaticamente.
- Modo apresentação e dashboard mostram o placar combinado **e** os dois placares separados.

## 8. Contestação e auditoria

- Como o voto é identificado, o admin consegue verificar em quem cada jurado votou e o histórico de alterações.
- Cenários cobertos: jurado alega voto diferente do registrado, voto não confirmado, suspeita de conflito de interesse, resultado apertado.
- A visão de votos identificados é **restrita ao admin**; jurados não veem votos de outros.
- Se "transparente no telão" estiver ligado, os votos do júri aparecem na revelação do resultado, nunca durante a votação.

## 9. Regras de negócio

- A urna só aceita votos de jurado com urna aberta.
- Um voto de júri por participação; alteração permitida só com urna aberta.
- Jurado não vota na apuração popular (papel único por evento).
- Após **Concluir Evento**, não há mais votos nem alterações; o papel de jurado permanece como histórico.
- Código revogado ou expirado não pode ser resgatado; um resgate já concluído não é desfeito.

## 10. Segurança e permissões

- Jurado acessa só a tela de voto; sem acesso a dashboard, configuração ou dados de terceiros.
- Validações sempre no servidor (papel, urna, código, unicidade).
- Rate limiting no resgate de código, login e voto.
- Geração, resgate e revogação de códigos e alterações de voto registradas em auditoria.

## 11. Critérios de aceitação

- [ ] Admin gera n códigos individuais e os baixa em CSV.
- [ ] Jurado se registra com o código; segundo uso do mesmo código é rejeitado.
- [ ] Usuário já logado resgata o código; quem já votou como público é bloqueado.
- [ ] Jurado vota, vê a confirmação e consegue alterar enquanto a urna está aberta.
- [ ] O histórico de alterações é registrado e consultável pelo admin.
- [ ] O painel do jurado não exibe contagens.
- [ ] O placar combina popular e júri conforme pesos configurados e mostra os placares separados.
- [ ] O desempate segue a regra configurada.
- [ ] Código revogado ou expirado não funciona.

## 12. Pendências

- Pesos padrão sugeridos (ex.: 70/30) e se podem ser alterados depois de a urna abrir.
- Validade padrão dos códigos.
- Lista de impedimentos por conflito de interesse (futuro).
- Notas por critério e desempate por critério (futuro).
- Se o jurado pode ver o próprio voto após o fim do evento.
