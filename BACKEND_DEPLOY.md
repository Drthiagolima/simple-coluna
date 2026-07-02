# Backend em Producao (Render)

Este projeto agora suporta backend externo para eliminar o modo fallback local.

## 1. Publicar API no Render

1. Abra o Render e conecte o repositório `Drthiagolima/simple-coluna`.
2. Escolha `Blueprint` (Render detecta `render.yaml`) ou crie um `Web Service` Node manualmente.
3. Se criar manualmente:
   - Root Directory: `.`
   - Build Command: vazio
   - Start Command: `npm start`
   - Node version: 20
4. Configure a env var `SIMPLE_COLUNA_SECRET` (qualquer valor forte).
5. Aguarde deploy e copie a URL pública da API, por exemplo:
   - `https://simple-coluna-api.onrender.com`

## 2. Apontar frontend para a API

Edite os dois arquivos abaixo e preencha a meta tag `simplecoluna-api-base`:

- `index.html`
- `deploy-package/index.html`

Exemplo:

```html
<meta name="simplecoluna-api-base" content="https://simple-coluna-api.onrender.com" />
```

Depois faça commit e push no `main`.

## 3. Validar no dominio

1. Abra `https://www.simplecoluna.com`.
2. Faça login.
3. Confirme que NAO aparece o toast:
   - `Modo online indisponivel neste dominio...`
4. Em caso de erro de CORS, confirme no backend se `https://www.simplecoluna.com` esta liberado.

## 4. Observacao

Enquanto a API externa nao estiver configurada, o frontend continua funcionando em fallback local no navegador.
