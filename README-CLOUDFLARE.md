# Yaya Flores — Cloudflare v9

Esta versão foi preparada para GitHub + Cloudflare Workers.

## Arquitetura
- Worker: backend/API e autenticação.
- Workers Static Assets: site e painel.
- D1: produtos e configurações.
- R2: fotos enviadas pelo painel.
- GitHub: deploy automático ao conectar o repositório no Cloudflare.

## Primeira publicação
1. Crie no Cloudflare um D1 chamado `yaya-flores-db`.
2. Copie o Database ID e substitua `COLE_O_DATABASE_ID_AQUI` em `wrangler.jsonc`.
3. Crie um bucket R2 chamado `yaya-flores-images`.
4. No terminal desta pasta: `npm install`.
5. Login: `npx wrangler login`.
6. Banco: `npx wrangler d1 execute yaya-flores-db --remote --file=schema.sql`.
7. Produtos iniciais: `npx wrangler d1 execute yaya-flores-db --remote --file=seed.sql`.
8. Teste/publicação: `npm run deploy`.
9. Depois envie esta pasta para um repositório GitHub e conecte o repositório em Workers & Pages > Workers > Import a repository / Builds.

## Observação importante
A integração Gemini está ativa no endpoint `/api/admin/improve-image` usando a Interactions API. A chave é configurada pelo painel e nunca deve ser colocada no GitHub.
