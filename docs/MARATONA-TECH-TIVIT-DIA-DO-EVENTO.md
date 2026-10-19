# Maratona Tech Tivit: roteiro do dia e plano de contingência

Para a organização (admins). O único objetivo do evento: **apurar os votos do público de 8 projetos**. O júri é feito por outro sistema. Antes de tudo, a implantação e o ensaio devem estar feitos: [`MARATONA-TECH-TIVIT-IMPLANTACAO.md`](MARATONA-TECH-TIVIT-IMPLANTACAO.md).

## Regras do evento (o que o sistema garante)

- **Uma pessoa, um voto**, garantido no banco (mesmo com cliques repetidos ou duas abas). Quem tentar votar de novo recebe "Você já votou neste evento".
- **O voto é secreto**: a tabela de votos não tem nenhuma ligação com a pessoa, e a participação não guarda horário. Nenhuma tela, exportação ou auditoria permite à organização dizer em quem alguém votou. **Ressalva honesta:** quem tem acesso direto de leitura ao banco (administrador do projeto no Supabase) poderia, com técnica forense (identificadores de transação e ordem física das linhas), tentar reconstruir quem votou em quê, porque o voto e a marcação "já votou" são gravados juntos para garantir o voto único. Restrinja o acesso ao painel do Supabase e à `DATABASE_URL` a quem for da equipe técnica.
- **Pode votar em si mesmo** (o projeto não precisa estar ligado a uma pessoa).
- **Sem parcial**: durante a votação o painel mostra só o **total de votos**, quantos se cadastraram e quantos votaram e a **série no tempo**. **Nunca** os votos por projeto. O ranking só existe **depois de encerrar**.
- **A urna só abre e fecha pela organização** (botões em Configuração > Operação). Nada fecha sozinho, nem no fim da janela: passando do horário, as telas só mostram "Tempo esgotado".
- Quem administra (**admin**) **não vota**: se precisar votar, use outra conta.
- Empate: as posições ficam compartilhadas (sem desempate).
- **Uma caixa de e-mail, uma conta**: variações do mesmo Gmail (pontos e `+etiqueta`) são tratadas como o mesmo e-mail. Outros provedores não têm essa proteção: quem controla vários e-mails distintos pode criar várias contas (risco aceito do evento; a verificação do e-mail por código é a barreira).
- Encerrar **congela o resultado oficial** (versão 1) na mesma operação. **Não é possível reabrir a urna.**

## Antes do horário

| Quando | O que fazer |
|---|---|
| Véspera | Confirmar: site no ar, e-mails chegando (Gmail, Outlook e Hotmail), Google funcionando, projeto do Supabase ativo, os 8 projetos cadastrados com imagem e **publicados**, admins entrando |
| Manhã do evento | Entrar como admin em **Configuração > Operação**. Checklist verde? Então **Ativar evento** (o público já pode criar conta; a urna segue fechada) |
| 15 min antes | **Backup**: `pnpm db:backup --rotulo antes-da-urna` |
| Horário combinado | **Abrir urna**. O público vê a votação abrir sozinho em até uns 15 segundos (a tela se atualiza; não precisa recarregar) |

## Durante a votação

- Acompanhe pelo **Painel** (`/e/maratona-tech-tivit/admin`, aba **Operação**; atualiza a cada 5 s): total de votos, inscritos × votaram, votos por minuto, estado da urna.
- O QR Code e o link do evento são o endereço do site (`APP_URL`). Quem não tem conta cria em um minuto (e-mail e senha com código no e-mail) ou entra pelo Google.
- **Corrigir texto ou imagem de um projeto** com a urna aberta é permitido, mas pede confirmação e **fica registrado** na auditoria. Não é possível acrescentar, remover nem tirar projetos da votação com a urna aberta.
- Se um projeto precisar sair da disputa (regra do evento), use **Tirar da disputa** (pede o motivo; é **irreversível**). Os votos dele permanecem nos totais, mas ele sai do ranking.

## Encerrar e apurar

