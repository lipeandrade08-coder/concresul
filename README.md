# Concresul

Landing page institucional da Concresul, em HTML, CSS e JavaScript, com layout responsivo, serviços, frota interativa e orçamento pelo WhatsApp.

## Executar localmente

Requer Python 3. O npm é usado somente como atalho, sem dependências para instalar.

```sh
npm run dev
```

Abra http://127.0.0.1:4173. Também é possível executar diretamente:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

## Verificar JavaScript

Com Node.js instalado:

```sh
npm run check
```

## Estrutura

- `dist/index.html`: conteúdo, contatos e formulário.
- `dist/styles.css`: identidade visual e layout responsivo.
- `dist/script.js`: navegação, frota e preparação da mensagem do WhatsApp.
- `dist/motion.css` e `dist/motion.js`: entradas em sequência, revelação ao rolar, movimentos discretos nas fotos da frota e controle de animações no rodapé.
- `dist/assets/`: imagens WebP com transparência e favicon.

O site respeita a preferência de reduzir movimentos do aparelho. O visitante também pode ativar ou pausar as animações pelo botão na página. A solicitação de orçamento abre uma mensagem no WhatsApp; o visitante confirma o envio no aplicativo.

## Hospedagem

A pasta `dist` é o diretório público completo e pode ser hospedada em um serviço de sites estáticos. Não há servidor de aplicação nem etapa de build.

## Busca e indexação

A página inclui dados estruturados da empresa e dos serviços, `robots.txt` e `sitemap.xml`. Se o endereço de produção mudar, atualize a URL canônica, os metadados de compartilhamento e o JSON-LD em `dist/index.html`, além de `dist/robots.txt` e `dist/sitemap.xml`.

Quando o conteúdo estiver acessível sem login, confirme o retorno HTTP 200 da página e dos arquivos de busca. Depois de verificar a propriedade do endereço, envie o sitemap no Google Search Console e Bing Webmaster Tools.
