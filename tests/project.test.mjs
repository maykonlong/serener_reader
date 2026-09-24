import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

test('a interface principal não depende de CDN', async () => {
  const html = await read('index.html');
  assert.doesNotMatch(html, /https?:\/\/(?:cdn|cdnjs|cdn\.jsdelivr|unpkg|fonts\.googleapis)/i);
  assert.match(html, /vendor\/jszip\.min\.js/);
  assert.match(html, /vendor\/pdf\.min\.mjs/);
  assert.match(html, /css\/fonts\.css/);
});

test('os modos de leitura semelhantes ao Kindle estão disponíveis', async () => {
  const html = await read('index.html');
  const app = await read('js/app.js');
  for (const preset of ['comfort', 'kindle', 'eink', 'bedtime']) {
    assert.match(html, new RegExp(`data-preset="${preset}"`));
    assert.match(app, new RegExp(`${preset}:`));
  }
  for (const theme of ['white', 'paper', 'eink', 'sepia', 'night', 'oled']) {
    assert.match(html, new RegExp(`data-theme="${theme}"`));
  }
});

test('o service worker usa manifesto de assets locais', async () => {
  const worker = await read('sw.js');
  assert.match(worker, /asset-manifest\.json/);
  assert.match(worker, /serene-reader-v30/);
  assert.match(worker, /isMutableAsset/);
  assert.doesNotMatch(worker, /c\s*\|\|\s*caches\.match\('\.\/index\.html'\)/);
});

test('o pacote Android protege os dados locais e bloqueia HTTP aberto', async () => {
  const manifest = await read('android/app/src/main/AndroidManifest.xml');
  const gradle = await read('android/app/build.gradle');
  assert.match(manifest, /android:allowBackup="false"/);
  assert.match(manifest, /android:usesCleartextTraffic="false"/);
  assert.match(gradle, /versionName "2\.2\.2"/);
});

test('o PDF.js usa worker local e uma versão sem a falha conhecida antiga', async () => {
  const reader = await read('js/pdf_reader.js');
  const pkg = JSON.parse(await read('package.json'));
  assert.equal(pkg.dependencies['pdfjs-dist'], '6.3.289');
  assert.match(reader, /\.\/vendor\/pdf\.worker\.min\.mjs/);
  assert.doesNotMatch(reader, /cdnjs\.cloudflare\.com/);
});

test('o GitHub Pages publica o build completo e oferece o APK', async () => {
  const html = await read('index.html');
  const workflow = await read('.github/workflows/deploy-pages.yml');

  assert.match(html, /downloads\/serene-reader-android\.apk/);
  assert.match(workflow, /npm run check/);
  assert.match(workflow, /assembleDebug/);
  assert.match(workflow, /upload-pages-artifact@v5/);
  assert.match(workflow, /deploy-pages@v5/);
});

