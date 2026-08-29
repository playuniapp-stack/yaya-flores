# Yaya Flores — Cloudflare v12

Versão publicada para Cloudflare Workers + D1 + R2.

## v12
- Admin e catálogo preservados da v11.
- Gemini ativada para melhoria de fotos via Interactions API.
- Modelo padrão: `gemini-3.1-flash-image`.
- A chave continua armazenada apenas no backend/D1 e não é enviada ao site público.
- Prompt de edição prioriza fidelidade absoluta ao produto e limita mudanças a iluminação, nitidez, ruído e apresentação fotográfica.
