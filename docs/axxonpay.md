# AxxonPay: configuração e homologação

O PIX continua na PinPay por padrão (esta loja já opera PIX na AxxonPay). Cartão fica desativado até configuração explícita em **Painel → Integrações → Gateways de pagamento**; a partir de 09/09/2026 a opção AxxonPay está disponível para ativação (ver "Cartão").

## Credenciais

Salve `AXXONPAY_PUBLIC_KEY` e `AXXONPAY_SECRET_KEY` no cofre do painel. A Secret Key nunca vai ao navegador. O login `/auth/login` é do painel da AxxonPay, não da cobrança direta; o fluxo usa os headers `axxon-gateway-publickey` e `axxon-gateway-secretkey`.

A seleção só é salva após validar as credenciais. O cache de configuração tem duração de 30 segundos. Não troque credenciais de conta enquanto houver pedidos pendentes daquela conta.

## Cartão

- `desativado`: sem formulário de cartão no checkout.
- `sandbox`: simulador local, identificado como teste, somente no painel; não recebe cartão, não cria cobranças, não conta como venda. Não é o sandbox do provedor.
- `axxonpay`: cartão no checkout da loja via AxxonPay, com a adquirente vinculada à Public Key. Salvar essa seleção no painel valida as credenciais **e** a adquirente; se a adquirente não for homologada aqui, nada é salvo.

### Auditoria de 12/09/2026

A documentação oficial atual foi conferida integralmente para criação direta, SDK JavaScript/3DS, consulta e webhook. O contrato implementado permanece alinhado: valor em centavos, `paymentMethod: "credit_card"`, cartão bruto com `expirationMonth`/`expirationYear` somente na criação Bloopi, `expMonth`/`expYear` no `paymentData`, comprador com os seis campos obrigatórios de endereço, `nextAction` opaco e aprovação exclusivamente por consulta autenticada/webhook.

Os eventos recentes mostraram que a AxxonPay criou e devolveu o ID das cobranças, mas o navegador encerrou a etapa seguinte como falha de rede 3DS antes da autenticação terminar. As primeiras quatro ocorrências de 12/09 foram em iPhone. A tentativa de homologação `#916003`, feita depois no Chrome/macOS, isolou melhor o ponto: o ambiente da Bloopi abriu, mas o desafio não chegou a ser apresentado; a falha ocorreu cerca de oito segundos após a criação e o intent ficou pendente. Isso descarta um problema exclusivo de Safari e localiza a interrupção antes do challenge, nas chamadas cross-origin que consultam o intent e iniciam a sessão.

As consultas idempotentes `checkout-config`/`get-checkout-info` passam pela rota local `/api/pagamentos/bloopi-leitura` e podem ter uma repetição segura. `initiate-3ds`, `confirm-payment` e o caminho alternativo `submit-card-payment` passam por `/api/pagamentos/bloopi-envio`: o servidor faz exatamente um repasse para a Bloopi, sem retry, não registra/persiste o corpo e devolve a resposta intacta ao SDK. Assim a integração continua executando o `nextAction` oficial e elimina o POST cross-origin interrompido, sem risco de confirmar duas vezes. O desafio do emissor continua no navegador e o resultado financeiro continua dependendo exclusivamente da consulta/webhook. O proxy local do SDK também tentava primeiro `js.bloopi.io`, host sem DNS, antes de `app.bloopi.io`; a origem inválida foi removida do proxy e da CSP. O checkout registra uma fase fechada (`chamando_sdk`, `ambiente_aberto`, `desafio_aberto` ou `retorno_sdk`), sem mensagem crua nem dados pessoais/cartão, para distinguir indisponibilidade do provedor de cancelamento no desafio bancário.

Uma tentativa subsequente no mesmo Chrome isolou outro defeito do loader público: depois de uma falha anterior, a tag `verify_3DS2.min.js` podia permanecer no DOM sem expor `window.Safe2Pay.Mpi`. O loader da Bloopi verificava apenas a existência da tag e a considerava carregada, produzindo `3DS script not loaded` com outro cartão. O SDK servido pela loja agora remove somente a tag Safe2Pay comprovadamente incompleta; o loader oficial então baixa o MPI novamente. Scripts válidos e desafios em andamento não são removidos.

