# Domínios da mesma aplicação no Dokploy

Um domínio adicional é um alias do mesmo serviço `cfcde`. Cadastre-o em
**Domains** desse aplicativo, mantenha a porta 3000 e habilite HTTPS/Let's Encrypt.
O DNS deve apontar para a VPS e o certificado deve ser válido antes de testar cartão.

Após publicar a correção de aliases, adicionar outro domínio no mesmo aplicativo
não exige alterar código, reconstruir a lista `NEXT_PUBLIC_DOMINIOS_OFICIAIS`,
recadastrar gateways ou trocar as chaves. A validação usa o host/protocolo
encaminhados pelo Traefik e compara com a origem do navegador. A lista antiga
continua permitindo origens explicitamente cadastradas. Não exponha a porta
interna da aplicação como um proxy genérico para hosts arbitrários.

Mantenha as variáveis permanentes do serviço, especialmente `CHAVE_MESTRA`, as
credenciais do mesmo Supabase e um `AXXONPAY_WEBHOOK_URL` HTTPS estável e acessível
ao gateway. `NEXT_PUBLIC_SITE_URL` é a URL principal de links/SEO: não precisa
ser trocada cada vez que um alias é adicionado. A URL do webhook não depende
do domínio em que o comprador abriu o checkout.

Na edição do ambiente em 12/09/2026, variáveis fora da área visível do editor
ficaram de fora do valor salvo. O redeploy subiu sem `CHAVE_MESTRA`: o serviço
não abria o cofre e usava os padrões de gateways. A chave original, o
`AXXONPAY_WEBHOOK_URL` e o `CRON_SECRET` foram recuperados do contêiner anterior
e restaurados no Dokploy, preservando os demais valores. Para manutenção,
acrescente somente as linhas necessárias ou leia o documento inteiro; o texto
visível do CodeMirror pode conter apenas uma parte do arquivo. O código agora
também identifica um cofre existente sem chave e informa indisponibilidade, em
vez de tratá-lo como vazio e selecionar outro gateway silenciosamente.

Todos os aliases usam os mesmos produtos, pedidos, regras e integrações.
Cookies, carrinho e dados salvos no navegador continuam separados por origem,
como exige o navegador; não há cópia de pedidos ou de configurações por domínio.

O certificado inicial de `vinimaiochi.fans` falhou porque a emissão ocorreu
antes do DNS apontar para a VPS. Após confirmar o registro A, a ação
**Web Server → Traefik → Reload** refez a emissão e o Chrome passou a validar
o certificado Let's Encrypt. Salvar novamente um domínio sem alterar sua
configuração não provocou uma nova emissão nessa instalação.
