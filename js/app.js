/**
 * SereneReader - Main Application Controller (app.js)
 * Conecta armazenamento IndexedDB, paginação DOM exata, parsers EPUB/PDF,
 * leitor de voz TTS, controles de iluminação circadiana e biblioteca de livros.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // --- Temas Ergonómicos com estilos sincronizados para Gavetas (Drawers) ---
  const THEMES = {
    paper: {
      bg: '#F7F4EB',
      text: '#242424',
      border: '#dfdaca',
      drawerBg: '#EFECE1',
      drawerText: '#242424',
      drawerBorder: '#dcd7c7'
    },
    sepia: {
      bg: '#EFE6D5',
      text: '#2D2B28',
      border: '#dacdb5',
      drawerBg: '#E6DCC9',
      drawerText: '#2D2B28',
      drawerBorder: '#d2c3a7'
    },
    night: {
      bg: '#161618',
      text: '#C2C0B8',
      border: '#2b2b2e',
      drawerBg: '#202023',
      drawerText: '#C2C0B8',
      drawerBorder: '#323236'
    },
    red: {
      bg: '#110505',
      text: '#B86B6B',
      border: '#311313',
      drawerBg: '#1c0a0a',
      drawerText: '#B86B6B',
      drawerBorder: '#3a1717'
    }
  };

  // --- Obras Embutidas em Domínio Público ---
  const DEFAULT_BOOKS = {
    lusiadas: {
      id: 'default_lusiadas',
      title: 'Os Lusíadas',
      author: 'Luís de Camões',
      format: 'txt',
      content: `CANTO I\n\nAs armas e os barões assinalados,\nQue da ocidental praia Lusitana,\nPor mares nunca de antes navegados,\nPassaram ainda além da Taprobana,\nEm perigos e guerras esforçados,\nMais do que prometia a força humana,\nE entre gente remota edificaram\nNovo Reino, que tanto sublimaram;\n\nE também as memórias gloriosas\nDaqueles Reis, que foram dilatando\nA Fé, o Império, e as terras viciosas\nDe África e de Ásia andaram devastando;\nE aqueles, que por obras valerosas\nSe vão da lei da morte libertando;\nCantando espalharei por toda parte,\nSe a tanto me ajudar o engenho e arte.\n\nCessem do sábio Grego e do Troiano\nAs navegações grandes que fizeram;\nCale-se de Alexandre e de Trajano\nA fama das vitórias que tiveram;\nQue eu canto o peito ilustre Lusitano,\nA quem Neptuno e Marte obedeceram:\nCesse tudo o que a Musa antiga canta,\nQue outro valor mais alto se alevanta.`
    },
    casmurro: {
      id: 'default_casmurro',
      title: 'Dom Casmurro',
      author: 'Machado de Assis',
      format: 'txt',
      content: `CAPÍTULO I: DO TÍTULO\n\nUma noite destas, vindo da cidade para o Engenho Novo, encontrei no comboio da Central um rapaz aqui do bairro, ao qual eu conhecia de vista e de chapéu. Cumprimentou-me, sentou-se ao pé de mim, falou da lua e dos ministros, e acabou recitando-me versos. A viagem era curta, e os versos pode ser que não fossem inteiramente maus, porém o que aconteceu foi que eu adormeci.\n\nAcordei com o rapaz sacudindo-me o braço e dizendo que já tínhamos chegado. Não tive tempo de me queixar; saltei do vagão, e deixei-o a falar sozinho.\n\nNo dia seguinte, os vizinhos, que sabiam dos meus hábitos de recolhimento, começaram a chamar-me "Dom Casmurro". O apelido pegou. Não consultes os dicionários. Casmurro não está ali no sentido vulgar de teimoso, mas no de homem calado e metido consigo.\n\nCAPÍTULO II: DO LIVRO\n\nAgora que expliquei o título, passo a escrever o livro. Por que o escrevo? Confesso que já me fiz essa pergunta, e a resposta que me dou é que não tenho nada melhor a fazer com os meus dias. Vivo só, com um criado. A casa em que moro é própria; fiz construí-la expressamente para imitar a em que morei na infância, na antiga Rua de Matacavalos.`
    }
  };

  // --- Estado da Aplicação ---
  const state = {
    currentBook: null,
    pages: [],
    currentPage: 0,
    currentChapter: 0,
    theme: 'paper',
    fontFamily: 'Literata',
    fontSize: 18,
    maxWidthClass: 'max-w-xl',
    lineHeight: 1.7,
    paragraphSpacing: 20,
    textAlign: 'justify',
    subDimmerOpacity: 0,
    amberOpacity: 0,
    ttsRate: 1.0,
    isPdfMode: false,
    pdfText: '',
    pdfZoom: 1.0,
    readingMode: 'paged', // 'paged' | 'scroll'
    chapterWordCount: 0,
    bookWordCount: 0
  };

  // --- Elementos da DOM ---
  const root = document.getElementById('reader-root');
  const pageContentEl = document.getElementById('page-content');
  const readingContainerEl = document.getElementById('reading-container');
  const headerBookNameEl = document.getElementById('header-book-name');
  const pageCounterTextEl = document.getElementById('page-counter-text');
  const progressBarFillEl = document.getElementById('progress-bar-fill');
  const touchHintEl = document.getElementById('touch-hint');

  const dimmerOverlay = document.getElementById('dimmer-overlay');
  const amberOverlay = document.getElementById('amber-overlay');

  const settingsDrawer = document.getElementById('settings-drawer');
  const settingsBackdrop = document.getElementById('settings-backdrop');
  const libraryDrawer = document.getElementById('library-drawer');
  const libraryBackdrop = document.getElementById('library-backdrop');
  const tocDrawer = document.getElementById('toc-drawer');
  const tocBackdrop = document.getElementById('toc-backdrop');

  const openSettingsBtn = document.getElementById('open-settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const openLibraryBtn = document.getElementById('open-library-btn');
  const closeLibraryBtn = document.getElementById('close-library-btn');
  const openTocBtn = document.getElementById('open-toc-btn');
  const closeTocBtn = document.getElementById('close-toc-btn');

  const subDimmerSlider = document.getElementById('sub-dimmer-slider');
  const subDimmerVal = document.getElementById('sub-dimmer-val');
  const amberSlider = document.getElementById('amber-slider');
  const amberVal = document.getElementById('amber-val');
  const fontSizeSlider = document.getElementById('font-size-slider');
  const fontSizeVal = document.getElementById('font-size-val');
  const lineHeightSlider = document.getElementById('line-height-slider');
  const lineHeightVal = document.getElementById('line-height-val');
  const paragraphSpacingSlider = document.getElementById('paragraph-spacing-slider');
  const paragraphSpacingVal = document.getElementById('paragraph-spacing-val');
  const readingEstimateText = document.getElementById('reading-estimate-text');
  const progressPercentText = document.getElementById('progress-percent-text');

  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const tapPrevZone = document.getElementById('tap-prev-zone');
  const tapNextZone = document.getElementById('tap-next-zone');
  const fileInput = document.getElementById('file-input');
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  const immersiveBtn = document.getElementById('immersive-btn');
  const searchCount = document.getElementById('search-count');

  const ttsPlayBtn = document.getElementById('tts-play-btn');
  const ttsRateSlider = document.getElementById('tts-rate-slider');
  const ttsRateVal = document.getElementById('tts-rate-val');
  const ttsVoiceSelect = document.getElementById('tts-voice-select');
  const ttsVoiceApplyBtn = document.getElementById('tts-voice-apply-btn');
  const ttsPitchSlider = document.getElementById('tts-pitch-slider');
  const ttsPitchVal = document.getElementById('tts-pitch-val');
  const ttsTimerBtns = document.querySelectorAll('.tts-timer-btn');
  const bionicToggle = document.getElementById('bionic-toggle');
  const linefocusToggle = document.getElementById('linefocus-toggle');
  const rulerToggle = document.getElementById('ruler-toggle');
  const openRsvpBtn = document.getElementById('open-rsvp-btn');
  const searchInput = document.getElementById('search-input');
  const mobileSearchBtn = document.getElementById('mobile-search-btn');
  const searchContainer = document.getElementById('search-container');
  const bookNotesInput = document.getElementById('book-notes-input');
  const exportBackupBtn = document.getElementById('export-backup-btn');
  const importBackupInput = document.getElementById('import-backup-input');

  const addBookmarkBtn = document.getElementById('add-bookmark-btn');
  const bookmarksListEl = document.getElementById('bookmarks-list');

  // --- Prevenir que cliques dentro das gavetas se propaguem para o backdrop ---
  [settingsDrawer, libraryDrawer, tocDrawer].forEach(drawer => {
    if (drawer) {
      drawer.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  });

  // --- Sistema de Notificações Toast (substitui alerts invasivos) ---
  function showToast(message, type = 'info', duration = 2600) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-[120] flex flex-col items-center gap-2 px-4 pointer-events-none';
      document.body.appendChild(container);
    }
    const colors = { info: 'bg-slate-800', success: 'bg-emerald-600', error: 'bg-red-600', warning: 'bg-amber-600' };
    const el = document.createElement('div');
    el.className = `toast-item ${colors[type] || colors.info} text-white text-xs sm:text-sm px-4 py-2.5 rounded-full shadow-lg`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('toast-out');
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  // --- Modo Imersivo (esconder barras para leitura sem distrações) ---
  function toggleImmersive() {
    document.body.classList.toggle('immersive');
  }
  if (immersiveBtn) immersiveBtn.addEventListener('click', toggleImmersive);

  // --- Carregamento de Preferências Salvas ---
  async function loadPreferences() {
    const saved = await window.sereneStorage.getPreference('user_settings');
    if (saved) {
      if (saved.theme) applyTheme(saved.theme);
      if (saved.fontFamily) state.fontFamily = saved.fontFamily;
      if (saved.fontSize) {
        state.fontSize = saved.fontSize;
        if (fontSizeSlider) fontSizeSlider.value = saved.fontSize;
        if (fontSizeVal) fontSizeVal.textContent = `${saved.fontSize}px`;
      }
      if (saved.maxWidthClass) state.maxWidthClass = saved.maxWidthClass;
      if (saved.lineHeight) {
        state.lineHeight = saved.lineHeight;
        if (lineHeightSlider) lineHeightSlider.value = saved.lineHeight;
        if (lineHeightVal) lineHeightVal.textContent = `${saved.lineHeight}x`;
      }
      if (saved.paragraphSpacing !== undefined) {
        state.paragraphSpacing = saved.paragraphSpacing;
        if (paragraphSpacingSlider) paragraphSpacingSlider.value = saved.paragraphSpacing;
        if (paragraphSpacingVal) paragraphSpacingVal.textContent = `${saved.paragraphSpacing}px`;
      }
      if (saved.textAlign) state.textAlign = saved.textAlign;
      if (saved.subDimmerOpacity !== undefined) {
        state.subDimmerOpacity = saved.subDimmerOpacity;
        dimmerOverlay.style.opacity = saved.subDimmerOpacity;
        if (subDimmerSlider) subDimmerSlider.value = Math.round(saved.subDimmerOpacity * 100);
        if (subDimmerVal) subDimmerVal.textContent = `${Math.round(saved.subDimmerOpacity * 100)}%`;
      }
      if (saved.amberOpacity !== undefined) {
        state.amberOpacity = saved.amberOpacity;
        amberOverlay.style.opacity = saved.amberOpacity;
        if (amberSlider) amberSlider.value = Math.round(saved.amberOpacity * 100);
        if (amberVal) amberVal.textContent = `${Math.round(saved.amberOpacity * 100)}%`;
      }
      if (saved.bionicEnabled !== undefined) {
        if (window.sereneReadingModes) window.sereneReadingModes.bionicEnabled = saved.bionicEnabled;
        if (bionicToggle) bionicToggle.checked = saved.bionicEnabled;
      }
      if (saved.lineFocusEnabled !== undefined) {
        if (linefocusToggle) linefocusToggle.checked = saved.lineFocusEnabled;
        if (window.sereneReadingModes) window.sereneReadingModes.toggleLineFocus(saved.lineFocusEnabled);
      }
      if (saved.rulerEnabled !== undefined) {
        if (rulerToggle) rulerToggle.checked = saved.rulerEnabled;
        if (window.sereneReadingModes) window.sereneReadingModes.toggleRuler(saved.rulerEnabled);
      }
      if (saved.readingMode) {
        state.readingMode = saved.readingMode;
      }
      if (saved.pdfZoom !== undefined) {
        state.pdfZoom = saved.pdfZoom;
      }
    } else {
      applyTheme('paper');
    }
    updateActiveButtonStates();
    updateZoomLabel();
  }

  async function savePreferences() {
    await window.sereneStorage.savePreference('user_settings', {
      theme: state.theme,
      fontFamily: state.fontFamily,
      fontSize: state.fontSize,
      maxWidthClass: state.maxWidthClass,
      lineHeight: state.lineHeight,
      paragraphSpacing: state.paragraphSpacing,
      textAlign: state.textAlign,
      subDimmerOpacity: state.subDimmerOpacity,
      amberOpacity: state.amberOpacity,
      bionicEnabled: window.sereneReadingModes ? window.sereneReadingModes.bionicEnabled : false,
      lineFocusEnabled: window.sereneReadingModes ? window.sereneReadingModes.lineFocusEnabled : false,
      rulerEnabled: window.sereneReadingModes ? window.sereneReadingModes.rulerEnabled : false,
      readingMode: state.readingMode,
      pdfZoom: state.pdfZoom
    });
  }

  // --- Carregamento do Livro Ativo ou Padrão ---
  async function loadInitialBook() {
    const lastBookId = await window.sereneStorage.getPreference('last_active_book_id');
    let book = null;
    if (lastBookId) {
      book = await window.sereneStorage.getBook(lastBookId);
    }

    if (!book) {
      await window.sereneStorage.saveBook(DEFAULT_BOOKS.lusiadas);
      await window.sereneStorage.saveBook(DEFAULT_BOOKS.casmurro);
      book = DEFAULT_BOOKS.lusiadas;
    }

    await openBook(book);
  }

  // --- Abertura de Livro (TXT, EPUB, PDF) ---
  async function openBook(book) {
    state.currentBook = book;
    
    // Load notes
    if (bookNotesInput) {
      bookNotesInput.value = book.notes || '';
    }

    state.currentPage = book.currentPage || 0;
    state.currentChapter = book.currentChapter || 0;
    state.isPdfMode = book.format === 'pdf';

    headerBookNameEl.textContent = book.title || 'Sem Título';
    await window.sereneStorage.savePreference('last_active_book_id', book.id);

    // Iniciar sessão de leitura nas estatísticas
    if (window.sereneStats) {
      window.sereneStats.startSession(book.id);
    }

    if (state.isPdfMode) {
      try {
        await window.serenePDFReader.loadDocument(book.content);
        state.pages = new Array(window.serenePDFReader.numPages).fill('');
        renderCurrentPage();
      } catch (err) {
        showToast('Erro ao carregar PDF: ' + err.message, 'error');
      }
    } else {
      paginateAndRender(true);
    }

    renderTocDrawer();
    renderBookmarksList();
  }

  // --- Paginação e Renderização ---
  function paginateAndRender(isInitialLoad = false) {
    if (!state.currentBook) return;

    let percentage = 0;
    if (!isInitialLoad && state.pages && state.pages.length > 0) {
       percentage = state.currentPage / state.pages.length;
    }

    let textToPaginate = '';
    let contentType = state.currentBook.contentType || 'text';
    if (state.currentBook.chapters && state.currentBook.chapters.length > 0) {
      const chapter = state.currentBook.chapters[state.currentChapter] || state.currentBook.chapters[0];
      textToPaginate = chapter.content;
      if (chapter.contentType) contentType = chapter.contentType;
    } else {
      textToPaginate = state.currentBook.content || '';
    }

    // Contagem de palavras do capítulo atual para a estimativa de tempo restante
    state.chapterWordCount = (textToPaginate.replace(/<[^>]*>/g, ' ').match(/[\wÀ-ÿ'-]+/g) || []).length;

    const paginateOptions = {
      fontFamily: state.fontFamily,
      fontSize: state.fontSize,
      maxWidthClass: state.maxWidthClass,
      lineHeight: state.lineHeight,
      paragraphSpacing: state.paragraphSpacing,
      textAlign: state.textAlign
    };

    state.pages = [];
    if (state.readingMode === 'scroll') {
      if (state.isPdfMode) {
        state.pages = new Array(window.serenePDFReader.numPages).fill('');
      } else {
        // No modo scroll contínuo, a "página" é o texto/capítulo inteiro
        state.pages = [textToPaginate];
      }
    } else {
      if (state.isPdfMode) {
        state.pages = new Array(window.serenePDFReader.numPages).fill('');
      } else if (contentType === 'html') {
        state.pages = window.serenePaginator.paginateHtml(textToPaginate, readingContainerEl, paginateOptions);
      } else {
        state.pages = window.serenePaginator.paginate(textToPaginate, readingContainerEl, paginateOptions);
      }
    }

    if (state.pages.length > 0 && state.readingMode !== 'scroll') {
       if (!isInitialLoad && percentage > 0) {
         state.currentPage = Math.floor(percentage * state.pages.length);
       } else if (isInitialLoad && state.currentBook && state.currentBook.pagePercentage !== undefined) {
         // Preservar 100% o texto exato da página baseado na porcentagem (previne bugs ao alterar tamanho de tela)
         state.currentPage = Math.floor(state.currentBook.pagePercentage * state.pages.length);
       }
    }

    if (state.currentPage >= state.pages.length) {
      state.currentPage = Math.max(0, state.pages.length - 1);
    }

    renderCurrentPage();
  }

  async function renderCurrentPage() {
    pageContentEl.classList.remove('opacity-100');
    pageContentEl.classList.add('opacity-0');

    setTimeout(async () => {
      if (state.isPdfMode) {
        const pageNum = state.currentPage + 1;
        if (state.readingMode === 'scroll') {
          // Renderiza PDF no modo Scroll
          await window.serenePDFReader.renderScrollMode(pageContentEl, state.pdfZoom);
          
          // No modo scroll de PDF, o texto para TTS pegamos apenas da página atual (1) temporariamente,
          // ou podemos pegar conforme rola (fica para melhoria futura).
          state.pdfText = await window.serenePDFReader.getPageText(1);
          
          // Restaurar scroll salvo
          setTimeout(() => {
            if (state.currentBook && state.currentBook.scrollPosition !== undefined) {
               pageContentEl.scrollTop = state.currentBook.scrollPosition;
            }
          }, 100);
        } else {
          // Limpar qualquer observer anterior do modo scroll
          if (window.serenePDFReader.cleanup) window.serenePDFReader.cleanup();
          // Renderiza PDF no modo Paginado normal
          state.pdfText = await window.serenePDFReader.renderPage(pageNum, pageContentEl, state.pdfZoom);
        }
      } else {
        let content = state.pages[state.currentPage] || '<p class="opacity-60 text-center">Fim do conteúdo.</p>';
        if (window.sereneReadingModes && window.sereneReadingModes.bionicEnabled) {
          content = window.sereneReadingModes.applyBionicReading(content);
        }
        
        if (state.readingMode === 'scroll' && state.currentBook && state.currentBook.chapters && state.currentChapter < state.currentBook.chapters.length - 1) {
          content += `<div class="mt-12 mb-8 text-center"><button onclick="window.nextPage()" class="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-sm font-semibold shadow-md transition active:scale-95">Próximo Capítulo ↓</button></div>`;
        }

        pageContentEl.innerHTML = content;
        
        if (window.sereneReadingModes && window.sereneReadingModes.lineFocusEnabled) {
          window.sereneReadingModes.toggleLineFocus(false); // reset
          window.sereneReadingModes.toggleLineFocus(true);
        }

        applySearchHighlight();
      }

      const total = state.pages.length;
      const currentNum = state.currentPage + 1;
      
      // Ajustes visuais para Modo Scroll
      const footerBar = document.querySelector('.bottom-bar');
      if (state.readingMode === 'scroll') {
        pageContentEl.classList.remove('overflow-hidden', 'my-auto');
        pageContentEl.classList.add('overflow-y-auto', 'scroll-mode-active');
        if (footerBar) footerBar.classList.add('hidden');
        
        // Esconder setas laterais
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';

        // Restaurar Scroll Salvo (se houver e não for PDF, pois PDF restaura acima de forma customizada)
        if (!state.isPdfMode) {
          setTimeout(() => {
            if (state.currentBook && state.currentBook.scrollPosition !== undefined) {
               pageContentEl.scrollTop = state.currentBook.scrollPosition;
            } else {
               pageContentEl.scrollTop = 0;
            }
          }, 10);
        }
      } else {
        pageContentEl.classList.add('overflow-hidden');
        if (!state.isPdfMode) pageContentEl.classList.add('my-auto');
        pageContentEl.classList.remove('overflow-y-auto', 'scroll-mode-active');
        if (footerBar) footerBar.classList.remove('hidden');
        prevBtn.style.display = 'flex';
        nextBtn.style.display = 'flex';
      }
      
      pageCounterTextEl.textContent = `Página ${currentNum} de ${total}`;
      
      const progressPercent = total > 1 ? ((currentNum - 1) / (total - 1)) * 100 : 100;
      progressBarFillEl.style.width = `${progressPercent}%`;
      if (progressPercentText) progressPercentText.textContent = `${Math.round(progressPercent)}%`;

      updateReadingEstimate();

      if (state.readingMode !== 'scroll' || state.isPdfMode) {
        prevBtn.style.opacity = state.currentPage === 0 ? "0.3" : "1";
        nextBtn.style.opacity = state.currentPage === total - 1 ? "0.3" : "1";
      }

      pageContentEl.classList.remove('opacity-0');
      pageContentEl.classList.add('opacity-100');

      if (state.currentBook && state.currentBook.id) {
        if (state.readingMode === 'scroll') {
           // Scroll mode: salvamos apenas a posição absoluta, que é disparada pelo evento de scroll
        } else {
           const percent = total > 0 ? state.currentPage / total : 0;
           window.sereneStorage.updateProgress(state.currentBook.id, state.currentPage, state.currentChapter, 0, percent);
        }
      }

      recordPageProgress();
    }, 50);
  }

  // --- Navegação entre Páginas ---
  function nextPage() {
    if (state.currentPage < state.pages.length - 1) {
      state.currentPage++;
      renderCurrentPage();
    } else if (state.currentBook && state.currentBook.chapters && state.currentChapter < state.currentBook.chapters.length - 1) {
      state.currentChapter++;
      state.currentPage = 0;
      paginateAndRender();
    }
  }

  function prevPage() {
    if (state.currentPage > 0) {
      state.currentPage--;
      renderCurrentPage();
    } else if (state.currentBook && state.currentBook.chapters && state.currentChapter > 0) {
      state.currentChapter--;
      state.currentPage = 0;
      paginateAndRender();
    }
  }

  // Expor funções de navegação no escopo global (usado por botões inline no HTML)
  window.nextPage = nextPage;
  window.prevPage = prevPage;

  // --- Registro de Progresso nas Estatísticas (páginas e palavras lidas) ---
  let lastRecorded = { chapter: -1, page: -1 };
  function recordPageProgress() {
    if (!state.currentBook || state.isPdfMode) return;
    if (!window.sereneStats) return;
    if (state.currentChapter === lastRecorded.chapter && state.currentPage === lastRecorded.page) return;
    lastRecorded = { chapter: state.currentChapter, page: state.currentPage };
    const html = state.pages[state.currentPage] || '';
    const words = (html.replace(/<[^>]*>/g, ' ').match(/[\wÀ-ÿ'-]+/g) || []).length;
    window.sereneStats.recordPageTurn();
    window.sereneStats.recordWords(words);
  }

  // --- Estimativa de Tempo Restante no Capítulo ---
  function updateReadingEstimate() {
    if (!readingEstimateText) return;
    if (state.isPdfMode || state.pages.length <= 1) {
      readingEstimateText.textContent = '';
      return;
    }
    const remainingPages = state.pages.length - (state.currentPage + 1);
    if (remainingPages <= 0) {
      readingEstimateText.textContent = 'Fim do capítulo';
      return;
    }
    const wordsPerPage = state.chapterWordCount > 0 ? state.chapterWordCount / state.pages.length : 200;
    const remainingWords = Math.round(remainingPages * wordsPerPage);
    const wpm = (window.sereneStats && window.sereneStats.getWpm()) || 220;
    const minutes = Math.max(1, Math.round(remainingWords / wpm));
    readingEstimateText.textContent = `≈ ${minutes} min restantes`;
  }

  // --- Eventos de Toque e Teclado ---
  tapNextZone.addEventListener('click', (e) => {
    e.stopPropagation();
    nextPage();
    dismissTouchHint();
  });

  tapPrevZone.addEventListener('click', (e) => {
    e.stopPropagation();
    prevPage();
    dismissTouchHint();
  });

  prevBtn.addEventListener('click', prevPage);
  nextBtn.addEventListener('click', nextPage);

  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    if (Math.abs(deltaX) > 60 && Math.abs(deltaY) < 50) {
      if (deltaX < 0) nextPage();
      else prevPage();
      dismissTouchHint();
    }
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) ? e.target.tagName : '';
    const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    // Escape fecha qualquer gaveta/overlay aberto
    if (e.key === 'Escape') {
      if (settingsDrawer.classList.contains('translate-x-0')) closeDrawer(settingsDrawer, settingsBackdrop);
      if (libraryDrawer.classList.contains('translate-x-0')) closeDrawer(libraryDrawer, libraryBackdrop, true);
      if (tocDrawer && tocDrawer.classList.contains('translate-x-0')) closeDrawer(tocDrawer, tocBackdrop, true);
      if (window.sereneRSVP && document.getElementById('rsvp-modal') && !document.getElementById('rsvp-modal').classList.contains('hidden')) {
        window.sereneRSVP.close();
      }
      return;
    }

    if (settingsDrawer.classList.contains('translate-x-0') || libraryDrawer.classList.contains('translate-x-0')) return;
    if (isTyping) return;

    if (e.key === 'f') { toggleFullscreen(); return; }
    if (e.key === '+' || e.key === '=') { if (zoomInBtn) zoomInBtn.click(); return; }
    if (e.key === '-') { if (zoomOutBtn) zoomOutBtn.click(); return; }
    if (e.key === 't') { if (ttsPlayBtn) ttsPlayBtn.click(); return; }
    if (e.key === 'b') {
      if (bionicToggle) { bionicToggle.checked = !bionicToggle.checked; bionicToggle.dispatchEvent(new Event('change')); }
      return;
    }
    if (e.key === 'i') { toggleImmersive(); return; }

    if (state.readingMode === 'scroll') return;

    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); nextPage(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prevPage(); }
  });

  function dismissTouchHint() {
    if (touchHintEl) {
      touchHintEl.classList.add('opacity-0');
      setTimeout(() => touchHintEl.remove(), 600);
    }
  }

  // --- Aplicação Dinâmica de Temas e Tipografia (Sincronizada nas Gavetas) ---
  function applyTheme(themeKey) {
    const theme = THEMES[themeKey] || THEMES.paper;
    state.theme = themeKey;

    root.style.backgroundColor = theme.bg;
    root.style.color = theme.text;

    [settingsDrawer, libraryDrawer, tocDrawer].forEach(drawer => {
      if (drawer) {
        drawer.style.backgroundColor = theme.drawerBg;
        drawer.style.color = theme.drawerText;
        drawer.style.borderColor = theme.drawerBorder;
      }
    });

    document.querySelectorAll('.drawer-header').forEach(header => {
      header.style.borderColor = theme.drawerBorder;
    });

    updateActiveButtonStates();
    savePreferences();
  }

  async function applyTypography() {
    const fontFamilyStr = state.fontFamily === 'OpenDyslexic' 
      ? `'Open Dyslexic', 'Comic Sans MS', sans-serif`
      : `"${state.fontFamily}", Georgia, serif`;
    
    // Aplica a fonte globalmente para que os menus também fiquem agradáveis
    root.style.fontFamily = fontFamilyStr;

    if (state.fontFamily === 'OpenDyslexic') {
      pageContentEl.className = `page-fade opacity-100 my-auto font-opendyslexic`;
    } else {
      pageContentEl.className = `page-fade opacity-100 my-auto`;
    }
    
    // Reaplica classes essenciais de modo de leitura para evitar flickering no F5
    if (state.readingMode === 'scroll' && !state.isPdfMode) {
      pageContentEl.classList.remove('my-auto');
      pageContentEl.classList.add('overflow-y-auto', 'scroll-mode-active');
    } else {
      pageContentEl.classList.add('overflow-hidden');
    }
    
    pageContentEl.style.fontFamily = fontFamilyStr;
    pageContentEl.style.fontSize = `${state.fontSize}px`;
    pageContentEl.style.lineHeight = String(state.lineHeight);
    pageContentEl.style.textAlign = state.textAlign;
    readingContainerEl.className = `w-full h-full flex flex-col justify-between px-6 sm:px-12 py-4 mx-auto overflow-hidden ${state.maxWidthClass}`;

    // Forçar o navegador a baixar e renderizar a fonte específica antes de continuarmos
    if (document.fonts) {
      try {
        if (state.fontFamily !== 'OpenDyslexic') {
          await document.fonts.load(`${state.fontSize}px "${state.fontFamily}"`);
        }
        await document.fonts.ready;
      } catch (e) {
        console.warn('Erro ao carregar fonte:', e);
      }
    }

    updateActiveButtonStates();
    savePreferences();
  }

  function updateActiveButtonStates() {
    const theme = THEMES[state.theme] || THEMES.paper;

    // Destacar botão do tema selecionado
    document.querySelectorAll('.theme-select-btn').forEach(btn => {
      if (btn.dataset.theme === state.theme) {
        btn.style.outline = `3px solid ${theme.text}`;
        btn.style.outlineOffset = '2px';
      } else {
        btn.style.outline = 'none';
      }
    });

    // Destacar botão da família de fonte selecionada
    document.querySelectorAll('.font-family-btn').forEach(btn => {
      if (btn.dataset.font === state.fontFamily) {
        btn.style.borderColor = theme.text;
        btn.style.fontWeight = 'bold';
        btn.style.opacity = '1.0';
        btn.style.backgroundColor = 'rgba(245, 158, 11, 0.25)';
      } else {
        btn.style.borderColor = 'rgba(0,0,0,0.15)';
        btn.style.fontWeight = 'normal';
        btn.style.opacity = '0.7';
        btn.style.backgroundColor = 'transparent';
      }
    });

    // Destacar botão da largura de margem selecionada
    document.querySelectorAll('.width-btn').forEach(btn => {
      if (btn.dataset.width === state.maxWidthClass) {
        btn.style.borderColor = theme.text;
        btn.style.fontWeight = 'bold';
        btn.style.opacity = '1.0';
        btn.style.backgroundColor = 'rgba(245, 158, 11, 0.25)';
      } else {
        btn.style.borderColor = 'rgba(0,0,0,0.15)';
        btn.style.fontWeight = 'normal';
        btn.style.opacity = '0.7';
        btn.style.backgroundColor = 'transparent';
      }
    });

    // Destacar botão de modo de leitura
    document.querySelectorAll('.reading-mode-btn').forEach(btn => {
      if (btn.dataset.mode === state.readingMode) {
        btn.classList.add('font-bold', 'bg-amber-500/20', 'text-amber-700', 'dark:text-amber-400', 'border-amber-600');
        btn.classList.remove('opacity-70', 'border-current/20');
      } else {
        btn.classList.remove('font-bold', 'bg-amber-500/20', 'text-amber-700', 'dark:text-amber-400', 'border-amber-600');
        btn.classList.add('opacity-70', 'border-current/20');
      }
    });

    // Destacar botão de alinhamento de texto
    document.querySelectorAll('.text-align-btn').forEach(btn => {
      if (btn.dataset.align === state.textAlign) {
        btn.classList.add('font-bold', 'bg-amber-500/20', 'text-amber-700', 'dark:text-amber-400', 'border-amber-600');
        btn.classList.remove('opacity-70', 'border-current/20');
      } else {
        btn.classList.remove('font-bold', 'bg-amber-500/20', 'text-amber-700', 'dark:text-amber-400', 'border-amber-600');
        btn.classList.add('opacity-70', 'border-current/20');
      }
    });
  }

  // --- Gavetas (Drawer) UI ---
  function openDrawer(drawer, backdrop) {
    backdrop.classList.remove('hidden');
    setTimeout(() => {
      backdrop.classList.remove('opacity-0');
      drawer.classList.remove('translate-x-full', '-translate-x-full');
      drawer.classList.add('translate-x-0');
    }, 10);
  }

  function closeDrawer(drawer, backdrop, isLeft = false) {
    backdrop.classList.add('opacity-0');
    drawer.classList.remove('translate-x-0');
    drawer.classList.add(isLeft ? '-translate-x-full' : 'translate-x-full');
    setTimeout(() => backdrop.classList.add('hidden'), 200);
  }

  openSettingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openDrawer(settingsDrawer, settingsBackdrop);
  });
  closeSettingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeDrawer(settingsDrawer, settingsBackdrop);
  });
  settingsBackdrop.addEventListener('click', () => closeDrawer(settingsDrawer, settingsBackdrop));

  openLibraryBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await renderLibrary();
    openDrawer(libraryDrawer, libraryBackdrop);
  });
  closeLibraryBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeDrawer(libraryDrawer, libraryBackdrop, true);
  });
  libraryBackdrop.addEventListener('click', () => closeDrawer(libraryDrawer, libraryBackdrop, true));

  if (openTocBtn) openTocBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openDrawer(tocDrawer, tocBackdrop);
  });
  if (closeTocBtn) closeTocBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeDrawer(tocDrawer, tocBackdrop, true);
  });
  if (tocBackdrop) tocBackdrop.addEventListener('click', () => closeDrawer(tocDrawer, tocBackdrop, true));

  // Sliders de Iluminação e Fonte
  if (subDimmerSlider) {
    subDimmerSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      state.subDimmerOpacity = val / 100;
      dimmerOverlay.style.opacity = state.subDimmerOpacity;
      if (subDimmerVal) subDimmerVal.textContent = `${val}%`;
      savePreferences();
    });
  }

  if (amberSlider) {
    amberSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      state.amberOpacity = val / 100;
      amberOverlay.style.opacity = state.amberOpacity;
      if (amberVal) amberVal.textContent = `${val}%`;
      savePreferences();
    });
  }

  // --- Zoom Dinâmico e Barra Flutuante ---
  function setFontSize(newSize) {
    state.fontSize = newSize;
    if (fontSizeSlider) fontSizeSlider.value = state.fontSize;
    if (fontSizeVal) fontSizeVal.textContent = `${state.fontSize}px`;
    updateZoomLabel();
    applyTypography();
    if (!state.isPdfMode) paginateAndRender();
  }

  function updateZoomLabel() {
    const label = document.getElementById('zoom-level-label');
    if (!label) return;
    if (state.isPdfMode) {
      label.textContent = `${Math.round(state.pdfZoom * 100)}%`;
    } else {
      label.textContent = `${state.fontSize}px`;
    }
  }

  const zoomInBtn = document.getElementById('zoom-in-btn');
  const zoomOutBtn = document.getElementById('zoom-out-btn');
  const quickZoomBar = document.getElementById('quick-zoom-bar');

  if (zoomInBtn && zoomOutBtn) {
    let hideZoomTimeout;
    const showZoomBar = () => {
      if (quickZoomBar) {
        quickZoomBar.classList.add('zoom-active');
        clearTimeout(hideZoomTimeout);
        hideZoomTimeout = setTimeout(() => {
          quickZoomBar.classList.remove('zoom-active');
        }, 3000);
      }
    };

    // Mostrar ao interagir com a tela
    document.addEventListener('touchstart', showZoomBar, {passive: true});
    document.addEventListener('mousemove', showZoomBar, {passive: true});

    zoomInBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showZoomBar();
      if (state.isPdfMode) {
        state.pdfZoom = Math.min(state.pdfZoom + 0.1, 3.0);
        updateZoomLabel();
        savePreferences();
        if (state.readingMode === 'scroll') {
          window.serenePDFReader.reRenderVisiblePages(pageContentEl, state.pdfZoom);
        } else {
          renderCurrentPage();
        }
      } else {
        const newSize = Math.min(state.fontSize + 2, 40);
        setFontSize(newSize);
        savePreferences();
      }
    });

    zoomOutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showZoomBar();
      if (state.isPdfMode) {
        state.pdfZoom = Math.max(state.pdfZoom - 0.1, 0.5);
        updateZoomLabel();
        savePreferences();
        if (state.readingMode === 'scroll') {
          window.serenePDFReader.reRenderVisiblePages(pageContentEl, state.pdfZoom);
        } else {
          renderCurrentPage();
        }
      } else {
        const newSize = Math.max(state.fontSize - 2, 12);
        setFontSize(newSize);
        savePreferences();
      }
    });

    // Pinch-to-zoom support for mobile
    let initialPinchDistance = null;
    const readingContainer = document.getElementById('reading-container');
    
    if (readingContainer) {
      readingContainer.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
          initialPinchDistance = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
          );
        }
      }, { passive: true });

      readingContainer.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && initialPinchDistance !== null) {
          const currentDistance = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
          );
          
          const diff = currentDistance - initialPinchDistance;
          if (Math.abs(diff) > 40) { // Limiar de sensibilidade
            if (diff > 0) {
               zoomInBtn.click();
            } else {
               zoomOutBtn.click();
            }
            initialPinchDistance = currentDistance; // resetar
          }
        }
      }, { passive: true });
      
      readingContainer.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) initialPinchDistance = null;
      }, { passive: true });
    }
  }

  if (fontSizeSlider) {
    fontSizeSlider.addEventListener('input', (e) => {
      state.fontSize = parseInt(e.target.value);
      if (fontSizeVal) fontSizeVal.textContent = `${state.fontSize}px`;
      updateZoomLabel();
      applyTypography();
    });
    fontSizeSlider.addEventListener('change', () => {
      if (!state.isPdfMode) paginateAndRender();
      savePreferences();
    });
  }

  if (lineHeightSlider) {
    lineHeightSlider.addEventListener('input', (e) => {
      state.lineHeight = parseFloat(e.target.value);
      if (lineHeightVal) lineHeightVal.textContent = `${state.lineHeight.toFixed(1)}x`;
      applyTypography();
    });
    lineHeightSlider.addEventListener('change', () => {
      if (!state.isPdfMode) paginateAndRender();
      savePreferences();
    });
  }

  if (paragraphSpacingSlider) {
    paragraphSpacingSlider.addEventListener('input', (e) => {
      state.paragraphSpacing = parseInt(e.target.value);
      if (paragraphSpacingVal) paragraphSpacingVal.textContent = `${state.paragraphSpacing}px`;
      applyTypography();
    });
    paragraphSpacingSlider.addEventListener('change', () => {
      if (!state.isPdfMode) paginateAndRender();
      savePreferences();
    });
  }

  document.querySelectorAll('.text-align-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      state.textAlign = btn.dataset.align;
      updateActiveButtonStates();
      await applyTypography();
      if (!state.isPdfMode) paginateAndRender();
    });
  });

  document.querySelectorAll('.theme-select-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      applyTheme(btn.dataset.theme);
    });
  });

  document.querySelectorAll('.font-family-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      state.fontFamily = btn.dataset.font;
      await applyTypography();
      if (!state.isPdfMode) paginateAndRender();
    });
  });

  document.querySelectorAll('.width-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      state.maxWidthClass = btn.dataset.width;
      await applyTypography();
      if (!state.isPdfMode) paginateAndRender();
    });
  });

  document.querySelectorAll('.reading-mode-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      state.readingMode = btn.dataset.mode;
      updateActiveButtonStates();
      savePreferences();
      
      // Se for PDF e mudou de modo, precisamos disparar paginateAndRender
      // porque o PDF scroll usa paginateAndRender para setar state.pages corretamente
      paginateAndRender();
    });
  });

  // --- Importação de Ficheiros (EPUB, PDF, TXT, MD, DOCX, CBZ, FB2) ---
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const ext = file.name.split('.').pop().toLowerCase();
      const title = file.name.replace(/\.[^/.]+$/, "");

      try {
        let newBookData = null;
        
        if (ext === 'epub') {
          const buffer = await file.arrayBuffer();
          const parsedEPUB = await window.sereneEPUBParser.parse(buffer);
          newBookData = {
            title: parsedEPUB.title || title,
            author: parsedEPUB.author || 'Desconhecido',
            format: 'epub',
            content: parsedEPUB.rawText,
            cover: parsedEPUB.cover,
            contentType: parsedEPUB.contentType || 'html',
            toc: parsedEPUB.toc,
            chapters: parsedEPUB.chapters
          };
        } else if (ext === 'pdf') {
          const buffer = await file.arrayBuffer();
          newBookData = {
            title: title,
            author: 'PDF Local',
            format: 'pdf',
            content: buffer
          };
        } else if (ext === 'cbz' || ext === 'docx') {
          const buffer = await file.arrayBuffer();
          if (ext === 'cbz') newBookData = await window.sereneFormatParsers.parseCBZ(buffer);
          if (ext === 'docx') newBookData = await window.sereneFormatParsers.parseDOCX(buffer);
          if (newBookData && !newBookData.title.includes('FB2')) newBookData.title = title; // Ajusta título caso o parser retorne nome genérico
        } else {
          // Arquivos baseados em texto (txt, md, fb2)
          const text = await file.text();
          if (ext === 'md') {
            newBookData = await window.sereneFormatParsers.parseMarkdown(text);
            newBookData.title = title;
          } else if (ext === 'fb2') {
            newBookData = await window.sereneFormatParsers.parseFB2(text);
          } else {
            newBookData = {
              title: title,
              author: 'Ficheiro Local',
              format: 'txt',
              content: text
            };
          }
        }

        if (newBookData) {
          // Evitar duplicação: se já existe um livro com o mesmo título, atualiza o existente
          const allBooks = await window.sereneStorage.getAllBooks();
          const existing = allBooks.find(b => b.title === newBookData.title);
          if (existing) newBookData.id = existing.id;

          const savedBook = await window.sereneStorage.saveBook(newBookData);
          await openBook(savedBook);
          renderLibrary();
          closeDrawer(libraryDrawer, libraryBackdrop);
        }
      } catch (err) {
        showToast('Erro ao carregar livro: ' + err.message, 'error');
      }
      
      e.target.value = ''; // Limpar input
    });
  }

  // --- Importação de URL (Artigos da Web) ---
  const urlInput = document.getElementById('url-input');
  const urlImportBtn = document.getElementById('url-import-btn');
  if (urlImportBtn && urlInput) {
    urlImportBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const url = urlInput.value.trim();
      if (!url) return;
      
      urlImportBtn.textContent = 'Aguarde...';
      urlImportBtn.disabled = true;
      urlImportBtn.classList.add('opacity-50', 'cursor-not-allowed');
      
      try {
        const articleData = await window.sereneURLReader.importFromURL(url);
        
        // Evitar duplicação: verifica por URL ou título exato
        const allBooks = await window.sereneStorage.getAllBooks();
        const existing = allBooks.find(b => b.sourceUrl === url || b.title === articleData.title);
        if (existing) articleData.id = existing.id;

        const savedBook = await window.sereneStorage.saveBook(articleData);
        await openBook(savedBook);
        renderLibrary();
        closeDrawer(libraryDrawer, libraryBackdrop);
        urlInput.value = '';
      } catch (err) {
        showToast('Erro ao importar artigo: ' + err.message, 'error');
      } finally {
        urlImportBtn.textContent = 'Ler Web';
        urlImportBtn.disabled = false;
        urlImportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    });
  }

  // --- Sintetizador de Voz (TTS) ---
  if (ttsPlayBtn) {
    ttsPlayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      let textToRead = '';
      if (state.isPdfMode) {
        textToRead = state.pdfText || 'Página do PDF em exibição.';
      } else {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = state.pages[state.currentPage] || '';
        textToRead = tempDiv.textContent || '';
      }

      window.sereneTTS.toggle(textToRead);
    });

    window.sereneTTS.onStateChange = ({ isPlaying, isPaused }) => {
      if (isPlaying && !isPaused) {
        ttsPlayBtn.innerHTML = `<svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg><span>Pausar Áudio</span>`;
      } else {
        ttsPlayBtn.innerHTML = `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg><span>Ouvir Página (TTS)</span>`;
      }
    };
  }

  if (ttsRateSlider) {
    ttsRateSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      window.sereneTTS.setRate(val);
      if (ttsRateVal) ttsRateVal.textContent = `${val}x`;
    });
  }

  if (ttsPitchSlider) {
    ttsPitchSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      window.sereneTTS.setPitch(val);
      if (ttsPitchVal) ttsPitchVal.textContent = `${val}x`;
    });
  }

  if (ttsVoiceSelect) {
    const populateVoices = () => {
      ttsVoiceSelect.innerHTML = '';
      const voices = window.sereneTTS.getPortugueseVoices();
      if (voices.length === 0) {
        ttsVoiceSelect.innerHTML = '<option value="">Vozes padrão do sistema...</option>';
        return;
      }
      voices.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.name;
        opt.textContent = `${v.name} (${v.lang})`;
        ttsVoiceSelect.appendChild(opt);
      });
      if (window.sereneTTS.voice) ttsVoiceSelect.value = window.sereneTTS.voice.name;
    };
    setTimeout(populateVoices, 500); // Aguardar API TTS instanciar as vozes
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = populateVoices;

    if (ttsVoiceApplyBtn) {
      ttsVoiceApplyBtn.addEventListener('click', () => {
        window.sereneTTS.setVoice(ttsVoiceSelect.value);
      });
    }
  }

  ttsTimerBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      ttsTimerBtns.forEach(b => {
        b.classList.remove('bg-amber-600', 'text-white', 'border-amber-600');
        b.classList.add('hover:bg-black/5');
      });
      const min = parseInt(btn.dataset.minutes);
      window.sereneTTS.setSleepTimer(min);
      if (min > 0) {
        btn.classList.add('bg-amber-600', 'text-white', 'border-amber-600');
        btn.classList.remove('hover:bg-black/5');
      }
    });
  });

  // --- Modos de Leitura ---
  if (bionicToggle) {
    bionicToggle.addEventListener('change', (e) => {
      if (window.sereneReadingModes) {
        window.sereneReadingModes.bionicEnabled = e.target.checked;
        savePreferences();
        if (!state.isPdfMode) renderCurrentPage();
      }
    });
  }

  if (linefocusToggle) {
    linefocusToggle.addEventListener('change', (e) => {
      if (window.sereneReadingModes) {
        window.sereneReadingModes.toggleLineFocus(e.target.checked);
        savePreferences();
      }
    });
  }

  if (rulerToggle) {
    rulerToggle.addEventListener('change', (e) => {
      if (window.sereneReadingModes) {
        window.sereneReadingModes.toggleRuler(e.target.checked);
        savePreferences();
      }
    });
  }

  if (openRsvpBtn) {
    openRsvpBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeDrawer(settingsDrawer, settingsBackdrop);
      let textToRead = '';
      if (state.isPdfMode) {
        textToRead = state.pdfText || 'Sem texto.';
      } else {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = state.pages[state.currentPage] || '';
        textToRead = tempDiv.textContent || '';
      }
      if (window.sereneRSVP) window.sereneRSVP.start(textToRead);
    });
  }

  // --- Marcadores & Biblioteca ---
  if (addBookmarkBtn) {
    addBookmarkBtn.addEventListener('click', async () => {
      if (!state.currentBook) return;
      const snippet = state.isPdfMode ? `Página ${state.currentPage + 1}` : (state.pages[state.currentPage] || '').replace(/<[^>]*>/g, '').substring(0, 80) + '...';
      
      await window.sereneStorage.addBookmark({
        bookId: state.currentBook.id,
        pageIndex: state.currentPage,
        chapterIndex: state.currentChapter,
        snippet: snippet
      });

      showToast('Marcador guardado com sucesso!', 'success');
      renderBookmarksList();
    });
  }

  async function renderBookmarksList() {
    if (!bookmarksListEl || !state.currentBook) return;
    const bookmarks = await window.sereneStorage.getBookmarks(state.currentBook.id);
    
    if (bookmarks.length === 0) {
      bookmarksListEl.innerHTML = '<p class="text-xs opacity-50 italic">Sem marcadores salvos neste livro.</p>';
      return;
    }

    bookmarksListEl.innerHTML = bookmarks.map(bm => `
      <div class="p-2 border border-current/20 rounded-lg flex items-center justify-between text-xs">
        <div class="cursor-pointer truncate max-w-[200px]" onclick="window.jumpToBookmark(${bm.pageIndex}, ${bm.chapterIndex || 0})">
          <span class="font-bold">Pág. ${bm.pageIndex + 1}:</span> ${bm.snippet}
        </div>
        <button onclick="window.removeBookmark(${bm.id})" class="text-red-500 hover:text-red-700 p-1 font-bold">×</button>
      </div>
    `).join('');
  }

  window.jumpToBookmark = (pageIndex, chapterIndex) => {
    state.currentChapter = chapterIndex;
    state.currentPage = pageIndex;
    if (state.isPdfMode) {
      renderCurrentPage();
    } else {
      paginateAndRender();
    }
  };

  window.removeBookmark = async (id) => {
    await window.sereneStorage.removeBookmark(id);
    renderBookmarksList();
  };

  async function renderLibrary() {
    const libraryContainer = document.getElementById('library-books-grid');
    if (!libraryContainer) return;

    // Renderizar painel de estatísticas de leitura
    const statsPanel = document.getElementById('library-stats');
    if (statsPanel && window.sereneStats) {
      await window.sereneStats.init();
      const s = window.sereneStats.getSummary();
      statsPanel.innerHTML = `
        <div class="grid grid-cols-4 gap-2 text-center">
          <div class="p-2 rounded-lg bg-black/5 dark:bg-white/5">
            <div class="text-sm font-bold">${window.sereneStats.formatDuration(s.minutes)}</div>
            <div class="text-[9px] opacity-60 uppercase tracking-wide">Tempo</div>
          </div>
          <div class="p-2 rounded-lg bg-black/5 dark:bg-white/5">
            <div class="text-sm font-bold">${s.pagesRead}</div>
            <div class="text-[9px] opacity-60 uppercase tracking-wide">Páginas</div>
          </div>
          <div class="p-2 rounded-lg bg-black/5 dark:bg-white/5">
            <div class="text-sm font-bold">${s.streakDays}</div>
            <div class="text-[9px] opacity-60 uppercase tracking-wide">Dias seguidos</div>
          </div>
          <div class="p-2 rounded-lg bg-black/5 dark:bg-white/5">
            <div class="text-sm font-bold">${s.wpm || '—'}</div>
            <div class="text-[9px] opacity-60 uppercase tracking-wide">Palavras/min</div>
          </div>
        </div>
      `;
    }

    const books = await window.sereneStorage.getAllBooks();
    libraryContainer.innerHTML = books.map(b => `
      <div class="book-card p-3 border border-current/20 rounded-xl flex flex-col justify-between cursor-pointer bg-black/5 dark:bg-white/5" onclick="window.selectBookFromLibrary('${b.id}')">
        <div class="flex items-start gap-3">
          ${b.cover ? `<img src="${b.cover}" class="w-12 h-16 object-cover rounded shadow-sm shrink-0">` : `<div class="w-12 h-16 bg-amber-700/20 text-amber-700 font-bold text-xs flex items-center justify-center rounded uppercase shrink-0">${b.format}</div>`}
          <div class="overflow-hidden">
            <h3 class="font-bold text-xs truncate">${b.title}</h3>
            <p class="text-[11px] opacity-70 truncate">${b.author}</p>
            <span class="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 uppercase font-mono">${b.format}</span>
          </div>
        </div>
        <div class="mt-3 flex items-center justify-between text-[11px] opacity-60">
          <span>Pág. ${(b.currentPage || 0) + 1}</span>
          <button onclick="event.stopPropagation(); window.deleteBookFromLibrary('${b.id}')" class="text-red-500 hover:underline">Excluir</button>
        </div>
      </div>
    `).join('');
  }

  window.selectBookFromLibrary = async (id) => {
    const book = await window.sereneStorage.getBook(id);
    if (book) {
      await openBook(book);
      closeDrawer(libraryDrawer, libraryBackdrop, true);
    }
  };

  window.deleteBookFromLibrary = async (id) => {
    if (confirm('Tem certeza que deseja remover este livro da sua biblioteca local?')) {
      await window.sereneStorage.deleteBook(id);
      renderLibrary();
    }
  };

  function renderTocDrawer() {
    const tocListEl = document.getElementById('toc-list');
    if (!tocListEl) return;

    if (state.currentBook && state.currentBook.chapters && state.currentBook.chapters.length > 0) {
      tocListEl.innerHTML = state.currentBook.chapters.map((ch, idx) => `
        <button class="w-full text-left p-2.5 rounded-lg border border-current/10 hover:bg-amber-500/10 text-xs font-medium truncate ${idx === state.currentChapter ? 'bg-amber-500/20 font-bold' : ''}" onclick="window.selectChapter(${idx})">
          ${ch.title || `Capítulo ${idx + 1}`}
        </button>
      `).join('');
    } else {
      tocListEl.innerHTML = '<p class="text-xs opacity-50 italic">Este livro não possui divisões de capítulos separadas.</p>';
    }
  }

  window.selectChapter = (idx) => {
    state.currentChapter = idx;
    state.currentPage = 0;
    paginateAndRender();
    if (tocDrawer && tocBackdrop) closeDrawer(tocDrawer, tocBackdrop, true);
  };

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);

  window.addEventListener('resize', () => {
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(() => {
      if (!state.isPdfMode) paginateAndRender();
    }, 150);
  });

  // --- Notas do Livro ---
  if (bookNotesInput) {
    let notesTimeout = null;
    bookNotesInput.addEventListener('input', (e) => {
      if (!state.currentBook) return;
      if (notesTimeout) clearTimeout(notesTimeout);
      notesTimeout = setTimeout(async () => {
        state.currentBook.notes = e.target.value;
        await window.sereneStorage.saveBook(state.currentBook);
      }, 1000);
    });
  }

  // --- Busca (com navegação próxima/anterior e destaque de ocorrências) ---
  const searchState = { term: '', results: [], index: -1 };

  const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const doSearch = (forward = true) => {
    if (!state.currentBook) return;
    const term = searchInput.value.trim().toLowerCase();
    if (!term) {
      clearSearch();
      return;
    }
    if (state.isPdfMode) {
      showToast('Busca não suportada no modo PDF.', 'warning');
      return;
    }

    // Reconstruir índice de resultados se o termo mudou
    if (term !== searchState.term) {
      searchState.term = term;
      searchState.results = [];
      searchState.index = -1;
      for (let i = 0; i < state.pages.length; i++) {
        const div = document.createElement('div');
        div.innerHTML = state.pages[i];
        if (div.textContent.toLowerCase().includes(term)) {
          searchState.results.push(i);
        }
      }
    }

    if (searchState.results.length === 0) {
      if (searchCount) searchCount.textContent = '0/0';
      showToast('Termo não encontrado no livro.', 'warning');
      return;
    }

    if (forward) {
      searchState.index = (searchState.index + 1) % searchState.results.length;
    } else {
      searchState.index = (searchState.index - 1 + searchState.results.length) % searchState.results.length;
    }

    state.currentPage = searchState.results[searchState.index];
    if (searchCount) searchCount.textContent = `${searchState.index + 1}/${searchState.results.length}`;
    window.sereneStorage.updateProgress(state.currentBook.id, state.currentPage, state.currentChapter);
    renderCurrentPage();
    if (window.innerWidth < 640 && searchContainer) {
      searchContainer.classList.add('hidden');
    }
  };

  function clearSearch() {
    searchState.term = '';
    searchState.results = [];
    searchState.index = -1;
    if (searchCount) searchCount.textContent = '';
  }

  function applySearchHighlight() {
    if (!searchState.term) return;
    const walker = document.createTreeWalker(pageContentEl, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentNode && n.parentNode.tagName === 'MARK') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    const regex = new RegExp(`(${escapeRegExp(searchState.term)})`, 'gi');
    textNodes.forEach(node => {
      const text = node.nodeValue;
      regex.lastIndex = 0;
      if (!regex.test(text)) { regex.lastIndex = 0; return; }
      regex.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let lastIndex = 0;
      let m;
      while ((m = regex.exec(text)) !== null) {
        if (m.index > lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex, m.index)));
        const mark = document.createElement('mark');
        mark.className = 'search-highlight';
        mark.textContent = m[0];
        frag.appendChild(mark);
        lastIndex = m.index + m[0].length;
        if (m.index === regex.lastIndex) regex.lastIndex++;
      }
      if (lastIndex < text.length) frag.appendChild(document.createTextNode(text.slice(lastIndex)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doSearch(!e.shiftKey);
      } else if (e.key === 'Escape') {
        clearSearch();
        searchInput.value = '';
      }
    });
    searchInput.addEventListener('input', () => {
      if (searchInput.value.trim() === '') clearSearch();
    });
  }
  if (mobileSearchBtn) {
    mobileSearchBtn.addEventListener('click', () => {
      if (searchContainer) {
        searchContainer.classList.toggle('hidden');
        if (!searchContainer.classList.contains('hidden')) {
          searchInput.focus();
        }
      }
    });
  }

  // --- Sincronização & Backup ---
  if (exportBackupBtn) {
    exportBackupBtn.addEventListener('click', async () => {
      exportBackupBtn.textContent = 'Aguarde...';
      try {
        await window.sereneSyncEngine.exportBackup();
        showToast('Backup exportado com sucesso!', 'success');
      } catch (e) {
        showToast(e.message, 'error');
      } finally {
        exportBackupBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>Exportar`;
      }
    });
  }

  if (importBackupInput) {
    importBackupInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const count = await window.sereneSyncEngine.importBackup(file);
        showToast(`Backup restaurado! ${count} livro(s) recuperados.`, 'success');
        renderLibrary(); // Refresh library
      } catch (err) {
        showToast(err.message, 'error');
      }
      e.target.value = ''; // Reset input
    });
  }

  // --- Restaurar Padrões ---
  const resetSettingsBtn = document.getElementById('reset-settings-btn');
  if (resetSettingsBtn) {
    resetSettingsBtn.addEventListener('click', async () => {
      if (confirm('Deseja restaurar todas as configurações visuais para o padrão? (Isto não apagará seus livros ou marcadores)')) {
        await window.sereneStorage.savePreference('user_settings', {
          theme: 'paper',
          fontFamily: 'Literata',
          fontSize: 18,
          maxWidthClass: 'max-w-xl',
          lineHeight: 1.7,
          paragraphSpacing: 20,
          textAlign: 'justify',
          subDimmerOpacity: 0,
          amberOpacity: 0,
          bionicEnabled: false,
          lineFocusEnabled: false,
          rulerEnabled: false,
          readingMode: 'paged'
        });
        window.location.reload();
      }
    });
  }

  // --- Listener de Rolagem (Scroll Mode) ---
  let scrollTimeout;
  pageContentEl.addEventListener('scroll', () => {
    if (state.readingMode === 'scroll' && state.currentBook) {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        window.sereneStorage.updateProgress(state.currentBook.id, state.currentPage, state.currentChapter, pageContentEl.scrollTop);
      }, 500); // Debounce de 500ms
    }
  });

  // --- Inicialização ---
  await loadPreferences();
  await applyTypography();
  await loadInitialBook();
});
