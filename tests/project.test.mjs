import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

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
  assert.match(worker, /serene-reader-v27/);
  assert.match(worker, /isMutableAsset/);
  assert.doesNotMatch(worker, /c\s*\|\|\s*caches\.match\('\.\/index\.html'\)/);
});

test('o pacote Android protege os dados locais e bloqueia HTTP aberto', async () => {
  const manifest = await read('android/app/src/main/AndroidManifest.xml');
  const gradle = await read('android/app/build.gradle');
  assert.match(manifest, /android:allowBackup="false"/);
  assert.match(manifest, /android:usesCleartextTraffic="false"/);
  assert.match(gradle, /versionName "2\.1\.1"/);
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
  assert.match(html, /data-type="off">Sem som/);
  assert.match(app, /sereneTTS\.stop\(\)/);
  assert.match(app, /sereneAmbient\.stop\(\)/);
  assert.match(tts, /playbackId/);
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
  assert.match(html, /pagination\.js\?v=2\.1\.1/);
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
