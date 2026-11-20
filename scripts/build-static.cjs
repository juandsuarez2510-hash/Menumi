const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const publicFiles = [
  'admin.html',
  'admin.js',
  'contacto.html',
  'index.html',
  'menu.html',
  'nosotros.html',
  '_headers',
  'pages-redirect.js',
  'script.js',
  'styles.css',
];
const publicImageExtensions = new Set(['.png', '.jpeg', '.jpg', '.webp', '.svg', '.ico']);

async function build() {
  await fs.rm(output, { recursive: true, force: true });
  await fs.mkdir(output, { recursive: true });

  for (const file of publicFiles) {
    await fs.copyFile(path.join(root, file), path.join(output, file));
  }

  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !publicImageExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    await fs.copyFile(path.join(root, entry.name), path.join(output, entry.name));
  }
}

build().catch((error) => {
  console.error('No se pudo preparar el sitio para Netlify:', error.message);
  process.exitCode = 1;
});
