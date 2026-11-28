// Monta cada página: src/pages/*.html dentro de src/layout.html  ->  ./<página>.html
// Uso: node build.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const layout = readFileSync('src/layout.html', 'utf8');
const navs = ['inicio', 'servicios', 'proceso', 'estudio', 'contacto'];
for (const file of readdirSync('src/pages').filter(f => f.endsWith('.html'))) {
  const raw = readFileSync(`src/pages/${file}`, 'utf8');
  const m = raw.match(/^<!--\s*(\{[\s\S]*?\})\s*-->\s*/);
  const meta = m ? JSON.parse(m[1]) : {};
  const content = m ? raw.slice(m[0].length) : raw;
  const url = 'https://www.focowebstudio.com/' + (file === 'index.html' ? '' : file);
  let html = layout
    .replaceAll('{{url}}', url)
    .replaceAll('{{title}}', meta.title || 'Foco Web Studio')
    .replaceAll('{{description}}', meta.description || '')
    .replaceAll('{{wipe}}', meta.wipe || 'Foco')
    .replaceAll('{{bodyClass}}', meta.bodyClass || '')
    .replace('{{content}}', content.trim());
  for (const n of navs) html = html.replace(`{{nav_${n}}}`, meta.nav === n ? 'aria-current="page"' : '');
  writeFileSync(file, html);
  console.log('built', file);
}
