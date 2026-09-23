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
  assert.match(worker, /serene-reader-v21/);
  assert.doesNotMatch(worker, /c\s*\|\|\s*caches\.match\('\.\/index\.html'\)/);
});

test('o pacote Android protege os dados locais e bloqueia HTTP aberto', async () => {
  const manifest = await read('android/app/src/main/AndroidManifest.xml');
  const gradle = await read('android/app/build.gradle');
  assert.match(manifest, /android:allowBackup="false"/);
  assert.match(manifest, /android:usesCleartextTraffic="false"/);
  assert.match(gradle, /versionName "2\.0\.0"/);
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
