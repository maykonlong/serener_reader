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
    subDimmerOpacity: 0,
    amberOpacity: 0,
    ttsRate: 1.0,
    isPdfMode: false,
    pdfText: ''
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

  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const tapPrevZone = document.getElementById('tap-prev-zone');
  const tapNextZone = document.getElementById('tap-next-zone');
  const fileInput = document.getElementById('file-input');
  const fullscreenBtn = document.getElementById('fullscreen-btn');

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
    } else {
      applyTheme('paper');
    }
    updateActiveButtonStates();
  }

  async function savePreferences() {
    await window.sereneStorage.savePreference('user_settings', {
      theme: state.theme,
      fontFamily: state.fontFamily,
      fontSize: state.fontSize,
      maxWidthClass: state.maxWidthClass,
      subDimmerOpacity: state.subDimmerOpacity,
      amberOpacity: state.amberOpacity,
      bionicEnabled: window.sereneReadingModes ? window.sereneReadingModes.bionicEnabled : false,
      lineFocusEnabled: window.sereneReadingModes ? window.sereneReadingModes.lineFocusEnabled : false,
      rulerEnabled: window.sereneReadingModes ? window.sereneReadingModes.rulerEnabled : false
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

    if (state.isPdfMode) {
      try {
        await window.serenePDFReader.loadDocument(book.content);
        state.pages = new Array(window.serenePDFReader.numPages).fill('');
        renderCurrentPage();
      } catch (err) {
        alert('Erro ao carregar ficheiro PDF: ' + err.message);
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
    if (state.currentBook.chapters && state.currentBook.chapters.length > 0) {
      const chapter = state.currentBook.chapters[state.currentChapter] || state.currentBook.chapters[0];
      textToPaginate = chapter.content;
    } else {
      textToPaginate = state.currentBook.content || '';
    }

    state.pages = window.serenePaginator.paginate(textToPaginate, readingContainerEl, {
      fontFamily: state.fontFamily,
      fontSize: state.fontSize,
      maxWidthClass: state.maxWidthClass
    });

    if (!isInitialLoad && state.pages.length > 0 && percentage > 0) {
       state.currentPage = Math.floor(percentage * state.pages.length);
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
        state.pdfText = await window.serenePDFReader.renderPage(pageNum, pageContentEl);
      } else {
        let content = state.pages[state.currentPage] || '<p class="opacity-60 text-center">Fim do conteúdo.</p>';
        if (window.sereneReadingModes && window.sereneReadingModes.bionicEnabled) {
          content = window.sereneReadingModes.applyBionicReading(content);
        }
        pageContentEl.innerHTML = content;
        
        // Re-apply line focus to new paragraphs if enabled
        if (window.sereneReadingModes && window.sereneReadingModes.lineFocusEnabled) {
          window.sereneReadingModes.toggleLineFocus(false); // reset
          window.sereneReadingModes.toggleLineFocus(true);
        }
      }

      const total = state.pages.length;
      const currentNum = state.currentPage + 1;
      pageCounterTextEl.textContent = `Página ${currentNum} de ${total}`;
      
      const progressPercent = total > 1 ? ((currentNum - 1) / (total - 1)) * 100 : 100;
      progressBarFillEl.style.width = `${progressPercent}%`;

      prevBtn.style.opacity = state.currentPage === 0 ? "0.3" : "1";
      nextBtn.style.opacity = state.currentPage === total - 1 ? "0.3" : "1";

      pageContentEl.classList.remove('opacity-0');
      pageContentEl.classList.add('opacity-100');

      if (state.currentBook && state.currentBook.id) {
        window.sereneStorage.updateProgress(state.currentBook.id, state.currentPage, state.currentChapter);
      }
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
    if (settingsDrawer.classList.contains('translate-x-0') || libraryDrawer.classList.contains('translate-x-0')) return;
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') nextPage();
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') prevPage();
    else if (e.key === 'f') toggleFullscreen();
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

  function applyTypography() {
    const fontFamilyStr = state.fontFamily === 'OpenDyslexic' 
      ? `'Open Dyslexic', 'Comic Sans MS', sans-serif`
      : `"${state.fontFamily}", Georgia, serif`;
    
    // Aplica a fonte globalmente para que os menus também fiquem agradáveis
    root.style.fontFamily = fontFamilyStr;

    if (state.fontFamily === 'OpenDyslexic') {
      pageContentEl.className = `page-fade leading-relaxed text-justify opacity-100 overflow-hidden my-auto font-opendyslexic`;
    } else {
      pageContentEl.className = `page-fade leading-relaxed text-justify opacity-100 overflow-hidden my-auto`;
    }
    
    pageContentEl.style.fontFamily = fontFamilyStr;
    pageContentEl.style.fontSize = `${state.fontSize}px`;
    readingContainerEl.className = `w-full h-full flex flex-col justify-between px-6 sm:px-12 py-4 mx-auto overflow-hidden ${state.maxWidthClass}`;

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

  if (fontSizeSlider) {
    fontSizeSlider.addEventListener('input', (e) => {
      state.fontSize = parseInt(e.target.value);
      if (fontSizeVal) fontSizeVal.textContent = `${state.fontSize}px`;
      applyTypography();
      if (!state.isPdfMode) paginateAndRender();
    });
  }

  document.querySelectorAll('.theme-select-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      applyTheme(btn.dataset.theme);
    });
  });

  document.querySelectorAll('.font-family-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.fontFamily = btn.dataset.font;
      applyTypography();
      if (!state.isPdfMode) paginateAndRender();
    });
  });

  document.querySelectorAll('.width-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.maxWidthClass = btn.dataset.width;
      applyTypography();
      if (!state.isPdfMode) paginateAndRender();
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
          const savedBook = await window.sereneStorage.saveBook(newBookData);
          await openBook(savedBook);
          closeDrawer(settingsDrawer, settingsBackdrop);
        }
      } catch (err) {
        alert('Erro ao carregar livro: ' + err.message);
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
        const savedBook = await window.sereneStorage.saveBook(articleData);
        await openBook(savedBook);
        closeDrawer(settingsDrawer, settingsBackdrop);
        urlInput.value = '';
      } catch (err) {
        alert('Erro ao importar artigo: ' + err.message);
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

      alert('Marcador guardado com sucesso!');
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

  // --- Busca ---
  const doSearch = () => {
    if (!state.currentBook) return;
    const term = searchInput.value.trim().toLowerCase();
    if (!term) return;
    
    let foundPage = -1;
    if (state.isPdfMode) {
       alert("Busca global não suportada no modo PDF.");
       return;
    } else {
       for (let i = 0; i < state.pages.length; i++) {
         const div = document.createElement('div');
         div.innerHTML = state.pages[i];
         const text = div.textContent.toLowerCase();
         if (text.includes(term)) {
           foundPage = i;
           break;
         }
       }
    }
    
    if (foundPage !== -1) {
       state.currentPage = foundPage;
       window.sereneStorage.updateProgress(state.currentBook.id, state.currentPage, state.currentChapter);
       renderCurrentPage();
       if (window.innerWidth < 640 && searchContainer) {
         searchContainer.classList.add('hidden');
       }
    } else {
       alert("Termo não encontrado no livro.");
    }
  };

  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch();
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
      } catch (e) {
        alert(e.message);
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
        alert(`Backup restaurado com sucesso! ${count} livro(s) recuperados.`);
        renderLibrary(); // Refresh library
      } catch (err) {
        alert(err.message);
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
          subDimmerOpacity: 0,
          amberOpacity: 0,
          bionicEnabled: false,
          lineFocusEnabled: false,
          rulerEnabled: false
        });
        window.location.reload();
      }
    });
  }

  // --- Inicialização ---
  await loadPreferences();
  applyTypography();
  await loadInitialBook();
});
