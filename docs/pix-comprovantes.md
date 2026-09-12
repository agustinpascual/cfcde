# Comprovantes Pix

## Ativação

1. Aplicar somente `supabase/migrations/0027_pix_comprovantes.sql` no banco da instalação. Ela cria a tabela privada e o bucket privado. Não é necessário reaplicar migrations antigas.
2. Manter `CHAVE_MESTRA` com pelo menos 32 caracteres e `SUPABASE_SERVICE_ROLE_KEY` configuradas apenas no servidor.
3. Publicar o código. A funcionalidade está disponível em novos Pix gerados por `/api/pix`, na página `/pagamento`. Cobranças antigas sem token e a página legada `/pagamento/[id]` não ganham autorização de upload retroativamente.
4. Validar com uma cobrança de homologação, sem criar transações reais para testes automatizados.

## Funcionamento e limites

- Cópia por botão ou evento de cópia no campo abre envio opcional. Quem usa QR Code pode abrir o formulário sem copiar.
- JPG, PNG, WebP ou PDF, até 5 MB; um arquivo por pedido, sem substituição pública. Repetições são idempotentes.
- Token assinado válido por sete dias, vinculado ao ID do Pix. Nunca emitido pela consulta pública de status. Não representa autenticação de identidade do pagador.
- A assinatura conserva um hash do IP observado na emissão. IP é apenas um sinal; configurar o proxy para remover cabeçalhos de IP externos e fornecer os confiáveis. IP diferente não bloqueia o envio.
- Nome, valor e horário são **declarados pelo cliente**, comparados com o pedido. Não há OCR, IA, antivírus ou verificação automática da autenticidade do arquivo. PDFs são disponibilizados como download, não incorporados em HTML.
- Mídia acessível apenas pelo endpoint com sessão do administrador; bucket e tabela não têm leitura anônima. Não criar políticas públicas nem tornar o bucket público.
- O estado “Comprovante enviado — aguardando confirmação” é separado de `pedidos.status`. Não altera `pago_em`, receita, entrega, e-mail de aprovação ou eventos Purchase. A confirmação continua pelas consultas/webhooks existentes da adquirente.
- O admin deve conferir o arquivo e a liquidação na adquirente. Não foi adicionado um botão de aprovação manual sem liquidação confirmada.
- Definir operacionalmente a retenção dos comprovantes e remover os respectivos objetos e linhas de forma coordenada quando aplicável. Não existe limpeza automática nesta versão.

## Testes locais (sem serviços externos)

`node --test scripts/pix-comprovante.test.mjs scripts/pix-descricao.test.mjs scripts/checkout-contato.test.mjs`

`npm run build:next`
