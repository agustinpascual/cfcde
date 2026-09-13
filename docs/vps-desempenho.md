# Home e espaço do VPS

Diagnóstico no Dokploy em 13/09/2026: 25,81 GB usados de 37,7 GB.
Docker: 21,08 GB, com 20,02 GB em imagens (11,08 GB recuperáveis),
915,8 MB de cache de build recuperável, 105 MB em contêineres e 68,98 MB
em volumes. A limpeza diária já estava ativada. Esses números são uma
fotografia do diagnóstico, não uma medição após limpeza.

## Carregamento

O banner da home tem versões AVIF e WebP previamente comprimidas e
versionadas em `public`. Um preload responsivo começa a transferência antes
da verificação de dispositivo; a loja só é exibida depois dessa verificação.
O vídeo flutuante é conectado após o banner carregar. Links dos produtos na
home não antecipam o download de todas as páginas de produto.

As outras imagens usam apenas WebP no otimizador, com cache limitado a
250 MB por instância. Isso não remove imagens Docker acumuladas.

## Imagem de produção menor

O Dockerfile usa o runtime `standalone` do Next, com arquivos estáticos e
`public`, sem o diretório completo de desenvolvimento ou caches de build.
O build normal continua disponível para o fluxo Nixpacks existente.

No Dokploy, depois que este Dockerfile estiver no repositório:

1. Build Type: Dockerfile; caminho `Dockerfile`; contexto `.`; estágio `runner`.
2. Em Build Time Arguments, conservar os valores públicos usados atualmente:
   `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_META_PIXEL_ID` e
   `NEXT_PUBLIC_DOMINIOS_OFICIAIS`, quando configurados.
3. Preservar integralmente o ambiente de runtime existente, inclusive
   `CHAVE_MESTRA`, credenciais, webhooks e segredos do cron. Não transferir
   segredos para Build Time Arguments.
4. Validar home, painel e configuração dos pagamentos após o deploy.

Localmente, `npm run build:vps` gera `.next/standalone`. Para testar a imagem
com Docker: `docker build -t cfcde:vps .`, acrescentando os argumentos
públicos correspondentes ao ambiente. O contêiner usa a porta 3000.

## Limpeza

Revisar imagens sem uso e cache de build no Docker → Disk Usage. A remoção
de imagens sem contêiner associado exige reconstruí-las para reutilização.
Preservar imagens em execução e de rollback, contêineres parados que ainda
sejam necessários e todos os volumes. Não usar “Clean all” ou limpar volumes
para resolver acúmulo de imagens. O cache pode ser reconstruído em novos builds.

Referências: [Next standalone no Docker](https://docs.docker.com/guides/nextjs/)
e [configuração de build do Dokploy](https://docs.dokploy.com/docs/core/applications/build-type).
