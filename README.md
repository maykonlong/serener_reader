# Serene Reader

Leitor de ebooks offline-first para EPUB, PDF, FB2, CBZ, DOCX, TXT, Markdown e artigos. O projeto prioriza conforto visual, acessibilidade, foco e privacidade. Pode ser instalado como PWA ou compilado como aplicativo Android com Capacitor.

Nenhum conteúdo de livro é enviado para servidores. Biblioteca, progresso, preferências, marcadores, notas e destaques ficam no IndexedDB do dispositivo.

## Experiência de leitura

- Biblioteca como entrada na primeira execução, cartão **Continuar lendo** e navegação móvel pensada para uso com uma mão.
- Ajustes separados em **Leitura**, **Áudio**, **Recursos** e **App**, sem uma lista única interminável.
- Modos prontos **Conforto**, **Kindle**, **E-ink** e **Antes de dormir**, que ajustam cor, fonte, margem, espaçamento e navegação em um toque.
- Paletas Kindle Branco, Papel Creme, E-ink, Sépia, Noite e OLED, além de tema automático, dimmer e filtro âmbar.
- Leitura paginada ou por rolagem, modo imersivo, busca, índice com pesquisa e salto direto para qualquer capítulo, progresso e estimativa de tempo.
- Fontes Literata, Lora, Merriweather, Atkinson Hyperlegible, Lexend, Vollkorn e OpenDyslexic empacotadas localmente.
- Ajuste de tamanho, entrelinha, parágrafos, largura, alinhamento e transição de página.
- TTS com vozes do sistema, leitura contínua, sleep timer e destaque palavra a palavra.
- Régua, foco de linha, leitura biônica, RSVP, alto contraste e sons ambientes.

## Biblioteca e formatos

- Importação em lote de EPUB, PDF, TXT, Markdown, DOCX, CBZ e FB2.
- EPUBs grandes usam índice leve, carregamento sob demanda do capítulo atual, paginação cooperativa e cache curto; o arquivo compactado não é duplicado na memória.
- Capas e imagens internas preservadas localmente.
- OCR offline em português e inglês para PDFs escaneados.
- Busca e ordenação da biblioteca, etiquetas, avaliação, estado de leitura e estatísticas.
- Marcadores, anotações, destaques em quatro cores, exportação Markdown e backup JSON.
- Catálogo Project Gutenberg e importação de artigos por URL quando houver internet.

## Offline e privacidade

O build não usa CDNs. Tailwind, fontes, JSZip, PDF.js, DOMPurify, Marked, Mammoth, Readability, Tesseract e os idiomas de OCR são copiados para o pacote. O service worker recebe um manifesto com todos os assets locais.

A leitura de arquivos locais, biblioteca, progresso, anotações, busca, OCR e TTS do sistema funcionam sem conexão. Apenas recursos cuja origem é externa precisam de rede: importar artigo por URL, catálogo Project Gutenberg, tradução e Wikipedia. Vozes TTS adicionais podem precisar ser baixadas nas configurações do Android uma única vez.

## Executar no navegador

Requer Node.js 22.13 ou mais recente.

```bash
git clone https://github.com/maykonlong/serener_reader.git
cd serener_reader
npm install
npm run dev
```

Acesse `http://localhost:8000`. O comando gera `www/` e serve exatamente o pacote de produção. Para gerar sem iniciar o servidor, use `npm run build`.

## Android

O diretório `android/` já contém o projeto Capacitor. Para sincronizar o conteúdo e abrir no Android Studio:

```bash
npm run android:sync
npm run android:open
```

Para compilar localmente, instale Android Studio, JDK 21 e Android SDK 36. O APK de teste pode ser criado no Android Studio ou, dentro de `android/`, com `gradlew assembleDebug` no Windows e `./gradlew assembleDebug` no macOS/Linux.

O app usa o seletor de arquivos do sistema, não pede acesso amplo ao armazenamento, bloqueia HTTP sem criptografia e não inclui a biblioteca do usuário no backup do Android.

Na versão 2.2, arquivos EPUB/PDF ficam separados dos metadados no IndexedDB. Salvar progresso, nota ou avaliação não regrava o arquivo inteiro a cada página.

## PWA

Hospede o conteúdo de `www/` em HTTPS. No Chrome ou Safari, use “Adicionar à tela inicial”. Depois do primeiro carregamento completo, o leitor e seus recursos locais ficam disponíveis offline.

### GitHub Pages e download do APK

O workflow `.github/workflows/deploy-pages.yml` compila o site, gera o APK Android de teste e publica ambos no GitHub Pages. O botão **Baixar APK** da página aponta para `downloads/serene-reader-android.apk`, criado automaticamente em cada atualização da branch `main`.

No GitHub, deixe **Settings → Pages → Source** configurado como **GitHub Actions**. Não publique a raiz da branch diretamente: ela contém o código-fonte, enquanto a interface pronta e suas dependências locais ficam em `www/` depois do build.

## Qualidade

```bash
npm run check
```

Esse comando:

1. valida a sintaxe dos módulos JavaScript;
2. executa os testes automatizados;
3. compila o Tailwind;
4. gera o pacote offline;
5. rejeita dependências de CDN no HTML de produção.

Os testes manuais legados continuam disponíveis em `tests/test.html`. `npm audit` deve permanecer sem vulnerabilidades conhecidas.

## Estrutura

- `index.html`: interface e painéis do leitor.
- `css/`: design, fontes locais e entrada do Tailwind.
- `js/`: armazenamento, parsers, paginação, TTS, anotações, estatísticas e aplicação.
- `scripts/build.mjs`: gera `www/` e copia dependências/fontes locais.
- `sw.js` e `manifest.json`: instalação e cache da PWA.
- `android/`: projeto Android Capacitor.
- `www/`: artefato gerado, ignorado pelo Git.

## Roadmap

- Consulte a [auditoria de produto e comparação com o eBoox](docs/LEITOR_COMPLETO.md) para a matriz completa de recursos e prioridades.
- Sincronização opcional entre dispositivos com criptografia ponta a ponta.
- Layout de duas páginas lado a lado para tablets e monitores largos.
- Processamento de parsers pesados em Web Workers.
- Resumos e perguntas sobre o livro como integração opcional, sempre desligada por padrão.

Licença MIT.