O fluxo foi validado no Chromium mobile e no WebKit/Safari com os SDKs públicos reais da AxxonPay/Bloopi, CSP, leitura local do contexto e POST de ACS, mantendo a criação da cobrança interceptada. Essa prova verifica carregamento e integração sem cobrar. A homologação financeira final ainda exige um cartão próprio do lojista em `/produto/testes`, porque nenhum teste automatizado pode afirmar aprovação do emissor sem uma transação real.

### Decisão de 09/09/2026: adquirente Bloopi, cartão em claro pelo servidor

Verificado ao vivo em 09/09/2026: a Public Key da conta responde `provider: bloopi` (`scriptUrl: https://app.bloopi.io/bloopi.js`, `is_sandbox: false`, fluxo `f2` = Safe2Pay/Braspag, 3DS a partir de R$ 1,00, soft descriptor "Arthur Richard"). A [doc do SDK](https://axxonpay.readme.io/reference/get_docs-sdk-javascript) confirma que não existem campos hospedados/iframe: o cartão é sempre digitado no formulário da loja. Com Stripe/UPay, `Axxon.encrypt()` tokeniza no navegador; com **Bloopi, a API exige `card.number/holderName/expirationMonth/expirationYear/cvv` em claro na criação**, e o navegador usa o mesmo cartão em `Axxon.handleNextAction` para o 3DS. A doc avisa: "quando a adquirente exige dados brutos em `card`, o backend precisa ter a conformidade aplicável".

O lojista foi informado das alternativas (trocar para adquirente que tokeniza; manter cartão desativado; ou operar com cartão em claro) e **autorizou explicitamente o cartão em claro pelo servidor**, ciente de que isso coloca a loja em escopo PCI DSS (SAQ D). Requisito anterior de "PAN/CVV nunca acessíveis ao servidor" foi substituído por esta decisão. Se a conta for migrada para Stripe/UPay, o mesmo código volta ao modo tokenizado automaticamente (`configuracaoAdquirenteAxxon` devolve `modo: "token"`).

### Como o cartão trafega (modo "cru")

1. Navegador (`src/components/pagamentos/CartaoAxxon.tsx`): campos **não controlados** (número, validade e CVV nunca entram no state do React), SDK carregado só quando "Cartão" é escolhido, validação Luhn/validade/CVV local, `POST /api/pagamentos/cartao` com `cartao: { numero, titular, mes, ano, cvv }` + `installments` + `tentativa`. Se a resposta trouxer `nextAction`, chama `Axxon.handleNextAction(nextAction, { amount, installments, card, customer })` — o bloopi.js faz `checkout-config`, `initiate-3ds`, o desafio do emissor e `confirm-payment`. O formulário é limpo (`form.reset()`) assim que o envio/3DS termina. A aprovação vem **só** de `GET /api/pix/:id` (consulta autenticada na AxxonPay); o resultado do SDK é orientação.
2. Rota (`src/app/api/pagamentos/cartao/route.ts`): origem oficial → limite de 5/min por IP (checkouts abertos são usados para testar cartões roubados) → `content-type` JSON → seleção de gateway → corpo ≤ 16 KB. Nada é lido antes dessas travas; nada do corpo é registrado.
3. Serviço (`src/lib/pagamentos-axxon.ts`): o cartão sai do corpo **antes de qualquer outra leitura** (`semCartao`), é validado e normalizado (`validarCartao`), e o objeto existe só para `criarPagamentoAxxon`. Nunca entra em `pedidos`, em `console.error` (que registra só referência/etapa/HTTP), na resposta ou em mensagens de erro. Campos antigos/soltos (`card`, `numeroCartao`, `cvv`, `chaveAtivacao`…) continuam recusados com 400; PIX recusa `cartao`. O formato precisa bater com a adquirente atual (Bloopi exige cartão, Stripe/UPay exigem hash) — caso contrário 409 sem reservar nem cobrar. CEP de dígitos repetidos e UF fora do padrão são recusados antes de criar a cobrança, porque o SDK da Bloopi os rejeitaria no 3DS e o intent ficaria impossível de confirmar.
4. Recusa: no cartão, um HTTP 400 **sem ID** na criação é tratado como recusa sem cobrança (`cartaoRecusado`): a reserva fica `falhou` e o navegador libera nova tentativa. A regra do PIX (só a rejeição explícita de CPF) não mudou.
5. Após uma autenticação 3DS incompleta, o navegador espera 15 s de consulta antes de oferecer "Tentar com outro cartão" (nova `tentativa`, nova reserva). Um intent não confirmado na Bloopi não autoriza nem captura. Se o navegador reenviar uma tentativa de cartão cuja cobrança está pendente e a consulta não traz `nextAction` (a resposta da criação se perdeu), o servidor responde `TENTATIVA_ENCERRADA_SEM_COBRANCA` para liberar uma nova tentativa; a reserva antiga fica pendente até expirar no gateway e é resolvida por "Conferir pagamentos" no painel. Status desconhecidos do gateway nunca aprovam e são registrados em log (`status não mapeado`) para mapeamento.
6. Parcelas: 1 a `PARCELAS_MAX` (4) sem juros. A API aceita até 12.
7. Limites conhecidos: o rate limit é por instância do Worker; o corpo com o cartão passa pela borda da Cloudflare (TLS termina lá) e pelo Worker em memória; logs da Cloudflare recebem apenas o `console.error` estruturado. Não há armazenamento em nenhum ponto.

### CSP do checkout

Só `/checkout/:path*` recebe a CSP ampliada (`next.config.ts`): `script-src`/`connect-src` enumeram o SDK Axxon, o bloopi.js e os cinco provedores de 3DS que a Bloopi pode rotear conforme valor/parcelas (Safe2Pay/Braspag + Cardinal, Stone/Pagar.me, PagBank, Marlim, ThreatMetrix), hosts lidos dos próprios scripts em 09/09/2026. `frame-src` é `https:` no checkout porque o desafio 3DS abre um iframe do banco emissor. `form-action` é `'self' https:` somente no checkout porque o Cardinal injeta no iframe um formulário POST para a URL ACS HTTPS do emissor; restringi-lo a `'self'` cria o modal, mas deixa seu conteúdo branco. `frame-ancestors 'none'` e o restante do site seguem na política fechada. **Alterações em `next.config.ts` exigem reiniciar o `next dev`**; sem isso o bloopi.js é bloqueado e o botão mostra "Cartão indisponível".

### Homologação

`/produto/testes` é um produto real de R$ 10 (slug `testes`, fora do sitemap e da vitrine, `noindex`) para homologar cartão e PIX com valor baixo; 3DS exige a partir de R$ 1,00, então R$ 10 exercita o desafio. Remover após homologar. Roteiro: aprovado; recusado pelo emissor; validade/CVV errados (barrados no navegador); fechar o desafio 3DS no meio (deve cair em "Tentar com outro cartão" após 15 s, sem segunda cobrança); webhook repetido; estorno pelo painel da AxxonPay. Conferir no painel da loja que o pedido fica `aprovado` só após a consulta, e no extrato que o descritor é "Arthur Richard".

Testes locais: `node --test scripts/cartao-axxon.test.mjs scripts/axxonpay-fluxo.test.mjs scripts/axxonpay-http.test.mjs scripts/axxonpay.test.mjs` (simulam banco/gateway; nunca usam cartão real). Smoke no navegador com o SDK real e sem cobrança: `scripts/cartao-navegador.test.mjs` com o `next dev` aberto e `AXXONPAY_PUBLIC_KEY` no ambiente.

## Confirmação e repetição

Configure o webhook **normalizado** da AxxonPay para `https://webhooks.bellablue.fit/api/webhooks/axxonpay`. A criação envia a variável `AXXONPAY_WEBHOOK_URL` em `postbackUrl`.

No localhost, mantenha `NEXT_PUBLIC_SITE_URL=http://localhost:3000` e configure separadamente `AXXONPAY_WEBHOOK_URL=https://webhooks.bellablue.fit/api/webhooks/axxonpay`. O receptor público precisa usar a mesma conta AxxonPay e o mesmo banco. Isso não é sandbox: as cobranças continuam reais. A URL é validada antes de reservar o pedido, evitando pendências causadas por configuração local.

### Unidade monetária e recuperação

A entrada de `POST /direct/payment` usa centavos. Em consulta real em 08/09/2026, `GET /payments/:id` devolveu `currency: BRL` e `amount: 123` para uma cobrança de R$ 123,00 (12300 centavos na criação e no snapshot do gateway). A consulta é normalizada explicitamente de reais para centavos, exigindo BRL e no máximo duas casas decimais; não se escolhe a unidade conforme o valor esperado.

Consulta real de **cartão** em 09/09/2026 (`GET /payments/:id` de um pedido de R$ 10): `method: "card"` (a criação usa `paymentMethod: "credit_card"`; a conferência aceita os dois), `amount: 10` em reais, `currency: "BRL"`, `status: "PENDING"`, **sem `metadata` e sem `nextAction`**, `expiresAt` uma hora após a criação, `purchaser: "bloopi"`, mais um `paymentLink` interno. A primeira compra real falhou justamente por `card ≠ credit_card` na conferência (o pedido 305591 ficou pendente sem 3DS); corrigido e coberto por teste com o corpo observado.

Após criar, o servidor grava imediatamente o ID e consulta o pagamento por GET para conferir valor e método e obter o PIX. Não depende da unidade de `amount` na resposta do POST. Se essa consulta falhar, o reenvio retoma o ID salvo sem criar outra cobrança. Divergências continuam bloqueadas. Logs registram somente referência, etapa e status HTTP, nunca corpo, credenciais ou dados pessoais.

Quando a API rejeita explicitamente o documento sem criar pagamento, a reserva fica `falhou`, sem `pix_id`, e o navegador libera o identificador para o próximo envio manual. Não há reenvio automático. Alterar dados em uma tentativa pendente não libera outra cobrança: é necessário conferir a anterior. Reservas antigas sem ID não são consideradas falhas automaticamente; precisam de confirmação de que a cobrança não foi criada.

O webhook serve como gatilho: o servidor consulta a API oficial e confere ID, referência, método e valor antes de aprovar. Nunca aprova pelo resultado do 3DS ou por status enviado pelo navegador.

Os IDs da AxxonPay são persistidos como `axxon_<id>` no campo existente `pix_id`, também para cartão. IDs antigos sem prefixo continuam na PinPay. Não é necessária migração de schema.

Novos pedidos AxxonPay usam referência de **seis dígitos** (`100000` a `999999`), compartilhada pelo checkout, painel, e-mails, `metadata.external_reference` e descrição `Pedido #123456`. O UUID da tentativa fica na chave primária existente `pedidos.id` e em `metadata.payment_attempt`, separado do número exibido. A reserva atômica precede a cobrança: a unicidade de `id` impede duplo clique/reenvio, enquanto a unicidade de `referencia` detecta colisões inclusive com a PinPay. Até cinco candidatos de seis dígitos são tentados antes de falhar sem cobrar; não há fallback para oito dígitos nesse fluxo.

Pedidos antigos com referência `AXX-<uuid>` continuam recuperáveis sem alteração de seus números. Recuperar uma referência curta por webhook sem `pix_id` salvo exige também correspondência do UUID interno; somente seis dígitos nunca bastam. Após timeout, a tentativa fica preservada e não ocorre troca automática de gateway. Se a API não devolver ID nem webhook, será necessária conferência manual junto ao provedor; não criar outra cobrança às cegas.

## Antes de ativar em produção

1. Confirmar com a AxxonPay as chaves/ambiente de homologação e a adquirente vinculada à Public Key.
2. Validar as chaves sem criar cobranças.
3. Testar PIX criado, pago, expirado e estornado; webhook repetido/fora de ordem; troca de gateway com pedidos antigos pendentes.
4. Verificar o contrato real de `amount`: entrada de criação em centavos; consulta BRL em reais, normalizada antes da comparação exata. Não converter o corpo de webhook diretamente nem aprovar com base nele.
5. Homologar cartão aprovado/recusado, parcelas e 3DS em `/produto/testes` (R$ 10) com cartão próprio. Conferir CSP e scripts da adquirente no navegador. Não usar cartões de clientes para teste.
6. Testar timeout/reenvio e confirmar que somente uma cobrança foi criada por tentativa.

Testes locais: `node --test scripts/axxonpay.test.mjs scripts/axxonpay-fluxo.test.mjs scripts/axxonpay-http.test.mjs scripts/cartao-axxon.test.mjs scripts/pix-descricao.test.mjs`. Build: `npm run build`. Os testes simulam banco/gateway; não substituem transações de homologação na AxxonPay.

Referências: [Pagamento direto](https://axxonpay.readme.io/reference/createdirectpayment), [SDK](https://axxonpay.readme.io/reference/get_docs-sdk-javascript), [Validação](https://axxonpay.readme.io/reference/post_api-v1-tokens-validate), [Consulta](https://axxonpay.readme.io/reference/get_api-v1-payments-id), [Webhook](https://axxonpay.readme.io/reference/post_api-v1-webhooks-normalized-examples).
