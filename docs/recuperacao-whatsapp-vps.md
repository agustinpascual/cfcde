# Recuperação WhatsApp no VPS

Diagnóstico de 13/09/2026: Z-API conectada, atrasos de Pix e carrinho configurados
em 10 minutos, mas nenhuma tarefa agendada na aplicação do Dokploy. Registros
recentes sem tentativa de recuperação. `CRON_SECRET` está presente no contêiner.

Tarefa preparada no Dokploy: **Recuperação WhatsApp — Pix e carrinho**, expressão
`*/5 * * * *`, inicialmente desativada. Antes de ativar, atualizar `--desde` com
um horário ISO correspondente à ativação. Isso exclui pedidos e sessões antigos.
O intervalo de cinco minutos pode acrescentar até cinco minutos ao atraso salvo.

Comando dentro do contêiner:

```sh
cd /app && node scripts/recuperar-whatsapp-vps.mjs --executar --desde=DATA_ISO_DA_ATIVACAO
```

Sem `--executar`, o script apenas valida a data e a presença do segredo. Não chama
o endpoint nem envia mensagens. O segredo é lido do ambiente e não aparece nos
logs ou no comando do agendamento.

A rotina consulta o Pix individualmente no gateway antes de reservar o lembrete;
recusa estados pagos, expirados, desconhecidos, valores/IDs divergentes e falhas
de consulta. Carrinhos ainda ativos são excluídos. Telefone ou assinatura ausentes
não marcam um carrinho como enviado. Os links usam `NEXT_PUBLIC_SITE_URL` do VPS.

Validação: 23 testes de recuperação e carrinho, ESLint e build VPS. Os testes
simulam os envios e não entram em contato com clientes. A ativação do agendamento
e qualquer teste com envio real exigem autorização explícita para as mensagens.
