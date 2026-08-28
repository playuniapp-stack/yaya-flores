# Yaya Flores Premium v4

## Rodar
```bash
node server.js
```
Site: http://localhost:3000
Painel: http://localhost:3000/admin

## Novidades v4
- Disponibilidade: Disponível hoje / Sob encomenda / Indisponível
- Busca no catálogo
- Área "Disponíveis hoje"
- Favoritos persistidos no navegador
- Página do produto com complementos, data desejada e mensagem de cartão
- Produtos relacionados
- Compartilhamento de produto
- Painel com visão geral e ações rápidas
- QR Code do catálogo
- Cadastro de complementos e disponibilidade
- Mantidos: Gemini, múltiplas fotos, assistente, mapa, WhatsApp e demais recursos anteriores

Observação: QR Code usa QuickChart quando houver internet. Produtos e configurações locais ficam em /data.


## v5 - correção do acesso administrativo
O primeiro cadastro de senha agora já cria a sessão autenticada no mesmo passo, evitando o loop entre criação e login. O frontend confirma a sessão antes de abrir o painel e usa credenciais same-origin explicitamente.


## v6
- Área de pagamentos redesenhada com logos Mumbuca, cartões e Pix.
- Texto atualizado para informar todos os cartões de crédito.
- Imagens tratadas com transparência e layout responsivo.

## v7 — correção definitiva do acesso administrativo
- Corrigido cache antigo de `admin.js`/`admin.css`, que podia manter uma versão anterior do fluxo mesmo após atualizar o projeto.
- Primeiro acesso agora cria a senha e abre o painel imediatamente.
- Se a senha for criada mas a sessão precisar ser refeita, a própria tela vira login sem loop.
- Assets do painel usam `no-store` e versionamento `?v=7`.

## v8 — correção definitiva do painel
A causa do loop era um servidor Node antigo continuar ativo na porta 3000. Assim, o navegador carregava os arquivos novos, mas as rotas de login ainda eram respondidas pelo backend antigo.

### No Windows, use sempre:
`INICIAR-YAYA.bat`

Ele fecha somente um processo Node que esteja ocupando a porta 3000, inicia a versão atual e abre o painel.

Outras correções:
- sessão administrativa assinada e persistente por 8 horas;
- frontend e backend verificam a mesma versão;
- painel aparece imediatamente após autenticar;
- atributo `hidden` agora é respeitado em todos os estados;
- botão nunca fica preso indefinidamente em "Criando..." ou "Entrando..." por incompatibilidade de versão.
