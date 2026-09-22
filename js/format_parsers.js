/**
 * SereneFormatParsers - Conversores para múltiplos formatos de arquivo
 * Permite suporte a .md, .docx, .cbz e .fb2 totalmente client-side.
 */

class SereneFormatParsers {
  
  async parseMarkdown(text) {
    // Usa marked.js para converter para HTML e DOMPurify para limpar
    const rawHtml = marked.parse(text);
    const cleanHtml = DOMPurify.sanitize(rawHtml);
    return {
      title: 'Documento Markdown',
      author: 'Arquivo Local',
      content: cleanHtml,
      format: 'md'
    };
  }

  async parseDOCX(buffer) {
    // Usa mammoth.js para ler DOCX e extrair o HTML
    try {
      const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
      const cleanHtml = DOMPurify.sanitize(result.value);
      return {
        title: 'Documento Word (DOCX)',
        author: 'Arquivo Local',
        content: cleanHtml,
        format: 'docx'
      };
    } catch (err) {
      throw new Error("Erro ao parsear arquivo DOCX: " + err.message);
    }
  }

  async parseFB2(text) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "application/xml");
    
    const titleNode = doc.querySelector("book-title");
    const authorFirst = doc.querySelector("author first-name");
    const authorLast = doc.querySelector("author last-name");
    
    const title = titleNode ? titleNode.textContent : 'Livro FB2';
    const author = `${authorFirst ? authorFirst.textContent + ' ' : ''}${authorLast ? authorLast.textContent : ''}`.trim() || 'Desconhecido';
    
    const bodies = doc.querySelectorAll("body");
    if (!bodies || bodies.length === 0) {
      throw new Error("Corpo do livro (body) não encontrado no arquivo FB2.");
    }
    const mainBody = bodies[0];
    
    let xmlString = new XMLSerializer().serializeToString(mainBody);
    
    // Substituir tags FB2 comuns por tags HTML para o paginator renderizar melhor
    xmlString = xmlString.replace(/<emphasis/g, '<i').replace(/<\/emphasis>/g, '</i>');
    xmlString = xmlString.replace(/<strong/g, '<b').replace(/<\/strong>/g, '</b>');
    xmlString = xmlString.replace(/<empty-line[^>]*>/g, '<br/>');
    xmlString = xmlString.replace(/<subtitle/g, '<h3').replace(/<\/subtitle>/g, '</h3>');
    xmlString = xmlString.replace(/<title/g, '<h2').replace(/<\/title>/g, '</h2>');
    
    const cleanHtml = DOMPurify.sanitize(xmlString);
    
    return {
      title,
      author,
      content: cleanHtml,
      format: 'fb2'
    };
  }

  async parseCBZ(buffer) {
    if (typeof JSZip === 'undefined') {
      throw new Error("JSZip não carregado");
    }
    
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(buffer);
    
    // Filtrar apenas arquivos de imagem
    const files = Object.keys(loadedZip.files)
      .filter(name => name.match(/\.(jpg|jpeg|png|webp|gif)$/i))
      .sort(); // Garantir ordem alfabética que geralmente respeita a ordem das páginas
      
    if (files.length === 0) {
      throw new Error("Nenhuma imagem encontrada no arquivo CBZ.");
    }
    
    let htmlContent = '';
    for (const fileName of files) {
      const fileData = await loadedZip.files[fileName].async('base64');
      const ext = fileName.split('.').pop().toLowerCase();
      // Criamos cada imagem envolta num <p> centralizado para que a paginação funcione adequadamente
      htmlContent += `<p style="text-align: center; margin: 0;"><img src="data:image/${ext};base64,${fileData}" style="max-width: 100%; max-height: 90vh; object-fit: contain; margin: 0 auto;"></p>`;
    }
    
    return {
      title: 'Quadrinho / Mangá (CBZ)',
      author: 'Arquivo Local',
      content: htmlContent,
      format: 'cbz'
    };
  }
}

window.sereneFormatParsers = new SereneFormatParsers();
