/**
 * SereneStorage - Módulo de armazenamento persistente no IndexedDB
 * Permite salvar livros (EPUB, PDF, TXT), progresso de leitura, preferências e marcadores
 * diretamente no dispositivo do usuário sem dependência de servidor.
 */

const DB_NAME = 'SereneDB';
const DB_VERSION = 3;

class SereneStorage {
  constructor() {
    this.db = null;
    this.initPromise = this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Tabela de Livros
        if (!db.objectStoreNames.contains('books')) {
          const booksStore = db.createObjectStore('books', { keyPath: 'id' });
          booksStore.createIndex('title', 'title', { unique: false });
          booksStore.createIndex('lastReadAt', 'lastReadAt', { unique: false });
        }

        // Arquivos binários ficam separados dos metadados. Assim, virar uma
        // página não clona novamente um EPUB/PDF de dezenas de megabytes.
        if (!db.objectStoreNames.contains('bookFiles')) {
          db.createObjectStore('bookFiles', { keyPath: 'id' });
        }

        // Tabela de Preferências do Usuário
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'key' });
        }

        // Tabela de Marcadores & Anotações
        if (!db.objectStoreNames.contains('bookmarks')) {
          const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'id', autoIncrement: true });
          bookmarkStore.createIndex('bookId', 'bookId', { unique: false });
        }

        // Tabela de Destaques (highlights coloridos)
        if (!db.objectStoreNames.contains('highlights')) {
          const highlightStore = db.createObjectStore('highlights', { keyPath: 'id', autoIncrement: true });
          highlightStore.createIndex('bookId', 'bookId', { unique: false });
        }

        // Migração transparente dos PDFs/EPUBs binários das versões anteriores.
        if (event.oldVersion > 0 && event.oldVersion < 3 && db.objectStoreNames.contains('books')) {
          const tx = event.target.transaction;
          const booksStore = tx.objectStore('books');
          const filesStore = tx.objectStore('bookFiles');
          booksStore.openCursor().onsuccess = (cursorEvent) => {
            const cursor = cursorEvent.target.result;
            if (!cursor) return;
            const book = cursor.value;
            if (book.content instanceof ArrayBuffer || book.content instanceof Blob) {
              filesStore.put({ id: book.id, content: book.content });
              book.content = null;
              book.hasExternalContent = true;
              cursor.update(book);
            }
            cursor.continue();
          };
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('Erro ao abrir IndexedDB:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async ready() {
    return this.initPromise;
  }

  // --- Operações de Livros ---

  async saveBook(bookData) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['books', 'bookFiles'], 'readwrite');
      const store = tx.objectStore('books');
      const filesStore = tx.objectStore('bookFiles');
      const isBinary = bookData.content instanceof ArrayBuffer || bookData.content instanceof Blob;
      const id = bookData.id || `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const bookToSave = {
        id,
        title: bookData.title || 'Livro Sem Título',
        author: bookData.author || 'Autor Desconhecido',
        format: bookData.format || 'txt',
        content: isBinary ? null : (bookData.content ?? ''),
        hasExternalContent: isBinary || Boolean(bookData.hasExternalContent),
        cover: bookData.cover || null,
        contentType: bookData.contentType || (bookData.format === 'txt' ? 'text' : 'html'),
        addedAt: bookData.addedAt || Date.now(),
        lastReadAt: bookData.lastReadAt || Date.now(),
        currentPage: bookData.currentPage || 0,
        currentChapter: bookData.currentChapter || 0,
        scrollPosition: bookData.scrollPosition || 0,
        pagePercentage: bookData.pagePercentage || 0,
        toc: bookData.toc || [],
        chapters: Array.isArray(bookData.chapters) ? bookData.chapters : [],
        epubLazy: Boolean(bookData.epubLazy),
        notes: bookData.notes || '',
        sourceSize: bookData.sourceSize || 0,
        rating: bookData.rating || 0,      // 0-5 estrelas
        status: bookData.status || 'unread', // 'unread' | 'reading' | 'finished'
        tags: Array.isArray(bookData.tags) ? bookData.tags : []
      };

      // Em edições de notas/detalhes o arquivo já existe e não precisa ser regravado.
      if (isBinary && !bookData.hasExternalContent) filesStore.put({ id, content: bookData.content });
      store.put(bookToSave);
      tx.oncomplete = () => resolve({ ...bookToSave, content: isBinary ? bookData.content : bookToSave.content });
      tx.onerror = (e) => reject(e.target.error);
      tx.onabort = (e) => reject(e.target.error || tx.error);
    });
  }

  async getBook(id) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['books', 'bookFiles'], 'readonly');
      const store = tx.objectStore('books');
      const request = store.get(id);
      request.onsuccess = () => {
        const book = request.result || null;
        if (!book || !book.hasExternalContent) {
          resolve(book);
          return;
        }
        const fileRequest = tx.objectStore('bookFiles').get(id);
        fileRequest.onsuccess = () => resolve({ ...book, content: fileRequest.result?.content || null });
        fileRequest.onerror = (e) => reject(e.target.error);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getAllBooks(includeContent = false) {
    await this.ready();
    const books = await new Promise((resolve, reject) => {
      const tx = this.db.transaction('books', 'readonly');
      const store = tx.objectStore('books');
      const request = store.getAll();
      request.onsuccess = () => {
        const books = request.result || [];
        // Ordenar pelos lidos mais recentemente
        books.sort((a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0));
        resolve(books);
      };
      request.onerror = (e) => reject(e.target.error);
    });
    if (!includeContent) return books;
    return Promise.all(books.map(book => this.getBook(book.id)));
  }

  async updateProgress(bookId, currentPage, currentChapter = 0, scrollPosition = 0, pagePercentage = 0) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('books', 'readwrite');
      const store = tx.objectStore('books');
      const getRequest = store.get(bookId);
      getRequest.onsuccess = () => {
        const book = getRequest.result;
        if (!book) {
          resolve(null);
          return;
        }
        book.currentPage = currentPage;
        book.currentChapter = currentChapter;
        book.scrollPosition = scrollPosition;
        book.pagePercentage = pagePercentage;
        book.lastReadAt = Date.now();
        const putRequest = store.put(book);
        putRequest.onsuccess = () => resolve(book);
        putRequest.onerror = (e) => reject(e.target.error);
      };
      getRequest.onerror = (e) => reject(e.target.error);
    });
  }

  async deleteBook(id) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['books', 'bookFiles', 'bookmarks', 'highlights'], 'readwrite');
      const bookStore = tx.objectStore('books');
      const bookmarkStore = tx.objectStore('bookmarks');
      const highlightStore = tx.objectStore('highlights');

      bookStore.delete(id);
      tx.objectStore('bookFiles').delete(id);

      // Deletar marcadores associados
      const bmIndex = bookmarkStore.index('bookId');
      const bmRequest = bmIndex.openCursor(IDBKeyRange.only(id));
      bmRequest.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Deletar destaques associados
      const hlIndex = highlightStore.index('bookId');
      const hlRequest = hlIndex.openCursor(IDBKeyRange.only(id));
      hlRequest.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  // --- Operações de Preferências ---

  async savePreference(key, value) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('preferences', 'readwrite');
      const store = tx.objectStore('preferences');
      const request = store.put({ key, value });
      request.onsuccess = () => resolve(value);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getPreference(key, defaultValue = null) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('preferences', 'readonly');
      const store = tx.objectStore('preferences');
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.value);
        } else {
          resolve(defaultValue);
        }
      };
      request.onerror = () => resolve(defaultValue);
    });
  }

  // --- Operações de Marcadores ---

  async addBookmark(bookmark) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('bookmarks', 'readwrite');
      const store = tx.objectStore('bookmarks');
      const data = {
        bookId: bookmark.bookId,
        pageIndex: bookmark.pageIndex,
        chapterIndex: bookmark.chapterIndex || 0,
        snippet: bookmark.snippet || '',
        note: bookmark.note || '',
        createdAt: Date.now()
      };
      const request = store.add(data);
      request.onsuccess = () => resolve({ ...data, id: request.result });
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getBookmarks(bookId) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('bookmarks', 'readonly');
      const store = tx.objectStore('bookmarks');
      const index = store.index('bookId');
      const request = index.getAll(IDBKeyRange.only(bookId));
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async removeBookmark(id) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('bookmarks', 'readwrite');
      const store = tx.objectStore('bookmarks');
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  // --- Operações de Destaques ---

  async addHighlight(highlight) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('highlights', 'readwrite');
      const store = tx.objectStore('highlights');
      const data = {
        bookId: highlight.bookId,
        chapterIndex: highlight.chapterIndex || 0,
        pageIndex: highlight.pageIndex || 0,
        text: highlight.text || '',
        color: highlight.color || 'yellow',
        createdAt: Date.now()
      };
      const request = store.add(data);
      request.onsuccess = () => resolve({ ...data, id: request.result });
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getHighlights(bookId) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('highlights', 'readonly');
      const store = tx.objectStore('highlights');
      const index = store.index('bookId');
      const request = index.getAll(IDBKeyRange.only(bookId));
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async removeHighlight(id) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('highlights', 'readwrite');
      const store = tx.objectStore('highlights');
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }
}

// Instância global exportada/disponibilizada
window.sereneStorage = new SereneStorage();
