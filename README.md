# Serene Reader 📖✨

Um leitor de ebooks (EPUB, PDF, FB2, CBZ), TXT, Markdown e artigos da web 100% focado em **ergonomia ocular, retenção de foco e redução da fadiga visual**, construído nativamente com JavaScript (Vanilla) e Tailwind CSS.

Totalmente **offline-first, client-side e privativo**. Nenhuma linha de texto dos seus livros é enviada para servidores. Funciona perfeitamente como aplicativo nativo no celular ou desktop via PWA.

---

## 🌟 Principais Funcionalidades

### 👁️ Ergonomia e Leitura
- **Modos Circadianos:** Paletas de cor curadas (Papel Natural, Sépia, Noite Conforto, Luz Vermelha Anti-insônia).
- **Dimmer Universal & Filtro Âmbar:** Filtre a luz azul e reduza o brilho do fundo da tela sem depender do sistema operacional.
- **Paginação Exata (Sem scroll vertical):** Um motor de paginação DOM matemático que garante que linhas nunca sejam cortadas ao meio. Pagine deslizando a tela ou com toques nas margens (Mobile-first).
- **Tipografia Ajustável:** Controle fino de tamanho da fonte, espaçamento entre linhas, espaço entre parágrafos e alinhamento (justificado/esquerda).
- **Leitura Imersiva:** Esconda as barras superiores e inferiores com um toque (ou tecla `I`) para leitura sem distrações.
- **Estimativa de Tempo Restante:** Veja quantos minutos faltam para terminar o capítulo com base no seu ritmo real de leitura.
- **Imagens Integradas:** Ilustrações e figuras internas aparecem nos livros (EPUB, DOCX, CBZ, Markdown, FB2), convertidas para base64 localmente — sem depender de internet.

### ⚡ Retenção de Foco e Acessibilidade
- **Sintetizador de Voz (TTS):** Escute seus livros com as vozes nativas do sistema. Possui Sleep Timer de até 30min para desligar automaticamente.
- **Bionic Reading (Leitura Biônica):** Destaque dinâmico das sílabas iniciais de cada palavra para guiar os olhos e aumentar a velocidade de leitura para mentes neurodivergentes (TDAH).
- **Régua de Leitura & Foco de Linha:** Auxiliares visuais para quem perde a linha de leitura com facilidade.
- **RSVP (Leitura Rápida):** Modo de apresentação de uma palavra por vez para picos intensos de foco e absorção ultrarrápida.
- **Fonte OpenDyslexic:** Suporte nativo à tipografia construída para leitores com Dislexia.

### 📚 Biblioteca e Anotações Privativas
- **IndexedDB Local:** O aplicativo arquiva e indexa sua biblioteca 100% no cache local do seu dispositivo. 
- **Auto-save de Progresso:** Lembra exatamente em que página você estava, recalculando proporcionalmente até se você mudar o tamanho da fonte.
- **Marcadores de Página (Bookmarks):** Salve trechos favoritos do livro.
- **Anotações Livres:** Um caderno de notas acoplado por livro, salvo automaticamente.
- **Importador de URL (Web Reader):** Cole o link de um artigo ou notícia da web, e o aplicativo extrairá o texto limpo, livre de anúncios, trazendo para dentro da sua biblioteca.
- **Exportação/Backup:** Gere um arquivo `.json` portátil contendo todos os seus livros, progresso e notas para levar para outro dispositivo.
- **Estatísticas de Leitura:** Acompanhe tempo total, páginas lidas, sequência de dias consecutivos, seu ritmo (palavras por minuto) e **meta diária de leitura** com barra de progresso.
- **Busca Avançada:** Encontre termos no livro com navegação entre ocorrências (Enter / Shift+Enter) e destaque visual (marca-texto).
- **Biblioteca com Filtro e Ordenação:** Pesquise por título/autor e ordene por recentes, título, autor ou progresso.
- **Importação em Lote:** Arraste e solte múltiplos arquivos de uma vez (EPUB, PDF, TXT, MD, DOCX, CBZ, FB2).
- **Tema Automático:** Alterne automaticamente entre claro (dia) e escuro (noite) conforme o horário.
- **Mais Fontes e Vozes:** Novas tipografias (Atkinson Hyperlegible, Lexend, Vollkorn) e filtro de idioma no sintetizador de voz (TTS).
- **Atalhos de Teclado:** Painel de ajuda com a tecla `?` para descobrir todos os atalhos.
- **Leitura Contínua por Voz:** O TTS vira as páginas (e capítulos) automaticamente, com controles na tela de bloqueio via Media Session API.
- **Transições de Página:** Escolha entre Nenhuma, Esmaecer ou Deslizar para a virada de página.

---

## 🛠️ Tecnologias Utilizadas

- **HTML5, CSS3 & JavaScript (Vanilla)**
- **Tailwind CSS** (via CDN para estilos rápidos)
- **IndexedDB / localForage** (Armazenamento permanente assíncrono no navegador)
- **Web Speech API** (Sintetizador de voz TTS sem dependências)
- **DOMPurify & Readability.js** (Extração e sanitização segura de artigos web)
- **JSZip & pdf.js** (Descompactação e leitura de formatos de arquivo no cliente)
- **Service Workers (PWA)** (Cache offline e instalabilidade mobile)

---

## 🚀 Como Rodar e Instalar (PWA)

Por ser uma aplicação baseada inteiramente no cliente e sem necessidade de backend ou banco de dados, você pode hospedá-lo em qualquer lugar!

### Executando Localmente
1. Faça o clone do repositório:
```bash
git clone https://github.com/maykonlong/serener_reader.git
```
2. Abra um servidor local simples na raiz do projeto (como o Live Server do VSCode, ou Python):
```bash
python -m http.server 8000
```
3. Acesse `http://localhost:8000`.

### Instalando no Celular (Mobile-First)
1. Acesse o link hospedado da aplicação pelo **Google Chrome** (Android) ou **Safari** (iOS).
2. Abra o menu do navegador e toque em **"Adicionar à Tela Inicial"** (Add to Home Screen).
3. O Serene Reader agora está instalado como um aplicativo offline nativo na sua gaveta de aplicativos!

---

## 📁 Estrutura do Projeto

- `/index.html`: Arquivo principal e estrutura de layout.
- `/sw.js` e `/manifest.json`: Configurações de PWA (Service Worker e Manifest).
- `/css/styles.css`: Modificações finas acima do Tailwind (animações customizadas e fontes).
- `/js/`:
  - `app.js`: Orquestrador principal da aplicação.
  - `pagination.js`: Motor matemático que lida com fatiamento de páginas.
  - `storage.js`: Manipulador de IndexedDB e salvamento de estado.
  - `stats.js`: Rastreia tempo, páginas, palavras e sequência de leitura.
  - `tts_engine.js`: Wrapper em torno da Web Speech API.
  - `epub_parser.js`, `pdf_reader.js`, `format_parsers.js`: Decodificadores client-side de arquivos.
  - `url_reader.js`: Coletor e parseador de artigos web.

---

## 🤝 Contribuições

Este projeto foi construído para evoluir. Se você deseja adicionar suporte a novos formatos, novas paletas de cor, ou aprimorar os algoritmos de acessibilidade (como o TTS e o Bionic Reading), sinta-se à vontade para abrir uma *Issue* ou enviar um *Pull Request*. 

**Licença MIT.**
