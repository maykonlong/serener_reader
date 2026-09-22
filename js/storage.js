/**
 * SereneStorage - Módulo de armazenamento persistente no IndexedDB
 * Permite salvar livros (EPUB, PDF, TXT), progresso de leitura, preferências e marcadores
 * diretamente no dispositivo do usuário sem dependência de servidor.
 */

const DB_NAME = 'SereneDB';
const DB_VERSION = 1;

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

        // Tabela de Preferências do Usuário
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'key' });
        }

        // Tabela de Marcadores & Anotações
        if (!db.objectStoreNames.contains('bookmarks')) {
          const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'id', autoIncrement: true });
          bookmarkStore.createIndex('bookId', 'bookId', { unique: false });
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
      const tx = this.db.transaction('books', 'readwrite');
      const store = tx.objectStore('books');
      
      const bookToSave = {
        id: bookData.id || `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: bookData.title || 'Livro Sem Título',
        author: bookData.author || 'Autor Desconhecido',
        format: bookData.format || 'txt',
        content: bookData.content, // String (txt) ou ArrayBuffer/Blob (epub/pdf)
        cover: bookData.cover || null,
        addedAt: bookData.addedAt || Date.now(),
        lastReadAt: Date.now(),
        currentPage: bookData.currentPage || 0,
        currentChapter: bookData.currentChapter || 0,
        toc: bookData.toc || []
      };

      const request = store.put(bookToSave);
      request.onsuccess = () => resolve(bookToSave);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getBook(id) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('books', 'readonly');
      const store = tx.objectStore('books');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getAllBooks() {
    await this.ready();
    return new Promise((resolve, reject) => {
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
  }

  async updateProgress(bookId, currentPage, currentChapter = 0, scrollPosition = 0) {
    await this.ready();
    const book = await this.getBook(bookId);
    if (!book) return;

    book.currentPage = currentPage;
    book.currentChapter = currentChapter;
    book.scrollPosition = scrollPosition;
    book.lastReadAt = Date.now();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('books', 'readwrite');
      const store = tx.objectStore('books');
      const request = store.put(book);
      request.onsuccess = () => resolve(book);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async deleteBook(id) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['books', 'bookmarks'], 'readwrite');
      const bookStore = tx.objectStore('books');
      const bookmarkStore = tx.objectStore('bookmarks');

      bookStore.delete(id);

      // Deletar marcadores associados
      const index = bookmarkStore.index('bookId');
      const request = index.openCursor(IDBKeyRange.only(id));
      request.onsuccess = (e) => {
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
}

// Instância global exportada/disponibilizada
window.sereneStorage = new SereneStorage();
