# Auditoria de produto: Serene Reader como leitor completo

Esta auditoria separa três coisas: o que um leitor espera, o que já existe no Serene Reader e o que ainda vale desenvolver. A referência do eBoox é a [listagem oficial no Google Play](https://play.google.com/store/apps/details?id=com.reader.books), não material promocional de terceiros.

## O que um leitor espera

### Biblioteca

- abrir o app e encontrar rapidamente o livro atual;
- capas, título, autor, progresso e estado de leitura claros;
- busca, ordenação, filtros, coleções/etiquetas e favoritos;
- importação simples, em lote e pelo menu “Abrir com” do Android;
- edição de capa e metadados;
- remoção sem medo e confirmação antes de apagar;
- armazenamento local previsível, com backup e restauração.

### Leitura

- página limpa com tipografia de livro, boas margens e largura confortável;
- paginação e rolagem contínua;
- temas claro, creme, sépia, e-ink, noturno e OLED;
- fonte, tamanho, entrelinha, recuo, alinhamento e espaçamento configuráveis;
- índice, busca no livro, indicador de capítulo, página, porcentagem e tempo restante;
- marcadores, destaques, notas e exportação;
- gestos, zonas de toque, modo imersivo e tela sempre ligada opcional;
- restauração exata do ponto de leitura;
- boa experiência em celular, tablet e tela larga.

### Acessibilidade e áudio

- TTS com iniciar, pausar, continuar e parar;
- seleção de voz, velocidade, tom, leitura contínua e temporizador;
- suporte a fontes acessíveis, alto contraste, foco de linha e régua;
- controles com alvos grandes, rótulos e navegação por teclado/leitor de tela;
- dicionário e tradução de uma palavra ou trecho selecionado.

### Formatos e PDF

- EPUB e PDF impecáveis;
- TXT, HTML, FB2, DOC/DOCX, RTF, ODT e Markdown;
- quadrinhos CBZ/CBR;
- MOBI/PRC para acervos antigos;
- ZIP/RAR quando contiverem livros compatíveis;
- PDF com zoom, recorte de margens, modo noturno, texto selecionável e OCR.

### Offline, privacidade e confiança

- leitura, biblioteca, pesquisa, anotações e recursos principais sem internet;
- nenhum envio silencioso de livros;
- indicação explícita do que precisa de rede;
- atualização confiável sem preservar arquivos antigos quebrados no cache;
- sincronização opcional e criptografada entre aparelhos;
- exportação dos dados em formato aberto.

## Serene Reader hoje

| Área | Situação |
|---|---|
| EPUB, PDF, FB2, CBZ, DOCX, TXT e Markdown | Implementado |
| Artigos por URL e catálogo Gutenberg | Implementado; exige internet |
| Biblioteca local com capas, busca, ordenação, etiquetas, avaliação e estado | Implementado |
| Cartão “Continuar lendo” e biblioteca na primeira execução | Implementado na versão 2.1 |
| Aparência de livro, modos Kindle/e-ink/creme/noite/OLED | Implementado |
| Paginação, rolagem, índice, busca, estimativa e modo imersivo | Implementado |
| TTS completo, sons ambientes, OCR, régua, foco, RSVP e leitura biônica | Implementado |
| Marcadores, destaques, notas, exportação e backup | Implementado |
| PWA offline e APK Android | Implementado |
| MOBI, PRC, RTF, ODT, CBR e RAR | Ainda não |
| Dicionário por seleção | Ainda não |
| Sincronização real entre aparelhos | Ainda não; há backup manual |
| Importação por nuvem | Ainda não |
| “Abrir com Serene Reader” no Android | Ainda não |
| Edição manual de capa/metadados | Ainda não |
| PDF com recorte automático de margens e reflow | Ainda não |
| Coleções e favoritos dedicados | Ainda não; etiquetas cobrem parte do uso |

## Comparação com eBoox

Segundo a listagem oficial, o eBoox aceita FB2, EPUB, PDF, DOC, DOCX, MOBI, PRC, TXT, RTF, ODT, HTML, CBR, CBZ, ZIP e RAR; importa de pastas do aparelho, cartão SD, nuvem e navegador; e sincroniza arquivos entre aparelhos Android.

### Onde o eBoox está à frente

- compatibilidade com mais formatos legados;
- importação nativa de pastas, SD e provedores de nuvem;
- sincronização entre dispositivos;
- fluxo Android mais maduro e familiar para abrir arquivos externos;
- experiência consolidada por uma base grande de usuários.

### Onde o Serene Reader já pode ser melhor

- privacidade offline explícita, sem depender de conta;
- mais modos de conforto visual e acessibilidade;
- TTS com sons ambientes, OCR local, régua, foco de linha, RSVP e leitura biônica;
- backup aberto em JSON e exportação de notas em Markdown;
- app instalável também como PWA, além do APK;
- código aberto e interface que pode evoluir sem anúncios.

## O que vale aplicar

### Prioridade alta

1. “Abrir com Serene Reader” e compartilhamento de arquivos no Android.
2. Dicionário offline/online acionado ao selecionar uma palavra.
3. Favoritos e coleções separados de etiquetas.
4. Edição de título, autor e capa.
5. Controles de PDF: recortar margens, ajuste à largura e contraste noturno.
6. Remoção de destaque diretamente pelo trecho selecionado.
7. Opções de zonas de toque, teclas de volume e manter tela ligada.

### Prioridade média

1. RTF, ODT, HTML, CBR e ZIP genérico.
2. Sincronização opcional entre dispositivos com criptografia ponta a ponta.
3. Importação via Google Drive/Dropbox/WebDAV usando o seletor do sistema.
4. Layout de duas páginas em tablets.
5. Importação de fontes do usuário.

### Avaliar antes de implementar

- MOBI/PRC: úteis para acervos antigos, mas exigem parser robusto e testes com muitas variantes;
- RAR: aumenta peso e superfície de segurança; CBR pode vir depois de CBZ/ZIP;
- DRM: não deve ser prometido sem acordos e infraestrutura próprios;
- recursos de IA: somente opcionais e nunca enviando o livro sem consentimento explícito.

## Critério de “app completo”

O produto fica pronto para uso diário quando a biblioteca, a retomada da leitura, a importação Android, o PDF, o dicionário e as anotações forem confiáveis antes de adicionar mais efeitos. A regra é simples: as funções centrais precisam estar a um toque; recursos avançados podem existir, mas não podem ocupar a tela principal nem atrapalhar quem só quer abrir um livro e ler.
