# Yaya Flores — Cloudflare v11

Versão de produção para Cloudflare Workers + D1 + R2.

- Site público em `public/`
- Painel em `/admin`
- Produtos/configurações no D1
- Fotos enviadas pelo painel no R2 `yaya-flores-images`
- D1 é inicializado automaticamente no primeiro acesso

O botão Gemini permanece isolado até a validação final do modelo de imagem; cadastro, edição, exclusão e upload de fotos funcionam sem depender dele.
