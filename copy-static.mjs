import { copyFileSync, existsSync } from 'fs';
import { join } from 'path';

const files = [
  'landing.html',
  'help.html', 
  'licenses.html',
  'cerez-politikasi.html',
  'gizlilik.html',
  'sartlar.html',
];

for (const file of files) {
  const src = join('public', file);
  const dest = join('dist', file);
  if (existsSync(src)) {
    copyFileSync(src, dest);
    console.log(`✓ Copied ${file}`);
  } else {
    console.warn(`⚠ Not found: ${src}`);
  }
}
