# Deploy do Simple Coluna no GitHub Pages

Este projeto já está preparado para publicação estática no GitHub Pages.

## Arquivos de suporte já criados
- `.nojekyll` para impedir processamento do Jekyll.
- `CNAME` com `www.simplecoluna.com`.
- `404.html` com redirecionamento simples para a página inicial.

## Publicação no GitHub Pages
1. Envie o conteúdo da pasta raiz `d:\SIMPLE COLUNA` para o repositório do projeto.
2. No GitHub, abra `Settings > Pages`.
3. Em `Build and deployment`, selecione a branch de publicação.
4. Publique a partir da raiz do repositório ou da pasta configurada como source.
5. Ative o domínio customizado `www.simplecoluna.com`.

## DNS sugerido
- `www` como `CNAME` apontando para o endereço do GitHub Pages.
- domínio raiz `simplecoluna.com` com redirecionamento para `www.simplecoluna.com`.

## Observação
O painel administrativo atual salva os dados no navegador do usuário. Para edição centralizada em produção, o próximo passo é conectar um backend.