1. **Encerrar urna** (Configuração > Operação). A tela avisa o efeito: ninguém mais vota, inclusive quem estiver confirmando naquele instante. Confirme.
2. **Backup**: `pnpm db:backup --rotulo depois-do-encerramento`.
3. No Painel, aba **Resultado**: o resultado fica oculto até clicar em **Mostrar resultado** (cuidado com tela espelhada em projetor). Ranking, gráficos e pontuação final.
4. Confira: **total do painel = soma do resultado**.
5. **Exportar**: CSVs (sem e-mail, um por clique; cada download é auditado) e o **Relatório** (imprimível; imprimir registra a versão na auditoria).
6. Anunciar o resultado é com a organização. Depois, **Concluir evento** (pede digitar o nome do evento): a configuração passa a somente leitura e o painel fica de consulta.

## Plano de contingência

| Problema | O que fazer |
|---|---|
| **Internet do local caiu** | O público vota pelo celular em 4G/5G (o site é leve). A organização acompanha por qualquer conexão. Se for só o Wi-Fi do local, avise por microfone: "use o 4G". O voto não fica "pendente" no aparelho: ou gravou ou não gravou; ao voltar a conexão, quem viu erro de rede usa **Verificar novamente** (a tela confere sozinha se o voto gravou antes de permitir tentar de novo) |
| **E-mail não chega** (código de cadastro) | 1) Peça para conferir o spam e esperar 1 minuto, depois **Reenviar código** (há um intervalo de 30 s). 2) Quem tem Google entra pelo **Entrar com Google** (não usa e-mail). 3) Resend fora do ar ou cota esgotada: troque para o **plano B** na Vercel (`EMAIL_PROVIDER=smtp` e as variáveis `SMTP_*` do Gmail dedicado) e refaça o deploy; leva alguns minutos |
| **Google não funciona** | Quem tem e-mail e senha entra normalmente; os demais criam conta por e-mail. Confira em Google Cloud se o app está **em produção** e se a URI de redirecionamento é a do `APP_URL` |
| **Site lento ou fora do ar** | Veja o painel do **Vercel** (erros, tempo) e o do **Supabase** (conexões, projeto ativo). O banco aguenta o pico esperado (o teste de carga confirma); falha costuma ser de configuração. Os votos já gravados **não se perdem** (um voto só é confirmado depois de gravado) |
| **Urna aberta por engano** | Não há "desabrir". Se ainda não há votos, continue normalmente. Se for grave, fale com a equipe técnica |
| **Urna encerrada por engano** | O sistema não reabre. Procedimento de **emergência, só pela equipe técnica**, com backup feito antes: no banco, `UPDATE evento SET estado_urna = 'ABERTA', urna_encerrada_em = NULL WHERE slug = 'maratona-tech-tivit';` e `DELETE FROM resultado_oficial WHERE evento_id = (SELECT id FROM evento WHERE slug = 'maratona-tech-tivit');` (**todas** as versões: se houve desqualificação depois do encerramento, a versão 2 também sairia do caminho) e registrar o motivo. A apuração é refeita ao encerrar de novo. Os votos gravados permanecem |
| **Alguém diz que votou e a tela diz que não** | Não votou, ou votou com outra conta. O estado "você já votou" vem do banco. Nunca se pode olhar "em quem" |
| **Alguém não consegue votar** | Mensagens da tela: "A votação ainda não está aberta", "foi encerrada", "Confirme seu e-mail", "Contas administrativas não votam". O admin que quiser votar usa outra conta |
| **Esqueceu a senha** | **Esqueci minha senha** na tela de entrada: o código chega por e-mail e a pessoa já entra com a senha nova |
| **Muitas tentativas / "tente em Ns"** | Cinco senhas erradas bloqueiam o login daquele e-mail por 60 s; cinco códigos errados invalidam o código (peça outro). Esperar resolve |

## Depois do evento

- Guarde os backups e os CSVs fora da máquina.
- Dados pessoais (nome e e-mail): o prazo de anonimização do evento é de 90 dias, mas **a rotina automática de anonimização não faz parte deste MVP** (fica para o MVP do Festival). Decida e execute a limpeza dos dados pessoais dentro do prazo; os **votos nunca são apagados** (não têm dado pessoal e garantem a integridade do resultado).
- O `pnpm db:limpar-ensaio` é **só para o ensaio**: nunca depois do evento real.
