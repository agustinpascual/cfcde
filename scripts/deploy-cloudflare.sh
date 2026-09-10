#!/usr/bin/env bash
# Publica o site no Cloudflare Workers e sobe os segredos.
#
# Uso:
#   export CLOUDFLARE_API_TOKEN='cfut_...'      # o token que você criou
#   bash scripts/deploy-cloudflare.sh
#
# Não guarda segredo nenhum: os valores saem do .env.local na hora.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "✘ Falta o token. Rode antes:"
  echo "    export CLOUDFLARE_API_TOKEN='cfut_...'"
  exit 1
fi

echo "══ 1/5  Conferindo o token ═════════════════════════════"
npx wrangler whoami

echo
echo "══ 2/5  Build ═════════════════════════════════════════"
npm run build

echo
echo "══ 3/5  Publicando o Worker cfcde ═════════════════════"
# Se o domínio próprio falhar (zona em outra conta), o Worker ainda sobe;
# nesse caso comente a chave "routes" do wrangler.jsonc e rode de novo.
npx wrangler deploy

echo
echo "══ 4/5  Enviando os segredos ══════════════════════════"
# Cada valor sai do .env.local e vai direto para a Cloudflare, sem passar
# por arquivo intermediário nem pelo histórico do shell.
for VAR in \
  SUPABASE_SERVICE_ROLE_KEY PAINEL_EMAIL PAINEL_SENHA CHAVE_MESTRA RECUPERACAO_CARRINHO_SECRET \
  PINPAY_TOKEN PINPAY_WEBHOOK_SECRET \
  AXXONPAY_PUBLIC_KEY AXXONPAY_SECRET_KEY AXXONPAY_WEBHOOK_URL \
  RESEND_API_KEY RESEND_REMETENTE META_CAPI_TOKEN \
  CORREIOS_URL CORREIOS_SECRET \
  ZAPI_INSTANCIA ZAPI_TOKEN ZAPI_CLIENT_TOKEN; do
  VALOR="$(grep -m1 "^${VAR}=" .env.local | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')"
  if [ -z "$VALOR" ]; then
    echo "  ⚠  ${VAR} está vazia no .env.local — pulando"
    continue
  fi
  printf '%s' "$VALOR" | npx wrangler secret put "$VAR" --name cfcde
  echo "  ✓ ${VAR}"
done

echo
echo "══ 5/5  Testando o que subiu ══════════════════════════"
for URL in "https://cafecomdeusepai.com/" "https://cafecomdeusepai.com/painel/entrar"; do
  printf '%-45s ' "$URL"
  curl -s -o /dev/null -w 'HTTP %{http_code}\n' --max-time 20 "$URL" || echo "sem resposta"
done

echo
echo "Pronto. Se o domínio ainda responder 530/404, o DNS pode levar alguns"
echo "minutos para propagar. A URL de workers.dev aparece no passo 3."