test('o botão de APK aparece no site e fica oculto no aplicativo nativo', async () => {
  const html = await read('index.html');
  const styles = await read('css/styles.css');
  const app = await read('js/app.js');

  assert.match(html, /android-download-link/);
  assert.match(styles, /html\.native-app \.android-download-link/);
  assert.match(app, /Capacitor\?\.isNativePlatform/);
  assert.match(app, /classList\.toggle\('native-app'/);
});

test('o áudio oferece pausa, parada e ambiente sem som', async () => {
  const html = await read('index.html');
  const app = await read('js/app.js');
  const tts = await read('js/tts_engine.js');

  assert.match(html, /id="tts-stop-btn"/);
  assert.match(html, /data-type="off"[^>]*>Sem som/);
  assert.match(app, /sereneTTS\.stop\(\)/);
  assert.match(app, /sereneAmbient\.stop\(\)/);
  assert.match(app, /Todo o áudio foi interrompido/);
  assert.match(html, /id="ambient-volume-slider"/);
  assert.match(tts, /playbackId/);
  assert.match(tts, /_buildChunks/);
  assert.match(tts, /getBestVoice/);
});

test('o motor de voz cancela a fila e divide textos longos no Android', async () => {
  const source = await read('js/tts_engine.js');
  const spoken = [];
  let cancelCount = 0;
  const voices = [
    { name: 'Voz comum', lang: 'pt-PT', default: true, localService: true },
    { name: 'Google Português Natural', lang: 'pt-BR', default: false, localService: true }
  ];
  const synth = {
    getVoices: () => voices,
    addEventListener: () => {},
    speak: utterance => spoken.push(utterance),
    cancel: () => { cancelCount += 1; },
    pause: () => {},
    resume: () => {}
  };
  class Utterance {
    constructor(text) { this.text = text; }
  }
  const context = {
    window: { speechSynthesis: synth, MediaMetadata: class {} },
    navigator: {},
    SpeechSynthesisUtterance: Utterance,
    MediaMetadata: class {},
    setTimeout: callback => { callback(); return 1; },
    clearTimeout: () => {},
    console
  };
  vm.runInNewContext(source, context);
  const engine = context.window.sereneTTS;
  assert.equal(engine.voice.name, 'Google Português Natural');
  engine.speak('Uma frase longa. '.repeat(100));
  assert.ok(engine.chunks.length > 1);
  assert.equal(spoken.length, 1);
  engine.stop();
  assert.ok(cancelCount >= 2);
  assert.equal(engine.isPlaying, false);
});

test('a configuração inicial tem aparência editorial de livro', async () => {
  const app = await read('js/app.js');
  const styles = await read('css/styles.css');

  assert.match(app, /comfort: \{ theme: 'paper'.*maxWidthClass: 'max-w-xl'.*textAlign: 'justify'.*indent: 28/);
  assert.match(app, /pageTransition: 'fade'/);
  assert.match(app, /settingsVersion < 3/);
  assert.match(styles, /\.reading-surface[\s\S]*var\(--reader-page-bg/);
  assert.match(styles, /text-indent: var\(--reader-indent/);
});

test('a biblioteca prioriza capas e mantém ferramentas recolhidas', async () => {
  const html = await read('index.html');
  const app = await read('js/app.js');
  const catalog = await read('js/catalog.js');

  assert.match(html, /id="library-books-grid" class="grid grid-cols-2 sm:grid-cols-3/);
  assert.match(html, /<details class="library-tools-panel/);
  assert.match(html, /id="library-book-count"/);
  assert.match(app, /catalog-cover/);
  assert.match(app, /cover: parsed\.cover \|\| dl\.cover/);
  assert.match(catalog, /getCoverUrl\(book\)/);
  assert.match(catalog, /_downloadCover\(url\)/);
});

test('a experiência móvel mantém navegação visível e organiza os ajustes', async () => {
  const html = await read('index.html');
  const styles = await read('css/styles.css');
  const app = await read('js/app.js');
  const pagination = await read('js/pagination.js');

  assert.match(html, /id="mobile-reader-tools"/);
  assert.match(html, /id="continue-reading-card"/);
  for (const panel of ['reading', 'audio', 'tools', 'app']) {
    assert.match(html, new RegExp(`data-settings-tab="${panel}"`));
  }
  assert.match(styles, /height: 100dvh/);
  assert.match(styles, /main \{[\s\S]*min-height: 0/);
  assert.match(styles, /orientation: landscape/);
  assert.match(app, /library_home_seen_v1/);
  assert.match(app, /setSettingsPanel/);
  assert.match(app, /movedLines/);
  assert.match(pagination, /isVerse/);
  assert.match(html, /pagination\.js\?v=2\.2\.2/);
});

test('o PWA e o Android usam a nova identidade de livro aberto', async () => {
  const manifest = await read('manifest.json');
  const icon = await read('icons/icon.svg');
  const androidIcon = await read('android/app/src/main/res/drawable/serene_launcher_foreground.xml');

  assert.match(manifest, /icon-maskable-512\.png/);
  assert.match(icon, /#31483A/);
  assert.match(icon, /#D5963B/);
  assert.match(androidIcon, /#FFFDF7/);
  assert.match(androidIcon, /#D5963B/);
});

test('EPUBs grandes usam capítulos sob demanda e paginação cooperativa', async () => {
  const app = await read('js/app.js');
  const parser = await read('js/epub_parser.js');
  const paginator = await read('js/pagination.js');
  const storage = await read('js/storage.js');

  assert.match(app, /content: buffer,[\s\S]*epubLazy: true/);
  assert.match(app, /loadChapter\(state\.currentBook\.content, chapter\)/);
  assert.match(app, /PAGE_CACHE_LIMIT = 6/);
  assert.match(parser, /chapterCache: new Map\(\)/);
  assert.match(parser, /splitLegacyText/);
  assert.doesNotMatch(parser, /fullTextAccumulator/);
  assert.match(paginator, /paginateHtmlAsync/);
  assert.match(paginator, /scheduler\.yield/);
  assert.match(storage, /const DB_VERSION = 3/);
  assert.match(storage, /bookFiles/);
  assert.match(storage, /chapters: Array\.isArray\(bookData\.chapters\)/);
});

test('o índice permite mapear, buscar e pular diretamente para capítulos', async () => {
  const html = await read('index.html');
  const app = await read('js/app.js');

  assert.match(html, /id="toc-current-label"/);
  assert.match(html, /id="toc-jump-input"/);
  assert.match(html, /id="toc-search-input"/);
  assert.match(html, /id="toc-prev-chapter"/);
  assert.match(html, /id="toc-next-chapter"/);
  assert.match(app, /window\.jumpToChapter/);
  assert.match(app, /normalize\('NFD'\)/);
  assert.match(app, /Cap\. \$\{state\.currentChapter \+ 1\}/);
});
