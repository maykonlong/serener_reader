import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'www');
const fromRoot = (...segments) => path.join(root, ...segments);
const toOutput = (...segments) => path.join(output, ...segments);

async function copy(source, destination) {
  const absoluteSource = fromRoot(source);
  if (!existsSync(absoluteSource)) throw new Error(`Arquivo de build ausente: ${source}`);
  await mkdir(path.dirname(toOutput(destination)), { recursive: true });
  await cp(absoluteSource, toOutput(destination), { recursive: true });
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const entry of ['index.html', 'manifest.json', 'sw.js', 'js', 'icons', 'covers']) {
  await copy(entry, entry);
}
await mkdir(toOutput('css'), { recursive: true });
await copy('css/styles.css', 'css/styles.css');
await copy('css/fonts.css', 'css/fonts.css');

const tailwindCli = fromRoot('node_modules', '@tailwindcss', 'cli', 'dist', 'index.mjs');
const tailwind = spawnSync(process.execPath, [
  tailwindCli,
  '-i', fromRoot('css', 'tailwind.input.css'),
  '-o', toOutput('css', 'tailwind.css'),
  '--minify',
], { cwd: root, stdio: 'inherit' });
if (tailwind.status !== 0) throw new Error('Falha ao compilar o CSS do Tailwind.');

const vendorFiles = [
  ['node_modules/jszip/dist/jszip.min.js', 'vendor/jszip.min.js'],
  ['node_modules/pdfjs-dist/build/pdf.min.mjs', 'vendor/pdf.min.mjs'],
  ['node_modules/pdfjs-dist/build/pdf.worker.min.mjs', 'vendor/pdf.worker.min.mjs'],
  ['node_modules/@mozilla/readability/Readability.js', 'vendor/readability.js'],
  ['node_modules/marked/marked.min.js', 'vendor/marked.min.js'],
  ['node_modules/mammoth/mammoth.browser.min.js', 'vendor/mammoth.browser.min.js'],
  ['node_modules/dompurify/dist/purify.min.js', 'vendor/purify.min.js'],
  ['node_modules/tesseract.js/dist/tesseract.min.js', 'vendor/tesseract/tesseract.min.js'],
  ['node_modules/tesseract.js/dist/worker.min.js', 'vendor/tesseract/worker.min.js'],
];
for (const [source, destination] of vendorFiles) await copy(source, destination);

await copy('node_modules/tesseract.js-core', 'vendor/tesseract/core');
await copy('node_modules/@tesseract.js-data/por/4.0.0/por.traineddata.gz', 'vendor/tesseract/lang/por.traineddata.gz');
await copy('node_modules/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz', 'vendor/tesseract/lang/eng.traineddata.gz');

const fonts = {
  inter: '@fontsource/inter',
  literata: '@fontsource/literata',
  lora: '@fontsource/lora',
  merriweather: '@fontsource/merriweather',
  atkinson: '@fontsource/atkinson-hyperlegible',
  lexend: '@fontsource/lexend',
  vollkorn: '@fontsource/vollkorn',
  opendyslexic: '@fontsource/opendyslexic',
};
for (const [target, packageName] of Object.entries(fonts)) {
  await copy(path.join('node_modules', packageName), path.join('vendor', 'fonts', target));
}

const html = await readFile(toOutput('index.html'), 'utf8');
if (/https?:\/\/(?:cdn|cdnjs|fonts\.googleapis|cdn\.jsdelivr|unpkg)/i.test(html)) {
  throw new Error('O index de produção ainda contém dependências de CDN.');
}

const files = [];
async function collect(directory) {
  for (const name of await readdir(directory)) {
    const fullPath = path.join(directory, name);
    const info = await stat(fullPath);
    if (info.isDirectory()) await collect(fullPath);
    else files.push(path.relative(output, fullPath).replaceAll('\\', '/'));
  }
}
await collect(output);
await writeFile(toOutput('asset-manifest.json'), JSON.stringify({
  assets: files.map((file) => `./${file}`),
}, null, 2));
await writeFile(toOutput('build-info.json'), JSON.stringify({
  version: JSON.parse(await readFile(fromRoot('package.json'), 'utf8')).version,
  builtAt: new Date().toISOString(),
  assets: files.length,
}, null, 2));

console.log(`Build offline concluído: ${files.length} arquivos em www/`);
