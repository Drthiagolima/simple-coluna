# Checklist GitHub Pages

Este guia fecha o caminho lógico para publicar o Simple Coluna no domínio `www.simplecoluna.com`.

## 1. Subir o código
- Envie todos os arquivos da pasta raiz do projeto para um repositório no GitHub.
- Mantenha `index.html` na raiz do repositório.
- Preserve os arquivos `.nojekyll`, `404.html` e `CNAME`.

## 2. Configurar GitHub Pages
- Abra o repositório no GitHub.
- Vá em `Settings > Pages`.
- Em `Build and deployment`, selecione a branch que vai publicar o site.
- A pasta de publicação deve ser a raiz do repositório, ou a pasta configurada pelo GitHub Pages.

## 3. Adicionar domínio customizado
- Em `Settings > Pages`, adicione `www.simplecoluna.com` como custom domain.
- Confirme que o GitHub manteve o arquivo `CNAME` no projeto.

## 4. Configurar DNS do domínio
No provedor onde o domínio foi comprado, crie os registros abaixo:

### Para `www`
- Tipo: `CNAME`
- Nome/Host: `www`
- Destino/Value: `seu-usuario.github.io`

### Para o domínio raiz
- Tipo: `A`
- Nome/Host: `@`
- Valores:
  - `185.199.108.153`
  - `185.199.109.153`
  - `185.199.110.153`
  - `185.199.111.153`

Opcionalmente, crie também um redirecionamento do domínio raiz para `www.simplecoluna.com` no provedor de DNS ou na hospedagem.

## 5. Validar
- Aguardar a propagação do DNS.
- Abrir `https://www.simplecoluna.com`.
- Confirmar que a landing e a área da plataforma carregam normalmente.

## 6. Próximo ajuste recomendado
- Migrar o painel administrativo para backend, se for necessário salvar os cadastros fora do navegador.
