# Conferência automática de Pix

O Worker `cfcde-conferir-pix` executa a cada minuto, sem depender do painel aberto.
Chama o serviço `cfcde` por binding interno e não possui endereço HTTP público.
Somente pedidos Pix pendentes com ID da PinPay são consultados. Pedidos aprovados
disparam as integrações existentes em segundo plano.

## Ativação

1. Aplique `supabase/migrations/0022_pix_conferido_em.sql` no banco do site.
2. Publique o site com as alterações de `src/lib/reconciliar.ts` e da rota
   `/api/pix/reconciliar`.
3. Autentique o Wrangler na conta `62cd8cd3c790a5283bcec7d955ae1b5c`.
4. Configure o mesmo `CRON_SECRET` do site no agendador. Não substitua um segredo
   existente no site sem atualizar também os agendadores que já o utilizam:

   ```sh
   npx wrangler secret put CRON_SECRET --config workers/conferir-pix/wrangler.jsonc
   npx wrangler deploy --config workers/conferir-pix/wrangler.jsonc
   ```

O cron usa UTC e roda a cada minuto. O processamento consulta até 100 registros
por execução e deixa de iniciar consultas depois de 40 segundos. Cada consulta
tem limite de 8 segundos. `pix_conferido_em` prioriza os pedidos há mais tempo
sem conferência, inclusive após falhas. A atualização de status só ocorre se o
pedido ainda estiver pendente, para respeitar confirmações simultâneas.

## Verificação

```sh
npx wrangler deploy --dry-run --config workers/conferir-pix/wrangler.jsonc
npx wrangler tail --config workers/conferir-pix/wrangler.jsonc
```

Procure os contadores `verificados`, `atualizados`, `aprovados` e `erros` nos logs.
Um agendamento configurado localmente só passa a executar após a publicação.
