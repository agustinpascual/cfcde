// Rodar dentro do contêiner da aplicação. Sem --executar, apenas valida a
// configuração: não chama o cron, não altera pedidos nem envia mensagens.
const desde = process.argv.find(arg => arg.startsWith('--desde='))?.slice(8);
if (!desde || !Number.isFinite(Date.parse(desde))) throw new Error('Informe --desde com a data inicial ISO.');
if (!process.env.CRON_SECRET) throw new Error('CRON_SECRET ausente no contêiner.');
const url = new URL('http://127.0.0.1:3000/api/cron/avisos-pix');
url.searchParams.set('desde', new Date(desde).toISOString());
if (!process.argv.includes('--executar')) {
  console.log(JSON.stringify({ configurado: true, desde: url.searchParams.get('desde'), executar: false }));
} else {
  try {
    const resposta = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      signal: AbortSignal.timeout(240000),
    });
    const dados = await resposta.json();
    console.log(JSON.stringify({ http: resposta.status, ok: dados.ok === true,
      pagamentos: dados.pagamentos, recuperacoes: dados.recuperacoes }));
    if (!resposta.ok || !dados.ok) process.exitCode = 1;
  } catch {
    console.error('Não foi possível concluir o ciclo de recuperação; confira os logs da aplicação.');
    process.exitCode = 1;
  }
}
