# AxxonPay: configuração e homologação

O PIX continua na PinPay por padrão. Cartão fica desativado até configuração explícita em **Painel → Integrações → Gateways de pagamento**.

## Credenciais

Salve `AXXONPAY_PUBLIC_KEY` e `AXXONPAY_SECRET_KEY` no cofre do painel. A Secret Key nunca vai ao navegador. O login `/auth/login` é do painel da AxxonPay, não da cobrança direta; o fluxo usa os headers `axxon-gateway-publickey` e `axxon-gateway-secretkey`.

A seleção só é salva após validar as credenciais. O cache de configuração tem duração de 30 segundos. Não troque credenciais de conta enquanto houver pedidos pendentes daquela conta.

## Cartão

- `desativado`: sem formulário de cartão no checkout.
- `sandbox`: simulador local, identificado como teste, somente no painel; não recebe cartão, não cria cobranças, não conta como venda. Não é o sandbox do provedor.
- `axxonpay`: cobrança real, por token do SDK oficial. Nesta versão, habilitado somente para adquirentes `stripe` e `upay`. `tryplo`, `bloopi` e adquirentes desconhecidas ficam bloqueadas até homologação específica. Bloopi exige fluxo com dados brutos; esse fluxo não foi habilitado na loja.

O antigo endpoint `/api/cartao-sandbox` retorna 410 sem ler o corpo. Registros históricos não foram apagados. A loja deve avaliar a retenção e o tratamento de dados sensíveis já existentes com seu responsável de segurança.

## Confirmação e repetição

Configure o webhook **normalizado** da AxxonPay para `https://cafecomdeusepai.com/api/webhooks/axxonpay`. A criação também envia essa URL em `postbackUrl`.

No localhost, mantenha `NEXT_PUBLIC_SITE_URL=http://localhost:3000` e configure separadamente `AXXONPAY_WEBHOOK_URL=https://cafecomdeusepai.com/api/webhooks/axxonpay`. O receptor público precisa usar a mesma conta AxxonPay e o mesmo banco. Isso não é sandbox: as cobranças continuam reais. A URL é validada antes de reservar o pedido, evitando pendências causadas por configuração local.

Quando a API rejeita explicitamente o documento sem criar pagamento, a reserva fica `falhou`, sem `pix_id`, e o navegador libera o identificador para o próximo envio manual. Não há reenvio automático. Alterar dados em uma tentativa pendente não libera outra cobrança: é necessário conferir a anterior. Reservas antigas sem ID não são consideradas falhas automaticamente; precisam de confirmação de que a cobrança não foi criada.

O webhook serve como gatilho: o servidor consulta a API oficial e confere ID, referência, método e valor antes de aprovar. Nunca aprova pelo resultado do 3DS ou por status enviado pelo navegador.

Os IDs da AxxonPay são persistidos como `axxon_<id>` no campo existente `pix_id`, também para cartão. IDs antigos sem prefixo continuam na PinPay. Não é necessária migração de schema. AxxonPay usa referência `AXX-<uuid-da-tentativa>`; a reserva única no banco precede a chamada ao gateway. Após timeout, a tentativa fica preservada e não ocorre troca automática de gateway. Se a API não devolver ID nem webhook, será necessária conferência manual junto ao provedor; não criar outra cobrança às cegas.

## Antes de ativar em produção

1. Confirmar com a AxxonPay as chaves/ambiente de homologação e a adquirente vinculada à Public Key.
2. Validar as chaves sem criar cobranças.
3. Testar PIX criado, pago, expirado e estornado; webhook repetido/fora de ordem; troca de gateway com pedidos antigos pendentes.
4. Verificar unidade de `amount` na consulta real: criação e webhook documentam centavos. A loja exige correspondência exata; não tenta adivinhar/converter valores.
5. Homologar cartão aprovado/recusado, parcelas, token expirado e eventual 3DS com cartões oficiais de teste. Conferir CSP e scripts da adquirente no navegador. Não usar cartões de clientes para teste.
6. Testar timeout/reenvio e confirmar que somente uma cobrança foi criada por tentativa.

Testes locais: `node --test scripts/axxonpay.test.mjs scripts/axxonpay-fluxo.test.mjs scripts/axxonpay-http.test.mjs scripts/pix-descricao.test.mjs`. Build: `npm run build`. Os testes simulam banco/gateway; não substituem transações de homologação na AxxonPay.

Referências: [Pagamento direto](https://axxonpay.readme.io/reference/createdirectpayment), [SDK](https://axxonpay.readme.io/reference/get_docs-sdk-javascript), [Validação](https://axxonpay.readme.io/reference/post_api-v1-tokens-validate), [Consulta](https://axxonpay.readme.io/reference/get_api-v1-payments-id), [Webhook](https://axxonpay.readme.io/reference/post_api-v1-webhooks-normalized-examples).
