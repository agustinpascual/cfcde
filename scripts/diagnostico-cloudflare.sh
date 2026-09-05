#!/usr/bin/env bash
# Mostra o estado do deploy na Cloudflare. Só lê, não altera nada.
#
# Uso:
#   export CLOUDFLARE_API_TOKEN='cfut_...'
#   bash scripts/diagnostico-cloudflare.sh
set -uo pipefail
cd "$(dirname "$0")/.."

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "✘ Falta: export CLOUDFLARE_API_TOKEN='cfut_...'"
  exit 1
fi

echo "══ O Worker cfcde existe? ═══════════════════════════════"
npx wrangler deployments list --name cfcde 2>&1 | tail -20

echo
echo "══ Qual a URL workers.dev? ══════════════════════════════"
npx wrangler subdomain get 2>&1 | tail -5

echo
echo "══ Segredos cadastrados no Worker ═══════════════════════"
npx wrangler secret list --name cfcde 2>&1 | tail -20

echo
echo "══ Domínios próprios apontando para o Worker ════════════"
npx wrangler triggers list --name cfcde 2>&1 | tail -20

echo
echo "Cole tudo acima na conversa."
