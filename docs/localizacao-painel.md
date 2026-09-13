# Localização dos visitantes no VPS

## Diagnóstico em 13/09/2026

A rota `/api/track` lia cidade, UF e coordenadas somente dos headers de
Cloudflare/Vercel. O IP encaminhado pelo proxy continuava sendo registrado,
mas não havia consulta de localização para a hospedagem no VPS.

Na leitura das 500 sessões mais recentes do banco configurado localmente,
500 tinham IP válido e 410 estavam sem cidade, com coordenadas `0,0`.
Nenhuma das 50 sessões mais recentes tinha cidade. `Number(null)` na rota
transformava a ausência dos headers de latitude/longitude em zero.
Uma segunda leitura das últimas 50 confirmou 33 sessões com IP público
e 17 com IP de loopback (`127.0.0.1`/`::1`), que não têm geolocalização.

## Correção

- Headers completos de Cloudflare/Vercel continuam tendo prioridade.
- No VPS, a rota responde ao rastreador e agenda a consulta com `after` do
  Next.js. O resultado atualiza a mesma sessão, sem gerar outro evento ou
  alterar seu horário de atividade. Se ela já trocou de IP, a atualização
  antiga não é aplicada.
- A consulta usa o [endpoint HTTPS do GeoJS](https://www.geojs.io/docs/v1/endpoints/geo/).
  Somente o IP público é enviado ao serviço; não são enviados identificação
  da sessão, dados de contato, pedido ou credenciais. Não usa GPS nem pede
  permissão de localização no navegador.
- Timeout de 1,5 segundo; até 16 consultas simultâneas e 2.048 entradas em
  memória por processo. Resultados completos duram 6 horas; falhas e dados
  parciais, 1 minuto. Consultas simultâneas do mesmo IP são deduplicadas.
  O cache não grava arquivos e o fetch usa `no-store`.
- Pings sem dados não apagam uma localização já registrada. Coordenadas
  inválidas não viram `0,0`; o mapa ignora pontos fora de sua área.
- O diagnóstico autenticado usa a mesma consulta da rota de rastreamento,
  incluindo Cloudflare e VPS, em vez de verificar apenas Vercel.

Não exige migração. A compatibilidade com instalações antigas sem a coluna
`sessoes.ip` foi preservada. O proxy do VPS precisa encaminhar o IP público
real em `X-Forwarded-For` ou `X-Real-IP` (Cloudflare usa `CF-Connecting-IP`).
Não se deve permitir que clientes externos falsifiquem esses headers no proxy.

A correção passa a valer após publicar o código e receber novos pings.
O histórico não foi reescrito. A localização é aproximada: VPNs, operadoras
móveis e IPs sem cidade na base podem continuar sem cidade ou mostrar outra
localidade. Indisponibilidade do GeoJS não impede navegação, pagamentos ou
registro dos eventos.

## Validação

`node --test scripts/geolocalizacao.test.mjs scripts/carrinhos-abandonados.test.mjs`
verifica headers, ausência de coordenadas, IPs privados, cache, expiração,
deduplicação, falhas do serviço, resposta antes da consulta, reaproveitamento
no heartbeat, eventos e instalações antigas. Banco e provedor são simulados
nesses testes; nenhum visitante ou pedido de teste é criado em produção.
