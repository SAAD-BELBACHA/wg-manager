// Injects PWA metadata into the exported SPA index.html.
// Expo's "single" web output ignores app/+html.tsx, so we patch the built
// file directly after `expo export`. Idempotent.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve('dist/index.html');
let html = readFileSync(file, 'utf8');

const TAGS = `
    <meta name="description" content="Aufgaben, Ausgaben, Einkaufslisten und mehr – alles für deine WG an einem Ort." />
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#665CFF" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Zofri" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="icon" href="/favicon.png" type="image/png" />`;

if (html.includes('rel="manifest"')) {
  console.log('[inject-pwa] already present, skipping');
} else {
  html = html.replace('<html lang="en">', '<html lang="de">');
  html = html.replace('</title>', '</title>' + TAGS);
  writeFileSync(file, html);
  console.log('[inject-pwa] PWA meta injected into dist/index.html');
}
