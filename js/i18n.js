/**
 * SereneI18n - Internacionalização da interface (pt / en / es)
 * Traduz elementos marcados com data-i18n, data-i18n-placeholder e data-i18n-title.
 */

class SereneI18n {
  constructor() {
    this.lang = 'pt';
    this.dictionaries = {
      pt: {
        'library': 'Biblioteca', 'chapters': 'Capítulos', 'settings': 'Ajustes',
        'fullscreen': 'Ecrã Inteiro', 'immersive': 'Leitura Imersiva', 'search_placeholder': 'Buscar...',
        'previous': 'Anterior', 'next': 'Seguinte',
        'tts_title': 'Sintetizador de Voz (TTS)', 'listen_page': 'Ouvir Página (TTS)', 'pause_audio': 'Pausar Áudio', 'resume_audio': 'Continuar', 'stop_audio': 'Parar',
        'speed': 'Velocidade', 'pitch': 'Tom (Pitch)', 'sleep_timer': 'Sleep Timer',
        'palette': 'Paleta de Cor Ocular', 'illumination': 'Iluminação Circadiana', 'typography': 'Tipografia & Layout',
        'font_family': 'Família de Fonte', 'font_size': 'Tamanho da Fonte', 'margin_width': 'Largura da Margem',
        'line_spacing': 'Espaçamento entre Linhas', 'paragraph_spacing': 'Espaço entre Parágrafos',
        'text_align': 'Alinhamento do Texto', 'reading_mode': 'Modo de Leitura', 'page_transition': 'Transição de Página',
        'bookmarks': 'Marcadores Salvos', 'advanced_modes': 'Modos de Leitura Avançados',
        'book_notes': 'Notas do Livro', 'sync_backup': 'Sincronização & Backup',
        'export': 'Exportar', 'import': 'Importar', 'restore_defaults': 'Restaurar Padrões', 'daily_goal': 'Meta Diária de Leitura',
        'library_title': 'Biblioteca Local', 'add_books': 'Adicionar Livros Locais', 'url_placeholder': 'Colar link de artigo...',
        'read_web': 'Ler Web', 'filter_library': 'Filtrar biblioteca...', 'all_tags': 'Todas as etiquetas',
        'catalog': 'Catálogo Domínio Público', 'catalog_search': 'Buscar no Project Gutenberg...', 'catalog_search_btn': 'Buscar',
        'to_read': 'A ler', 'finished': 'Concluído', 'unread': 'Não lido'
      },
      en: {
        'library': 'Library', 'chapters': 'Chapters', 'settings': 'Settings',
        'fullscreen': 'Fullscreen', 'immersive': 'Immersive Reading', 'search_placeholder': 'Search...',
        'previous': 'Previous', 'next': 'Next',
        'tts_title': 'Text-to-Speech (TTS)', 'listen_page': 'Listen to Page (TTS)', 'pause_audio': 'Pause Audio', 'resume_audio': 'Continue', 'stop_audio': 'Stop',
        'speed': 'Speed', 'pitch': 'Pitch', 'sleep_timer': 'Sleep Timer',
        'palette': 'Eye Color Palette', 'illumination': 'Circadian Lighting', 'typography': 'Typography & Layout',
        'font_family': 'Font Family', 'font_size': 'Font Size', 'margin_width': 'Margin Width',
        'line_spacing': 'Line Spacing', 'paragraph_spacing': 'Paragraph Spacing',
        'text_align': 'Text Alignment', 'reading_mode': 'Reading Mode', 'page_transition': 'Page Transition',
        'bookmarks': 'Saved Bookmarks', 'advanced_modes': 'Advanced Reading Modes',
        'book_notes': 'Book Notes', 'sync_backup': 'Sync & Backup',
        'export': 'Export', 'import': 'Import', 'restore_defaults': 'Restore Defaults', 'daily_goal': 'Daily Reading Goal',
        'library_title': 'Local Library', 'add_books': 'Add Local Books', 'url_placeholder': 'Paste article link...',
        'read_web': 'Read Web', 'filter_library': 'Filter library...', 'all_tags': 'All tags',
        'catalog': 'Public Domain Catalog', 'catalog_search': 'Search Project Gutenberg...', 'catalog_search_btn': 'Search',
        'to_read': 'Reading', 'finished': 'Finished', 'unread': 'Unread'
      },
      es: {
        'library': 'Biblioteca', 'chapters': 'Capítulos', 'settings': 'Ajustes',
        'fullscreen': 'Pantalla completa', 'immersive': 'Lectura inmersiva', 'search_placeholder': 'Buscar...',
        'previous': 'Anterior', 'next': 'Siguiente',
        'tts_title': 'Sintetizador de Voz (TTS)', 'listen_page': 'Escuchar página (TTS)', 'pause_audio': 'Pausar audio', 'resume_audio': 'Continuar', 'stop_audio': 'Detener',
        'speed': 'Velocidad', 'pitch': 'Tono', 'sleep_timer': 'Temporizador',
        'palette': 'Paleta de Color Ocular', 'illumination': 'Iluminación Circadiana', 'typography': 'Tipografía y Diseño',
        'font_family': 'Familia de fuente', 'font_size': 'Tamaño de fuente', 'margin_width': 'Ancho del margen',
        'line_spacing': 'Interlineado', 'paragraph_spacing': 'Espaciado de párrafos',
        'text_align': 'Alineación del texto', 'reading_mode': 'Modo de lectura', 'page_transition': 'Transición de página',
        'bookmarks': 'Marcadores guardados', 'advanced_modes': 'Modos de lectura avanzados',
        'book_notes': 'Notas del libro', 'sync_backup': 'Sincronización y copia',
        'export': 'Exportar', 'import': 'Importar', 'restore_defaults': 'Restaurar valores', 'daily_goal': 'Meta diaria de lectura',
        'library_title': 'Biblioteca local', 'add_books': 'Añadir libros locales', 'url_placeholder': 'Pegar enlace de artículo...',
        'read_web': 'Leer web', 'filter_library': 'Filtrar biblioteca...', 'all_tags': 'Todas las etiquetas',
        'catalog': 'Catálogo de Dominio Público', 'catalog_search': 'Buscar en Project Gutenberg...', 'catalog_search_btn': 'Buscar',
        'to_read': 'Leyendo', 'finished': 'Terminado', 'unread': 'No leído'
      }
    };
  }

  t(key) {
    return (this.dictionaries[this.lang] && this.dictionaries[this.lang][key]) || key;
  }

  setLang(lang) {
    this.lang = (this.dictionaries[lang]) ? lang : 'pt';
    this.apply();
  }

  apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = this.t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.setAttribute('placeholder', this.t(el.getAttribute('data-i18n-placeholder')));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.setAttribute('title', this.t(el.getAttribute('data-i18n-title')));
    });
  }
}

window.sereneI18n = new SereneI18n();
