/**
 * SereneSyncEngine - Gerencia Backup e Restauração de dados da biblioteca
 * Exporta a IndexedDB para JSON com suporte a ArrayBuffers em base64.
 */

class SereneSyncEngine {
  constructor() {}

  async exportBackup() {
    try {
      const books = await window.sereneStorage.getAllBooks(true);
      
      const backupData = {
        version: 1,
        appName: 'SereneReader',
        timestamp: new Date().toISOString(),
        books: books.map(b => {
          // ArrayBuffers (PDF/EPUB originais) precisam ser convertidos para Base64 para caber no JSON
          let contentStr = b.content;
          if (b.content instanceof ArrayBuffer) {
             contentStr = 'b64:' + this._arrayBufferToBase64(b.content);
          }
          
          let coverStr = b.cover;
          if (b.cover instanceof ArrayBuffer) {
             coverStr = 'b64:' + this._arrayBufferToBase64(b.cover);
          }
          
          return { ...b, content: contentStr, cover: coverStr };
        })
      };

      // Gerar arquivo de download
      const jsonStr = JSON.stringify(backupData);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `serenereader_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      
      return true;
    } catch (err) {
      console.error(err);
      throw new Error("Erro ao gerar backup: " + err.message);
    }
  }

  async importBackup(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (!data.books || !Array.isArray(data.books)) {
            throw new Error("Formato de arquivo inválido. Não é um backup do SereneReader.");
          }

          // Restaurar cada livro
          for (const book of data.books) {
            // Reconverter Base64 para ArrayBuffer se necessário
            if (typeof book.content === 'string' && book.content.startsWith('b64:')) {
              book.content = this._base64ToArrayBuffer(book.content.substring(4));
            }
            if (typeof book.cover === 'string' && book.cover.startsWith('b64:')) {
              book.cover = this._base64ToArrayBuffer(book.cover.substring(4));
            }
            // O arquivo precisa ser criado novamente neste banco restaurado.
            book.hasExternalContent = false;
            
            await window.sereneStorage.saveBook(book); // Atualiza ou insere
          }
          resolve(data.books.length);
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = () => reject(new Error("Erro ao ler o arquivo de backup."));
      reader.readAsText(file);
    });
  }

  // --- Funções Auxiliares de Conversão ---
  
  _arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  _base64ToArrayBuffer(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

window.sereneSyncEngine = new SereneSyncEngine();
